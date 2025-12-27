/*
  Warnings:

  - You are about to drop the column `notes` on the `PokemonInstance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PokemonInstance" DROP COLUMN "notes",
ADD COLUMN     "typeMatchups" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "types" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "level" SET DEFAULT 5;
