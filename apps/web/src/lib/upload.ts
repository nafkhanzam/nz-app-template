import { trpc } from "./client.svelte";
import { type PrefixFile } from "$lib/shared/upload";

export interface UploadOptions {
  file: File;
  prefix: PrefixFile;
  path?: string;
  // onProgress?: (progress: number) => void;
}

export interface UploadResult {
  key: string;
  // size: number;
  // contentType: string;
}

/**
 * General upload pipeline function that handles file uploads to S3
 *
 * @param options - Upload configuration options
 * @returns The uploaded file's key, size, and content type
 * @throws Error if upload fails at any stage
 */
export async function uploadFile({
  file,
  prefix,
  path,
  // onProgress,
}: UploadOptions): Promise<UploadResult> {
  // Get presigned upload URL
  const { uploadUrl, key } = await trpc.getUploadUrl.mutate({
    filename: file.name,
    contentType: file.type,
    contentLength: file.size,
    prefix,
    path,
  });

  // Upload file to S3
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
      "Content-Length": file.size.toString(),
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
  }

  // Notify progress if callback provided
  // onProgress?.(100);

  // Confirm upload
  await trpc.confirmUpload.mutate({
    key,
    // size: file.size,
    // contentType: file.type,
  });

  return {
    key,
    // size: file.size,
    // contentType: file.type,
  };
}

/**
 * Uploads multiple files in parallel
 *
 * @param files - Array of files to upload
 * @param prefix - S3 prefix for all files
 * @returns Array of upload results
 */
export async function uploadFiles(
  files: File[],
  prefix: PrefixFile,
  path?: string,
): Promise<UploadResult[]> {
  return Promise.all(files.map((file) => uploadFile({ file, prefix, path })));
}
