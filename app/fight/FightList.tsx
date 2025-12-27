"use client";

import { useMemo, useState, useTransition } from "react";
import { reorderFightEntries, removeFightEntry } from "@/app/actions";

type Row = {
  entryId: string;
  pokemonId: string;
  name: string;
  spriteUrl: string;
  speed: number | null;
};

export default function FightList({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // falls initial sich bei revalidate ändert, kann man optional syncen:
  // (hier bewusst nicht, weil wir optimistisch arbeiten)

  const onDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;

    const next = [...rows];
    const from = next.findIndex((r) => r.entryId === dragId);
    const to = next.findIndex((r) => r.entryId === targetId);
    if (from < 0 || to < 0) return;

    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    setRows(next);

    startTransition(async () => {
      await reorderFightEntries(next.map((r) => r.entryId));
    });
  };

  const doRemove = (entryId: string) => {
    setRows((prev) => prev.filter((r) => r.entryId !== entryId));

    startTransition(async () => {
      const fd = new FormData();
      fd.set("entryId", entryId);
      await removeFightEntry(fd);
    });
  };

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
      {rows.length === 0 ? (
        <div style={{ color: "#666" }}>No Pokémon added yet.</div>
      ) : null}

      {rows.map((r) => (
        <div
          key={r.entryId}
          draggable
          onDragStart={() => setDragId(r.entryId)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDropOn(r.entryId)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: "1px solid #ccc",
            padding: "8px 10px",
            borderRadius: 0,
            background: "#0808083a",
            opacity: isPending ? 0.85 : 1,
          }}
        >
          <div style={{ width: 24, color: "#999" }}>☰</div>

          {r.spriteUrl ? (
            <img src={r.spriteUrl} alt={r.name} width={44} height={44} />
          ) : (
            <div style={{ width: 44, height: 44 }} />
          )}

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{r.name}</div>
          </div>

          <div style={{ minWidth: 110, textAlign: "right" }}>
            <span style={{ color: "#999" }}>Init:</span>{" "}
            <b>{r.speed ?? "-"}</b>
          </div>

          <button type="button" onClick={() => doRemove(r.entryId)}>
            ✖
          </button>
        </div>
      ))}
    </div>
  );
}
