-- AlterTable
ALTER TABLE "PokemonInstance" ADD COLUMN     "availableMoves" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "hpCurrent" INTEGER NOT NULL DEFAULT 0;
