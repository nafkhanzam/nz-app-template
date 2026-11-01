-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "respondedById" TEXT,
ADD COLUMN     "response" TEXT;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
