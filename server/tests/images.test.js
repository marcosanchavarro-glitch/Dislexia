import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { Writable } from 'node:stream';
import { createImageService, prepareImage } from '../src/images.js';
test('Verifica formato real y transforma a WebP', async () => {
  const buffer = await sharp({
    create: { width: 20, height: 20, channels: 3, background: '#245648' },
  })
    .png()
    .toBuffer();
  const converted = await prepareImage({ buffer });
  assert.equal((await sharp(converted).metadata()).format, 'webp');
  await assert.rejects(() => prepareImage({ buffer: Buffer.from('esto no es una imagen') }), {
    status: 400,
  });
});
test('Contrato SDK de Cloudinary: subida firmada por backend y destrucción', async () => {
  let options, deleted, configured;
  const sdk = {
    config: (value) => {
      configured = value;
    },
    uploader: {
      upload_stream: (opts, callback) => {
        options = opts;
        return new Writable({
          write(chunk, enc, done) {
            done();
          },
          final(done) {
            callback(null, {
              secure_url: 'https://res.cloudinary.com/test/image.webp',
              public_id: opts.public_id,
            });
            done();
          },
        });
      },
      destroy: async (id, opts) => {
        deleted = { id, opts };
        return { result: 'ok' };
      },
    },
  };
  const service = createImageService(
    { CLOUDINARY_CLOUD_NAME: 'test', CLOUDINARY_API_KEY: 'key', CLOUDINARY_API_SECRET: 'secret' },
    sdk,
  );
  const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } })
    .png()
    .toBuffer();
  const result = await service.upload({ buffer });
  assert.ok(result.imageUrl.startsWith('https://'));
  assert.ok(options.public_id.startsWith('entre-lineas/'));
  assert.equal(configured.secure, true);
  await service.destroy(result.imagePublicId);
  assert.equal(deleted.opts.invalidate, true);
});
