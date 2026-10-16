import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import type { Page } from "./fixtures";

declare global {
  interface Window {
    uploadHandoffTest: {
      repository: typeof import("@/lib/uploads/repository");
      handoff: typeof import("@/lib/uploads/guest-handoff");
    };
    designHandoffTest: {
      repository: typeof import("@/lib/design/repository");
      handoff: typeof import("@/lib/design/guest-handoff");
      backup: typeof import("@/lib/design/backup-file");
      recovery: typeof import("@/lib/design/recovery");
    };
  }
}
/** Load the actual pure client modules into a browser fixture. No production test endpoint,
 * credential bypass or persistence replacement; IndexedDB and transactions remain native.
 */
export const uploadModules = (page: Page) => localModules(page, "uploads");
export const designModules = (page: Page) => localModules(page, "design");
export async function designRecordDecoderSource() {
  const source = await readFile(path.resolve(process.cwd(), "lib/design/record-file.ts"), "utf8");
  return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
}
async function localModules(page: Page, kind: "uploads" | "design") {
  const root = process.cwd(), modules: Record<string, { code: string; imports: Record<string, string> }> = {};
  async function compile(file: string): Promise<string> {
    const absolute = path.resolve(root, file), id = path.relative(root, absolute);
    if (id.startsWith("..")) throw Error("Test module must stay inside the repository");
    if (modules[id]) return id;
    const raw = await readFile(absolute, "utf8");
    // Match Next's public build-time constant for this local fixture, without exposing env.
    const source = id === "lib/basepath.ts" ? raw.replace("process.env.NEXT_PUBLIC_BASE_PATH", '"/canvaisdead"') : raw;
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const imports: Record<string, string> = {}; modules[id] = { code, imports };
    for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const specifier = match[1];
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) throw Error(`Unexpected browser fixture dependency: ${specifier}`);
      const dependency = specifier.startsWith("@/") ? path.resolve(root, specifier.slice(2)) : path.resolve(path.dirname(absolute), specifier);
      imports[specifier] = await compile(dependency + ".ts");
    }
    return id;
  }
  const repository = await compile(`lib/${kind}/repository.ts`), handoff = await compile(`lib/${kind}/guest-handoff.ts`);
  const extra: Record<string, string> = kind === "design" ? { backup: await compile("lib/design/backup-file.ts"), recovery: await compile("lib/design/recovery.ts") } : {};
  await page.evaluate(({ modules, repository, handoff, kind, extra }) => {
    const cache: Record<string, { exports: unknown }> = {};
    const load = (id: string): unknown => {
      if (cache[id]) return cache[id].exports;
      const module = { exports: {} }; cache[id] = module;
      const entry = modules[id];
      new Function("module", "exports", "require", entry.code)(module, module.exports, (specifier: string) => load(entry.imports[specifier]));
      return module.exports;
    };
    const result = { repository: load(repository), handoff: load(handoff), ...Object.fromEntries(Object.entries(extra).map(([key, id]) => [key, load(id)])) };
    if (kind === "uploads") window.uploadHandoffTest = result as Window["uploadHandoffTest"];
    else window.designHandoffTest = result as Window["designHandoffTest"];
  }, { modules, repository, handoff, kind, extra });
}
