import type { SaveState } from "@/lib/local-store";

export function SaveNotice({ save, onBackup }: { save: SaveState; onBackup?: () => void }) {
  if (!save.error) return null;
  return <div className="cv-save-notice" role="alert">
    <p>{save.error}</p>
    {onBackup && <button type="button" onClick={onBackup}>Download backup</button>}
    {save.status !== "conflict" && <button type="button" onClick={save.retry}>{save.status === "load-error" ? "Retry reading designs" : "Retry saving"}</button>}
  </div>;
}
