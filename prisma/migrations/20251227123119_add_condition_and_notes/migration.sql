-- CreateEnum
CREATE TYPE "ConditionStatus" AS ENUM ('NONE', 'BRN', 'PAR', 'PSN', 'TOX', 'SLP', 'FRZ', 'FNT');

-- AlterTable
ALTER TABLE "PokemonInstance" ADD COLUMN     "condition" "ConditionStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "notes" TEXT NOT NULL DEFAULT '';
