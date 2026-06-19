-- DropIndex
DROP INDEX IF EXISTS "UserGame_gameId_status_key";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AlterTable: add userId as nullable first, backfill, then make NOT NULL
ALTER TABLE "UserGame" ADD COLUMN "userId" TEXT;

-- Insert a default user for existing records
INSERT INTO "User" ("id", "email", "password", "createdAt", "updatedAt")
VALUES ('default-user', 'user@gamevault.app', '$2a$10$placeholder', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE "UserGame" SET "userId" = 'default-user' WHERE "userId" IS NULL;

ALTER TABLE "UserGame" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserGame_userId_gameId_key" ON "UserGame"("userId", "gameId");

-- AddForeignKey
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
