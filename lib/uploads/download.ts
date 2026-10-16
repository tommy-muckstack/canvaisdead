/** A local Blob download only. File content never enters a network request. */
export function downloadLocalFile(file: Blob, name: string) {
  const url = URL.createObjectURL(file), link = document.createElement("a");
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
