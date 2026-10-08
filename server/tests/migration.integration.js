import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
// Populate the old schema using SQL: the generated client already knows new fields.
export async function prepareLegacy(prisma) {
  const communityHash = await bcrypt.hash('preserved-community-password', 4);
  const legacyHash = await bcrypt.hash('preserved-admin-password', 4);
  await prisma.$executeRaw`INSERT INTO "User" ("id","username","email","passwordHash","bio","avatarUrl","status","createdAt","updatedAt")
    VALUES ('migration_member','migration_member','migration@example.test',${communityHash},'Biografía conservada','https://example.test/avatar.png','ACTIVE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`;
  await prisma.$executeRaw`INSERT INTO "Admin" ("id","name","email","passwordHash","createdAt","updatedAt") VALUES
    ('migration_linked','Propietario vinculado','migration@example.test',${legacyHash},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
    ('migration_fresh','Propietario anterior','old_owner@example.test',${legacyHash},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`;
  await prisma.$executeRaw`INSERT INTO "AccessibilitySettings" ("id","userId","fontSize","updatedAt") VALUES ('migration_preferences','migration_member','large',CURRENT_TIMESTAMP)`;
  await prisma.$executeRaw`INSERT INTO "Content" ("id","title","slug","type","genre","year","synopsis","rating","best","worst","verdict","status","createdAt","updatedAt")
    VALUES ('migration_content','Historia anterior','migration-history','BOOK','Drama',2020,'Sinopsis anterior',8,ARRAY['Claridad'],ARRAY['Breve'],'Veredicto','PUBLISHED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`;
  await prisma.$executeRaw`INSERT INTO "CommunityReview" ("id","userId","contentId","rating","body","containsSpoilers","createdAt","updatedAt")
    VALUES ('migration_review','migration_member','migration_content',5,'Opinión conservada',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`;
  await prisma.$executeRaw`INSERT INTO "ReviewReply" ("id","reviewId","userId","body","containsSpoilers","createdAt","updatedAt")
    VALUES ('migration_reply','migration_review','migration_member','Respuesta conservada',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`;
  return { communityHash, legacyHash };
}
export async function verifyLegacy(prisma, hashes) {
  const linked = await prisma.user.findUnique({
    where: { id: 'migration_member' },
    include: { accessibility: true, reviews: true, replies: true },
  });
  assert.equal(linked.role, 'SUPER_ADMIN');
  assert.equal(linked.passwordHash, hashes.communityHash);
  assert.equal(linked.bio, 'Biografía conservada');
  assert.equal(linked.avatarUrl, 'https://example.test/avatar.png');
  assert.equal(linked.accessibility.fontSize, 'large');
  assert.equal(linked.reviews[0].body, 'Opinión conservada');
  assert.equal(linked.replies[0].body, 'Respuesta conservada');
  const fresh = await prisma.user.findUnique({ where: { email: 'old_owner@example.test' } });
  assert.equal(fresh.role, 'SUPER_ADMIN');
  assert.equal(fresh.passwordHash, hashes.legacyHash);
  assert.equal(
    (await prisma.admin.findUnique({ where: { id: 'migration_linked' } })).migratedUserId,
    linked.id,
  );
  assert.equal(
    (await prisma.admin.findUnique({ where: { id: 'migration_fresh' } })).migratedUserId,
    fresh.id,
  );
  console.log(
    'Migración de datos anteriores verificada: Admin separado/vinculado, hashes, perfil, imágenes, preferencias, reseñas y respuestas.',
  );
  // Only remove isolated test fixtures, after proving preservation, to keep prior regression counts.
  await prisma.reviewReply.deleteMany({ where: { id: 'migration_reply' } });
  await prisma.communityReview.deleteMany({ where: { id: 'migration_review' } });
  await prisma.content.deleteMany({ where: { id: 'migration_content' } });
}
