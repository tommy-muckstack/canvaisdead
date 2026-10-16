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
  }
}
/** Load the actual pure client modules into a browser fixture. No production test endpoint,
 * credential bypass or persistence replacement; IndexedDB and transactions remain native.
 */
export async function uploadModules(page: Page) {
  const root = process.cwd(), modules: Record<string, { code: string; imports: Record<string, string> }> = {};
  async function compile(file: string): Promise<string> {
    const absolute = path.resolve(root, file), id = path.relative(root, absolute);
    if (id.startsWith("..")) throw Error("Test module must stay inside the repository");
    if (modules[id]) return id;
    const source = await readFile(absolute, "utf8"), code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const imports: Record<string, string> = {}; modules[id] = { code, imports };
    for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const specifier = match[1];
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) throw Error(`Unexpected browser fixture dependency: ${specifier}`);
      const dependency = specifier.startsWith("@/") ? path.resolve(root, specifier.slice(2)) : path.resolve(path.dirname(absolute), specifier);
      imports[specifier] = await compile(dependency + ".ts");
    }
    return id;
  }
  const repository = await compile("lib/uploads/repository.ts"), handoff = await compile("lib/uploads/guest-handoff.ts");
  await page.evaluate(({ modules, repository, handoff }) => {
    const cache: Record<string, { exports: unknown }> = {};
    const load = (id: string): unknown => {
      if (cache[id]) return cache[id].exports;
      const module = { exports: {} }; cache[id] = module;
      const entry = modules[id];
      new Function("module", "exports", "require", entry.code)(module, module.exports, (specifier: string) => load(entry.imports[specifier]));
      return module.exports;
    };
    window.uploadHandoffTest = { repository: load(repository), handoff: load(handoff) } as Window["uploadHandoffTest"];
  }, { modules, repository, handoff });
}
