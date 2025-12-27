export const dynamic = "force-dynamic";

import { db } from "@/lib/db";

export default async function DMPage() {
  const trainers = await db.trainer.findMany({
    orderBy: { createdAt: "desc" },
    include: { pokemons: true },
  });

  return (
    <main style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1>DM Dashboard</h1>
      <ul>
        {trainers.map((t) => (
          <li key={t.id} style={{ marginBottom: 10 }}>
            <div><b>{t.name}</b></div>
            <div>Pokémon: {t.pokemons.length}</div>
            <div><code>/trainer/{t.slug}</code></div>
          </li>
        ))}
      </ul>
    </main>
  );
}
