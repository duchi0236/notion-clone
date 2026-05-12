import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;
const DEFAULT_UPLOAD_DIR = "public/uploads";

function safeFilename(name: string) {
  const ext = path.extname(name).slice(0, 16);
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9-_\u4e00-\u9fa5]/g, "-").slice(0, 80) || "file";
  return `${Date.now()}-${base}${ext}`;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large", maxSizeBytes: MAX_SIZE_BYTES }, { status: 413 });
  }

  const uploadDir = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
  const filename = safeFilename(file.name || "upload.bin");
  const targetDir = path.join(process.cwd(), uploadDir);
  const targetPath = path.join(targetDir, filename);

  await mkdir(targetDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, bytes);

  const publicUrl = uploadDir.startsWith("public/")
    ? `/${uploadDir.replace(/^public\//, "")}/${filename}`
    : `/uploads/${filename}`;

  return NextResponse.json({
    file: {
      name: file.name,
      filename,
      size: file.size,
      type: file.type,
      url: publicUrl,
    },
  }, { status: 201 });
}
