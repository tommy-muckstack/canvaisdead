import type { Design } from "./types";

/** Download directly to the device; no upload, API call or hosted storage. */
export function downloadDesignBackup(designs: Design[]) {
  const blob = new Blob([JSON.stringify({ format: "canvaisdead", version: 1, designs }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "canvaisdead-designs.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
