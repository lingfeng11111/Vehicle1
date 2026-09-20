import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { seedMediaAssets } from "../prisma/media-assets";

const prisma = new PrismaClient();
const repoRoot = process.cwd();

function localPathFromPublicUri(uri: string) {
  if (!uri.startsWith("/")) return null;
  const publicRoot = path.resolve(repoRoot, "public");
  const resolved = path.resolve(publicRoot, `.${uri}`);
  return resolved.startsWith(`${publicRoot}${path.sep}`) ? resolved : null;
}

async function createAsset(input: {
  assetKey: string;
  filename: string;
  originalName?: string | null;
  mediaType: string;
  bytes: Uint8Array;
  source: string;
}) {
  const existing = await prisma.mediaAsset.findUnique({ where: { assetKey: input.assetKey }, select: { id: true } });
  if (existing) return existing.id;

  const asset = await prisma.mediaAsset.create({
    data: {
      assetKey: input.assetKey,
      filename: input.filename,
      originalName: input.originalName ?? null,
      mediaType: input.mediaType,
      byteSize: input.bytes.byteLength,
      data: Buffer.from(input.bytes),
      source: input.source,
    },
  });
  return asset.id;
}

async function importLocalFile(assetKey: string, filePath: string, mediaType: string, source: string) {
  const existing = await prisma.mediaAsset.findUnique({ where: { assetKey }, select: { id: true } });
  if (existing) return existing.id;
  if (!existsSync(filePath)) throw new Error(`媒体文件不存在：${filePath}`);
  const bytes = new Uint8Array(await readFile(filePath));
  return createAsset({
    assetKey,
    filename: path.basename(filePath),
    originalName: path.basename(filePath),
    mediaType,
    bytes,
    source,
  });
}

async function importLegacyUri(assetKey: string, uri: string, mediaType: string) {
  if (/^https?:\/\//i.test(uri)) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`下载媒体失败：${uri} (${response.status})`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const responseType = response.headers.get("content-type")?.split(";", 1)[0]?.trim();
    return createAsset({
      assetKey,
      filename: `${assetKey}.bin`,
      mediaType: responseType || mediaType,
      bytes,
      source: "MIGRATED_EXTERNAL",
    });
  }

  const filePath = localPathFromPublicUri(uri);
  if (!filePath || !existsSync(filePath)) throw new Error(`找不到图片文件：${uri}`);
  return importLocalFile(assetKey, filePath, mediaType, "MIGRATED_UPLOAD");
}

async function migrateVehicleCoverImages() {
  const vehicles = await prisma.vehicle.findMany({ select: { id: true, code: true, coverImage: true } });
  for (const vehicle of vehicles) {
    const uri = vehicle.coverImage?.trim();
    if (!uri || uri.startsWith("/api/media/")) continue;
    const assetId = await importLegacyUri(`legacy-vehicle-${vehicle.id}`, uri, "image/jpeg");
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { coverImage: `/api/media/${assetId}` } });
  }
}

async function migrateEvidenceImages() {
  const evidence = await prisma.inspectionEvidence.findMany({ select: { id: true, uri: true, mediaType: true } });
  for (const item of evidence) {
    if (item.uri.startsWith("/api/media/") || item.uri.startsWith("seed://")) continue;
    const assetId = await importLegacyUri(`legacy-evidence-${item.id}`, item.uri, item.mediaType);
    await prisma.inspectionEvidence.update({ where: { id: item.id }, data: { uri: `/api/media/${assetId}` } });
  }
}

async function main() {
  await seedMediaAssets(prisma);

  const advisorPath = path.resolve(repoRoot, "public", "images", "advisor-avatar.jpg");
  await importLocalFile("advisor-avatar", advisorPath, "image/jpeg", "MIGRATED_UPLOAD");

  const vehiclePhotoPath = path.resolve(repoRoot, "public", "uploads", "vehicles", "42d2b1c0-d0fd-4cf5-ae16-4129a700f4ba.jpg");
  const vehiclePhotoId = await importLocalFile("vehicle-001-cover", vehiclePhotoPath, "image/jpeg", "USER_UPLOAD");
  await prisma.vehicle.updateMany({
    where: { code: "001", model: "2013款1.6自动Premium" },
    data: { coverImage: `/api/media/${vehiclePhotoId}` },
  });

  for (const code of ["V001", "V002", "V003", "V004", "V005", "V006"]) {
    await prisma.vehicle.updateMany({
      where: { code },
      data: { coverImage: `/api/media/vehicle-${code.toLowerCase()}-cover` },
    });
  }

  await migrateVehicleCoverImages();
  await migrateEvidenceImages();

  const count = await prisma.mediaAsset.count();
  console.log(`Media migration complete: ${count} database assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
