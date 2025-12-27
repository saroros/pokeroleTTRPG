-- CreateEnum
CREATE TYPE "PokemonStatus" AS ENUM ('ACTIVE', 'BOX', 'DEAD');

-- CreateTable
CREATE TABLE "Trainer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "editKey" TEXT NOT NULL,
    "money" INTEGER NOT NULL DEFAULT 0,
    "itemsNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonInstance" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "status" "PokemonStatus" NOT NULL DEFAULT 'BOX',
    "speciesId" INTEGER NOT NULL,
    "speciesName" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '',
    "level" INTEGER NOT NULL DEFAULT 1,
    "spriteUrl" TEXT NOT NULL DEFAULT '',
    "baseStats" JSONB NOT NULL,
    "statMods" JSONB NOT NULL,
    "diceStats" JSONB NOT NULL,
    "scaledHp" INTEGER NOT NULL,
    "hpMax" INTEGER NOT NULL,
    "moves" JSONB NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokemonInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trainer_slug_key" ON "Trainer"("slug");

-- AddForeignKey
ALTER TABLE "PokemonInstance" ADD CONSTRAINT "PokemonInstance_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
