-- CreateTable
CREATE TABLE "FightEntry" (
    "id" TEXT NOT NULL,
    "pokemonId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FightEntry_pokemonId_key" ON "FightEntry"("pokemonId");

-- AddForeignKey
ALTER TABLE "FightEntry" ADD CONSTRAINT "FightEntry_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "PokemonInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
