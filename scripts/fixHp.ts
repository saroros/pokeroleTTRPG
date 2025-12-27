import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Missing DATABASE_URL");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const mons = await db.pokemonInstance.findMany();
  for (const m of mons) {
    if (m.hpCurrent === 0 && m.hpMax > 0) {
      await db.pokemonInstance.update({
        where: { id: m.id },
        data: { hpCurrent: m.hpMax },
      });
    }
    // if availableMoves is null/empty, keep it as []
  }
  console.log("Done.");
}

main().finally(async () => {
  await db.$disconnect();
});
