-- AlterTable
ALTER TABLE "ChangelogItem" ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "url" TEXT;

-- CreateTable
CREATE TABLE "RoadmapVote" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "voterHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapVote_cardId_voterHash_key" ON "RoadmapVote"("cardId", "voterHash");

-- CreateIndex
CREATE UNIQUE INDEX "ChangelogItem_sourceId_key" ON "ChangelogItem"("sourceId");

-- AddForeignKey
ALTER TABLE "RoadmapVote" ADD CONSTRAINT "RoadmapVote_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
