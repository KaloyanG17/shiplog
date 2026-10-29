-- CreateEnum
CREATE TYPE "PrChecks" AS ENUM ('PENDING', 'SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "PrReview" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "prChecks" "PrChecks",
ADD COLUMN     "prReview" "PrReview";
