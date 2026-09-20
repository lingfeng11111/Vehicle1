import type { PrismaClient } from "@prisma/client";

export type MediaAssetSeed = {
  assetKey: string;
  filename: string;
  mediaType: string;
  sourceUrl: string;
};

/**
 * The app serves the imported copies from SQLite. These URLs are only used
 * while bootstrapping an empty database and are never sent to the browser.
 */
export const MEDIA_ASSET_SEEDS: MediaAssetSeed[] = [
  {
    assetKey: "vehicle-v001-cover",
    filename: "vehicle-v001-cover.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=85",
  },
  {
    assetKey: "vehicle-v002-cover",
    filename: "vehicle-v002-cover.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=85",
  },
  {
    assetKey: "vehicle-v003-cover",
    filename: "vehicle-v003-cover.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=85",
  },
  {
    assetKey: "vehicle-v004-cover",
    filename: "vehicle-v004-cover.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=85",
  },
  {
    assetKey: "vehicle-v005-cover",
    filename: "vehicle-v005-cover.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=85",
  },
  {
    assetKey: "vehicle-v006-cover",
    filename: "vehicle-v006-cover.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85",
  },
  {
    assetKey: "shared-engine-bay",
    filename: "shared-engine-bay.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=85",
  },
  {
    assetKey: "shared-undercarriage",
    filename: "shared-undercarriage.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1000&q=85",
  },
  {
    assetKey: "shared-cockpit",
    filename: "shared-cockpit.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=85",
  },
  {
    assetKey: "shared-gallery-sport",
    filename: "shared-gallery-sport.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=85",
  },
  {
    assetKey: "shared-ev-battery",
    filename: "shared-ev-battery.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1000&q=85",
  },
  {
    assetKey: "showroom-banner",
    filename: "showroom-banner.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1600&q=85",
  },
  {
    assetKey: "inspector-portrait",
    filename: "inspector-portrait.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=85",
  },
  {
    assetKey: "advisor-avatar",
    filename: "advisor-avatar.jpg",
    mediaType: "image/jpeg",
    sourceUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=85",
  },
];

export async function seedMediaAssets(prisma: Pick<PrismaClient, "mediaAsset">) {
  for (const assetSeed of MEDIA_ASSET_SEEDS) {
    const existing = await prisma.mediaAsset.findUnique({
      where: { assetKey: assetSeed.assetKey },
      select: { id: true },
    });
    if (existing) continue;

    const response = await fetch(assetSeed.sourceUrl);
    if (!response.ok) {
      throw new Error(`Unable to download media asset ${assetSeed.assetKey}: ${response.status} ${response.statusText}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    await prisma.mediaAsset.create({
      data: {
        assetKey: assetSeed.assetKey,
        filename: assetSeed.filename,
        mediaType: assetSeed.mediaType,
        byteSize: bytes.byteLength,
        data: Buffer.from(bytes),
        source: "BUNDLED",
      },
    });
  }
}
