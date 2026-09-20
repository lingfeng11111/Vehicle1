export const IMAGE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

export const IMAGE_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export type ImageUploadKind = "vehicle-cover" | "inspection-evidence";

export function formatImageFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadImageFile(file: File, kind: ImageUploadKind) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("kind", kind);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });
  const body = (await response.json().catch(() => null)) as { error?: string; uri?: string; mediaType?: string } | null;
  if (!response.ok || !body?.uri) {
    throw new Error(body?.error ?? "图片上传失败，请重试");
  }
  return { uri: body.uri, mediaType: body.mediaType ?? file.type };
}
