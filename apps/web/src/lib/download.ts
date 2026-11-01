export interface ZipEntry {
  url: string;
  path: string;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Fetches a set of files and downloads them as a single zip archive.
 *
 * @param entries - Files to include, each with a source URL and its path within the zip
 * @param zipFilename - Filename for the downloaded zip
 * @throws Error if any file fails to fetch
 */
export async function downloadFilesAsZip(entries: ZipEntry[], zipFilename: string): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  await Promise.all(
    entries.map(async ({ url, path }) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${path}`);
      zip.file(path, await res.blob());
    }),
  );
  triggerBlobDownload(await zip.generateAsync({ type: "blob" }), zipFilename);
}
