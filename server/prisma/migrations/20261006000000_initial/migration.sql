-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('BOOK', 'MOVIE', 'GAME', 'SERIES');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "genre" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "synopsis" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "best" TEXT[],
    "worst" TEXT[],
    "verdict" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "author" TEXT,
    "pages" INTEGER,
    "director" TEXT,
    "duration" INTEGER,
    "developer" TEXT,
    "platform" TEXT,
    "creator" TEXT,
    "seasons" INTEGER,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageDeletion" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageDeletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Content_slug_key" ON "Content"("slug");

-- CreateIndex
CREATE INDEX "Content_status_type_idx" ON "Content"("status", "type");

-- CreateIndex
CREATE INDEX "Content_genre_idx" ON "Content"("genre");

-- CreateIndex
CREATE UNIQUE INDEX "ImageDeletion_publicId_key" ON "ImageDeletion"("publicId");
