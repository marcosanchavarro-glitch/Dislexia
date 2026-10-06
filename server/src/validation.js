import { z } from 'zod';
import { HttpError } from './errors.js';
export const typeValues = ['BOOK', 'MOVIE', 'GAME', 'SERIES'];
const clean = (value) =>
  value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
const text = (max) =>
  z
    .string()
    .transform(clean)
    .pipe(z.string().min(1, 'Este campo es obligatorio.').max(max, `Máximo ${max} caracteres.`));
const optionalText = (max) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), text(max).nullable());
const numeric = z.union([z.number(), z.string().trim().min(1)]).pipe(z.coerce.number());
const optionalNumber = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  numeric.pipe(z.number().int().min(1).max(100000)).nullable(),
);
export const contentSchema = z
  .object({
    title: text(180),
    type: z.enum(typeValues),
    genre: text(80),
    year: numeric.pipe(z.number().int().min(1).max(2100)),
    synopsis: text(4000),
    rating: numeric.pipe(z.number().min(0).max(10)),
    best: z.array(text(400)).min(1).max(20),
    worst: z.array(text(400)).min(1).max(20),
    verdict: text(4000),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
    author: optionalText(200),
    pages: optionalNumber,
    director: optionalText(200),
    duration: optionalNumber,
    developer: optionalText(200),
    platform: optionalText(300),
    creator: optionalText(250),
    seasons: optionalNumber,
    recommended: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const required = {
      BOOK: ['author', 'pages'],
      MOVIE: ['director', 'duration'],
      GAME: ['developer', 'platform'],
      SERIES: ['creator', 'seasons'],
    }[data.type];
    for (const key of required)
      if (!data[key])
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'Completá la ficha de esta categoría.',
        });
  });
export function parseContent(body) {
  let input = body;
  if (body.data) {
    try {
      input = JSON.parse(body.data);
    } catch {
      throw new HttpError(400, 'El formulario enviado no es válido.');
    }
  }
  const result = contentSchema.parse(input);
  const fields = [
    'author',
    'pages',
    'director',
    'duration',
    'developer',
    'platform',
    'creator',
    'seasons',
  ];
  const relevant = {
    BOOK: ['author', 'pages'],
    MOVIE: ['director', 'duration'],
    GAME: ['developer', 'platform'],
    SERIES: ['creator', 'seasons'],
  }[result.type];
  for (const field of fields) if (!relevant.includes(field)) result[field] = null;
  return result;
}
export function parseVersion(body) {
  const input = body.data ? JSON.parse(body.data) : body;
  return z.coerce.number().int().min(1).parse(input.version);
}
export const statusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED']),
  version: z.coerce.number().int().min(1),
});
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(72),
});
