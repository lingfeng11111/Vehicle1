import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ assetKey: string }> }) {
  const { assetKey } = await params;
  const asset = await db.mediaAsset.findFirst({
    where: { OR: [{ id: assetKey }, { assetKey }] },
    select: { data: true, mediaType: true, byteSize: true },
  });

  if (!asset) return new Response("图片不存在", { status: 404 });

  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mediaType,
      "Content-Length": asset.byteSize.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
