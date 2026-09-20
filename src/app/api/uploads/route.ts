import { z } from "zod";
import { type ImageUploadKind } from "@/lib/image-upload";
import { ImageUploadValidationError, persistUploadedImage } from "@/services/upload-storage";

export const runtime = "nodejs";

const uploadKindSchema = z.enum(["vehicle-cover", "inspection-evidence"]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const kind = uploadKindSchema.safeParse(formData.get("kind"));

  if (!(file instanceof File)) {
    return Response.json({ error: "请选择图片文件" }, { status: 400 });
  }
  if (!kind.success) {
    return Response.json({ error: "图片用途不合法" }, { status: 400 });
  }

  try {
    const saved = await persistUploadedImage(file, kind.data as ImageUploadKind);
    return Response.json(saved, { status: 201 });
  } catch (error) {
    if (error instanceof ImageUploadValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "图片保存失败，请稍后重试" }, { status: 500 });
  }
}
