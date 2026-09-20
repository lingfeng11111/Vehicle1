import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_MIME_TYPES,
  type ImageUploadKind,
} from "@/lib/image-upload";

const EXTENSIONS: Record<(typeof IMAGE_UPLOAD_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export class ImageUploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadValidationError";
  }
}

function isAllowedMimeType(value: string): value is (typeof IMAGE_UPLOAD_MIME_TYPES)[number] {
  return (IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(value);
}

function hasExpectedSignature(mimeType: string, bytes: Uint8Array) {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (mimeType === "image/gif") return new TextDecoder().decode(bytes.slice(0, 6)) === "GIF87a" || new TextDecoder().decode(bytes.slice(0, 6)) === "GIF89a";
  if (mimeType === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (mimeType === "image/heic" || mimeType === "image/heif") return new TextDecoder().decode(bytes.slice(4, 12)) === "ftypheic" || new TextDecoder().decode(bytes.slice(4, 12)) === "ftypmif1";
  return false;
}

export async function persistUploadedImage(file: File, kind: ImageUploadKind) {
  const mimeType = file.type.trim().toLowerCase();
  if (!isAllowedMimeType(mimeType)) {
    throw new ImageUploadValidationError("仅支持 JPG、PNG、WEBP、GIF 或 HEIC 图片");
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new ImageUploadValidationError("图片文件为空，请重新选择");
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new ImageUploadValidationError("图片不能超过 8 MB");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasExpectedSignature(mimeType, bytes)) {
    throw new ImageUploadValidationError("图片文件内容与 MIME 类型不一致");
  }

  const filename = `${randomUUID()}.${EXTENSIONS[mimeType]}`;
  const asset = await db.mediaAsset.create({
    data: {
      filename,
      originalName: file.name?.trim() || null,
      mediaType: mimeType,
      byteSize: bytes.byteLength,
      data: Buffer.from(bytes),
      source: kind,
    },
  });

  return {
    uri: `/api/media/${asset.id}`,
    mediaType: mimeType,
  };
}
