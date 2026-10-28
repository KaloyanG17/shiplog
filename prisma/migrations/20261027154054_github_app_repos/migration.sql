/*
  Warnings:

  - Added the required column `accountId` to the `Installation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Installation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `htmlUrl` to the `Repo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Repo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Card" ALTER COLUMN "githubIssueId" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Installation" ADD COLUMN     "accountId" BIGINT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "githubInstallId" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Repo" ADD COLUMN     "htmlUrl" TEXT NOT NULL,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "githubRepoId" SET DATA TYPE BIGINT;
