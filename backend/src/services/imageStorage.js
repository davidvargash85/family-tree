import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..");
const uploadsDir = path.join(backendRoot, "uploads", "trees");

const MAX_DISPLAY_PX = 1600;
const THUMB_PX = 400;
const JPEG_QUALITY = 84;

/**
 * Process an image buffer (resize, compress) and write to the filesystem.
 * Used for member profile images and tree/publication photos.
 *
 * @param {Buffer} buffer - Raw image bytes from upload
 * @param {{ treeId: string, id: string, type: 'photo' | 'member' }} options
 * @returns {{ filePath: string }} Relative path (e.g. /uploads/trees/.../photo.jpg)
 */
export async function processAndSave(buffer, options) {
  const { treeId, id, type } = options;
  if (!treeId || !id || !type) throw new Error("treeId, id, and type are required");

  const dir =
    type === "member"
      ? path.join(uploadsDir, treeId, "members", id)
      : path.join(uploadsDir, treeId, "photos", id);
  const mainFilename = "photo.jpg";
  const thumbFilename = "photo_thumb.jpg";
  fs.mkdirSync(dir, { recursive: true });

  const mainPath = path.join(dir, mainFilename);
  const thumbPath = path.join(dir, thumbFilename);

  const pipeline = sharp(buffer)
    .rotate() // respect EXIF orientation
    .resize(MAX_DISPLAY_PX, MAX_DISPLAY_PX, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY });

  await pipeline.toFile(mainPath);

  await sharp(buffer)
    .rotate()
    .resize(THUMB_PX, THUMB_PX, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(thumbPath);

  const relativeMain = path.relative(backendRoot, mainPath).replace(/\\/g, "/");
  const filePath = "/" + relativeMain;
  return { filePath };
}

/**
 * Delete the file at the given relative path and its thumbnail (photo_thumb.jpg in same dir).
 * Used by all routes when removing a photo or member avatar.
 *
 * @param {string} filePath - Relative path (e.g. /uploads/trees/.../photo.jpg)
 */
export function deletePhotoFiles(filePath) {
  if (!filePath || typeof filePath !== "string") return;
  const fullPath = path.join(backendRoot, filePath.replace(/^\//, ""));
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (_) {}
  const dir = path.dirname(fullPath);
  const base = path.basename(fullPath, path.extname(fullPath));
  const thumbPath = path.join(dir, `${base}_thumb${path.extname(fullPath)}`);
  try {
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  } catch (_) {}
  try {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch (_) {}
}
