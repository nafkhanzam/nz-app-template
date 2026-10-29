-- AlterTable
ALTER TABLE "User" ADD COLUMN "image" TEXT;

-- CreateTable
CREATE TABLE "UserOidc" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "userInfo" JSONB NOT NULL,

    CONSTRAINT "UserOidc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserOidc_issuer_sub_key" ON "UserOidc"("issuer", "sub");

-- AddForeignKey
ALTER TABLE "UserOidc" ADD CONSTRAINT "UserOidc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Move existing single-identity data
INSERT INTO "UserOidc" ("id", "updatedAt", "userId", "issuer", "sub", "userInfo")
SELECT gen_random_uuid()::text, now(), "id", "oidc_issuer", "oidc_sub", COALESCE("oidc_userInfo", '{}'::jsonb)
FROM "User"
WHERE "oidc_sub" IS NOT NULL AND "oidc_issuer" IS NOT NULL;

UPDATE "User" SET "image" = "oidc_userInfo"->>'picture' WHERE "oidc_userInfo" IS NOT NULL;

-- DropIndex
DROP INDEX "User_oidc_sub_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "oidc_issuer", DROP COLUMN "oidc_sub", DROP COLUMN "oidc_userInfo";
