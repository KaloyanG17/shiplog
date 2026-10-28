-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "githubIssueNumber" INTEGER,
ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "linkedPrNumber" INTEGER;

-- CreateIndex
CREATE INDEX "Card_repoId_githubIssueNumber_idx" ON "Card"("repoId", "githubIssueNumber");
