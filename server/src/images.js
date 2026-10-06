import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { HttpError } from './errors.js';
const formats = { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'] };
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 100000 },
  fileFilter(req, file, callback) {
    const extension = file.originalname.split('.').pop().toLowerCase();
    if (!formats[file.mimetype]?.includes(extension))
      return callback(new HttpError(400, 'Elegí una imagen JPG, JPEG, PNG o WebP.'));
    callback(null, true);
  },
}).single('image');
export async function prepareImage(file) {
  try {
    const image = sharp(file.buffer, { limitInputPixels: 25000000, animated: false });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw Error('Formato inválido');
    return await image
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new HttpError(400, 'El archivo no contiene una imagen válida o es demasiado grande.');
  }
}
export function createImageService(config, sdk = cloudinary) {
  sdk.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return {
    async upload(file) {
      if (
        !config.CLOUDINARY_CLOUD_NAME ||
        !config.CLOUDINARY_API_KEY ||
        !config.CLOUDINARY_API_SECRET
      )
        throw new HttpError(503, 'La carga de imágenes aún no está configurada.');
      const buffer = await prepareImage(file);
      return new Promise((resolve, reject) => {
        const stream = sdk.uploader.upload_stream(
          {
            public_id: `entre-lineas/${randomUUID()}`,
            resource_type: 'image',
            allowed_formats: ['webp'],
            timeout: 30000,
          },
          (error, result) =>
            error
              ? reject(
                  new HttpError(502, 'Cloudinary no pudo recibir la imagen. Intentá nuevamente.'),
                )
              : resolve({ imageUrl: result.secure_url, imagePublicId: result.public_id }),
        );
        stream.end(buffer);
      });
    },
    async destroy(publicId) {
      const result = await sdk.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });
      if (!['ok', 'not found'].includes(result.result))
        throw Error('Cloudinary no confirmó la eliminación');
    },
  };
}
export async function enqueueDeletion(db, publicId) {
  if (publicId)
    await db.imageDeletion.upsert({ where: { publicId }, create: { publicId }, update: {} });
}
export async function drainDeletions(prisma, images) {
  const tasks = await prisma.imageDeletion.findMany({ take: 20, orderBy: { createdAt: 'asc' } });
  for (const task of tasks) {
    try {
      await images.destroy(task.publicId);
      await prisma.imageDeletion.deleteMany({ where: { id: task.id } });
    } catch {
      await prisma.imageDeletion.updateMany({
        where: { id: task.id },
        data: { attempts: { increment: 1 } },
      });
    }
  }
}
