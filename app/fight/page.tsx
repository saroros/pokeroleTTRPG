export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import FightList from "./FightList";

export default async function FightPage() {
  const entries = await db.fightEntry.findMany({
    orderBy: { order: "asc" },
    include: {
      pokemon: true,
    },
  });

  // nur Daten, die wir brauchen
  const initial = entries.map((e) => {
    const mon: any = e.pokemon;
    const diceStats = (mon.diceStats ?? {}) as any;
    const speed = diceStats["speed"] ?? null;

    return {
      entryId: e.id,
      pokemonId: mon.id,
      name: mon.nickname ? `${mon.nickname} (${mon.speciesName})` : mon.speciesName,
      spriteUrl: mon.spriteUrl ?? "",
      speed,
    };
  });

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>⚔️ Fight</h1>
        <Link href="/"><button type="button">← Home</button></Link>
      </div>

      <p style={{ color: "#666", marginTop: 6 }}>
        Drag & drop to reorder initiative. (Sprite + Name + Speed)
      </p>

      <FightList initial={initial} />
    </main>
  );
}
