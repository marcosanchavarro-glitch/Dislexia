import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//),
  JWT_SECRET: z.string().min(32),
  CLIENT_URL: z.string().url(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});
export function getConfig(env = process.env) {
  const result = schema.safeParse(env);
  if (!result.success)
    throw new Error(
      `Configuración inválida: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}. Revisá server/.env.example.`,
    );
  const config = result.data;
  if (config.NODE_ENV === 'production') {
    if (!config.CLIENT_URL.startsWith('https://'))
      throw new Error('CLIENT_URL requiere HTTPS en producción.');
    if (config.JWT_SECRET.includes('REEMPLAZAR')) throw new Error('Generá un JWT_SECRET real.');
    if (
      !config.CLOUDINARY_CLOUD_NAME ||
      !config.CLOUDINARY_API_KEY ||
      !config.CLOUDINARY_API_SECRET
    )
      throw new Error('Configurá Cloudinary en producción.');
  }
  return config;
}
