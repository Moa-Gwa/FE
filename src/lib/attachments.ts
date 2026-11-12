/** A download URL comes from an external site, so allow only absolute HTTP(S) links. */
export function attachmentUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function fileExtension(fileName: string): string {
  return /\.([a-z0-9]{1,8})$/i.exec(fileName.trim())?.[1].toUpperCase() ?? "FILE";
}
