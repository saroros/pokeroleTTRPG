-- AlterTable
ALTER TABLE "Trainer" ADD COLUMN     "backstory" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "characterSheet" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "favoriteLegendary" TEXT NOT NULL DEFAULT '';
