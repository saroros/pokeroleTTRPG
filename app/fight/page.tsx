export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import FightList from "./FightList";

export default async function FightPage() {
 const config = await db.fightConfig.findUnique({ where: { id: "global" } });


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
<section style={{ marginTop: 12, padding: 12, border: "1px solid #ccc", borderRadius: 0 }}>
  <h3 style={{ marginTop: 0 }}>Gegner</h3>

  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
    <form action="/api/fight/upload" method="post" encType="multipart/form-data">
      <input name="file" type="file" accept="image/png,image/jpeg" />
      <button type="submit" style={{ marginLeft: 8 }}>Upload</button>
    </form>

    <form action="/api/fight/clear" method="post">
      <button type="submit">Clear</button>
    </form>
  </div>

  <div style={{ marginTop: 12 }}>
    {config?.headerImageDataUrl ? (
      <img
        src={config.headerImageDataUrl}
        alt="Fight header"
        style={{ maxWidth: "300px", }}
      />
    ) : (
      <div style={{ color: "#666", fontSize: 12 }}>No image uploaded.</div>
    )}
  </div>

  <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
    PNG/JPG, max 2MB. Stored in DB as Base64.
  </div>
</section>


      <p style={{ color: "#666", marginTop: 6 }}>
        Drag & drop to reorder initiative. (Sprite + Name + Speed)
      </p>

      <FightList initial={initial} />
    </main>
  );
}
