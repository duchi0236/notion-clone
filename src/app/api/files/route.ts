import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;
const DEFAULT_UPLOAD_DIR = "public/uploads";

function getUploadDir() {
  return process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
}

function safeFilename(name: string) {
  const ext = path.extname(name).slice(0, 16);
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9-_\u4e00-\u9fa5]/g, "-").slice(0, 80) || "file";
  return `${Date.now()}-${base}${ext}`;
}

function publicUrlFor(uploadDir: string, filename: string) {
  return uploadDir.startsWith("public/")
    ? `/${uploadDir.replace(/^public\//, "")}/${filename}`
    : `/uploads/${filename}`;
}

function resolveUploadPath(filename?: string) {
  const uploadDir = getUploadDir();
  const targetDir = path.join(process.cwd(), uploadDir);
  if (!filename) return { uploadDir, targetDir };

  const basename = path.basename(filename);
  if (basename !== filename) throw new Error("Invalid filename");

  return {
    uploadDir,
    targetDir,
    targetPath: path.join(targetDir, basename),
    filename: basename,
  };
}

export async function GET() {
  const { uploadDir, targetDir } = resolveUploadPath();
  await mkdir(targetDir, { recursive: true });

  const entries = await readdir(targetDir).catch(() => []);
  const files = await Promise.all(
    entries.map(async (filename) => {
      const filePath = path.join(targetDir, filename);
      const info = await stat(filePath).catch(() => null);
      if (!info?.isFile()) return null;
      return {
        filename,
        size: info.size,
        updatedAt: info.mtime.toISOString(),
        url: publicUrlFor(uploadDir, filename),
      };
    })
  );

  return NextResponse.json({ files: files.filter(Boolean) });
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

  const uploadDir = getUploadDir();
  const filename = safeFilename(file.name || "upload.bin");
  const targetDir = path.join(process.cwd(), uploadDir);
  const targetPath = path.join(targetDir, filename);

  await mkdir(targetDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, bytes);

  return NextResponse.json({
    file: {
      name: file.name,
      filename,
      size: file.size,
      type: file.type,
      url: publicUrlFor(uploadDir, filename),
    },
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const filename = new URL(req.url).searchParams.get("filename") || "";

  try {
    const { targetPath } = resolveUploadPath(filename);
    if (!targetPath) throw new Error("Missing filename");
    await unlink(targetPath);
    return NextResponse.json({ ok: true, filename: path.basename(filename) });
  } catch (error) {
    return NextResponse.json({ error: "File not found or invalid filename", details: String(error) }, { status: 404 });
  }
}
