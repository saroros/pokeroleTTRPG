"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateTrainerItemsAndMoney } from "@/app/actions";

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export default function ItemsBox({
  trainerSlug,
  initialItems,
  initialMoney,
}: {
  trainerSlug: string;
  initialItems: string;
  initialMoney: number;
}) {
  const [items, setItems] = useState(initialItems ?? "");
  const [money, setMoney] = useState<number>(typeof initialMoney === "number" ? initialMoney : 0);

  const [isPending, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const timer = useRef<any>(null);

  useEffect(() => {
    autoResize(taRef.current);
  }, [items]);

  const queueSave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set("trainerSlug", trainerSlug);
        fd.set("itemsNote", items);
        fd.set("money", String(money));
        await updateTrainerItemsAndMoney(fd);
      });
    }, 400);
  };

  return (
    <section id="items-container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Items</h2>
        <div style={{ fontSize: 14, color: "#666" }}>{isPending ? "Saving..." : "Autosave"}</div>
      </div>

      <textarea
        ref={taRef}
        value={items}
        onChange={(e) => setItems(e.target.value)}
        onInput={queueSave}
        placeholder="Hier Items einfügen..."
        style={{
          width: "100%",
          resize: "none",
          overflow: "hidden",
          minHeight: 120,
          padding: 10,
          marginTop: 8,
          border: "1px solid rgb(121, 190, 255)",
          fontFamily: "inherit",
          fontSize: 20,
          lineHeight: 1.4,
        }}
      />

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>$ Pokécoins</div>
        <input
          type="number"
          value={money}
          onChange={(e) => {
            const v = parseInt(e.target.value || "0", 10);
            setMoney(Number.isFinite(v) ? v : 0);
          }}
          onBlur={queueSave}
          style={{
            width: 200,
            padding: 10,
            border: "1px solid rgb(121, 190, 255)",
            fontFamily: "inherit",
          }}
        />
      </div>
    </section>
  );
}
