"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveCharacterSheet } from "@/app/actions";

type SheetState = {
  main: Record<string, number>;
  sub: Record<string, number>;
  social: Record<string, number>;
};

const MAIN_STATS = [
  {
    id: "staerke",
    label: "Stärke",
    subs: [
      { id: "pruegeln", label: "Prügeln", skill: "MaxSkill: Kann einmal pro Kampf auf ein Pokemon einprügeln (+1d6 Schaden)" },
      { id: "werfen_heben", label: "Werfen/Heben", skill: "MaxSkill: Kann Objekte oder Gegner bis zur eigenen Körpergrösse heben/werfen, ohne Check. +2 beim Fangen, weil du so gut im Bälle werfen bist." },
      { id: "einschuechtern", label: "Einschüchtern", skill: "MaxSkill: Du wirst von wilden Pokemons als Alpha erkannt. Sie flüchten nicht und haben -3 auf Ihre Fangquote." },
      { id: "athletik", label: "Athletik", skill: "MaxSkill: I am Speed. +5 Initiative." },
    ],
  },
  {
    id: "geschicklichkeit",
    label: "Geschicklichkeit",
    subs: [
      { id: "ausweichen", label: "Ausweichen", skill: "MaxSkill: Can’t touch me. Du kannst wilden Pokemons ausweichen." },
      { id: "stealth", label: "Stealth", skill: "MaxSkill: Du kannst eine Überraschungs-Runde (Gegner setzte 1 Runde aus) triggern, wenn du versteckt bist und angreifst (Trainer und wilde Mons)" },
      { id: "basteln", label: "Basteln", skill: "MaxSkill: Ball-Buster: Aus 5 Pokeballs mach 1 Superball. Aus 5 Superball mach 1 Hyperball. Aus 100 Hyperball mach 1 Masterball." },
      { id: "balance", label: "Balance", skill: "MaxSkill: Du kannst Surfer einsetzen und übers Wasser gehen, ohne dass ein Pokemon die Attacke kennen muss." },
    ],
  },
  {
    id: "charisma",
    label: "Charisma",
    subs: [
      { id: "lore_geschichte", label: "Lore/Geschichte", skill: "MaxSkill: Kann uralte Ruinen so deuten, dass Pokémon in der Umgebung dir vertrauen oder dich nicht angreifen. Du kannst die vergessene Sprache reden/lesen." },
      { id: "empathie", label: "Empathie", skill: "MaxSkill: Fremde Leute vertrauen dir 1x am Tag ihre Geheimnisse an, auch Gegner (Roll für Geheimnisstärke bei Gegner)" },
      { id: "etikette", label: "Etikette", skill: "MaxSkill: Du bist super höflich zu Servicearbeiter. 50% Rabatt bei allen Händler (ausser sie hassen dich)" },
      { id: "performance", label: "Performance", skill: "MaxSkill: Showtime! Lenke Leute und Pokemons 1x am Tag mit einer Hammer Performance ab. Sie werden dich mit Items belohnen. Bei sehr guten Performances sogar seltene Items." },
    ],
  },
  {
    id: "weisheit",
    label: "Weisheit",
    subs: [
      { id: "survival", label: "Survival", skill: "MaxSkill: Du findest in der Wildnis häufiger und bessere Items." },
      { id: "medizin", label: "Medizin", skill: "MaxSkill: Heiltränke sind doppelt so effektiv. Kann 1x am Tag einen Status heilen ohne Item (auch im Kampf)" },
      { id: "wissenschaft", label: "Wissenschaft", skill: "MaxSkill: Du Nerd! Du kannst Computer und Kameras hacken ohne Check. +1 Clever Punkt in Soziale Attribute" },
      { id: "natur", label: "Natur", skill: "MaxSkill: Finger ablecken und in die Luft. Du kannst 1x Pro Tag für 1 Kampf das Wetter beeinflussen." },
    ],
  },
] as const;

const SOCIAL = [
  { id: "tough", label: "Tough" },
  { id: "beauty", label: "Beauty" },
  { id: "clever", label: "Clever" },
  { id: "cool", label: "Cool" },
] as const;

function clamp05(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(5, Math.trunc(n)));
}

function PokeBallIcon({ active, size = 18 }: { active: boolean; size?: number }) {
  // Simple Pokéball: top half red, bottom half white, black outline + center button
  const top = active ? "#e53935" : "#d0d0d0";
  const bottom = active ? "#ffffff" : "#ededed";
  const stroke = active ? "#111111" : "#888888";
  const center = active ? "#ffffff" : "#f5f5f5";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      {/* outer circle */}
      <circle cx="50" cy="50" r="46" fill={bottom} stroke={stroke} strokeWidth="8" />

      {/* top half */}
      <path
        d="M 8 50 A 42 42 0 0 1 92 50 L 92 50 L 8 50 Z"
        fill={top}
      />

      {/* middle band */}
      <line x1="8" y1="50" x2="92" y2="50" stroke={stroke} strokeWidth="10" />

      {/* center button */}
      <circle cx="50" cy="50" r="16" fill={center} stroke={stroke} strokeWidth="8" />
      <circle cx="50" cy="50" r="6" fill={active ? "#f2f2f2" : "#ffffff"} stroke={stroke} strokeWidth="2" />
    </svg>
  );
}


function ratingDots(value: number, onSet: (n: number) => void) {
  const v = clamp05(value);

  return (
    <div style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const filled = i < v;

        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              // toggle down if clicking the current value
              const next = v === n ? n - 1 : n;
              onSet(next);
            }}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              lineHeight: 0,
              opacity: filled ? 1 : 0.55,
              transform: filled ? "scale(1.03)" : "scale(1.0)",
              transition: "transform 120ms ease, opacity 120ms ease",
            }}
            aria-label={`Set to ${n}`}
            title={v === n ? `Set to ${n - 1}` : `Set to ${n}`}
          >
            <PokeBallIcon active={filled} size={18} />
          </button>
        );
      })}
    </div>
  );
}



export default function CharacterSheetDrawer({
  trainerSlug,
  initialSheet,
  initialBackstory,
  initialFavoriteLegendary,
}: {
  trainerSlug: string;
  initialSheet: any;
  initialBackstory: string;
  initialFavoriteLegendary: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaultSheet: SheetState = useMemo(() => {
    const main: Record<string, number> = {};
    const sub: Record<string, number> = {};
    const social: Record<string, number> = {};

    for (const m of MAIN_STATS) {
      main[m.id] = 0;
      for (const s of m.subs) sub[s.id] = 0;
    }
    for (const s of SOCIAL) social[s.id] = 0;

    return { main, sub, social };
  }, []);

  const [sheet, setSheet] = useState<SheetState>(() => {
    const incoming = (initialSheet ?? {}) as Partial<SheetState>;
    return {
      main: { ...defaultSheet.main, ...(incoming.main ?? {}) },
      sub: { ...defaultSheet.sub, ...(incoming.sub ?? {}) },
      social: { ...defaultSheet.social, ...(incoming.social ?? {}) },
    };
  });

  const [backstory, setBackstory] = useState(initialBackstory ?? "");
  const [favoriteLegendary, setFavoriteLegendary] = useState(initialFavoriteLegendary ?? "");

  // debounce autosave
  const saveTimer = useRef<any>(null);
  const queueSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set("trainerSlug", trainerSlug);
        fd.set("characterSheet", JSON.stringify(sheet));
        fd.set("backstory", backstory);
        fd.set("favoriteLegendary", favoriteLegendary);
        await saveCharacterSheet(fd);
      });
    }, 400);
  };

  useEffect(() => {
    if (!open) return;
    queueSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, backstory, favoriteLegendary]);

  const setMain = (id: string, v: number) => {
    setSheet((prev) => ({ ...prev, main: { ...prev.main, [id]: clamp05(v) } }));
  };

  const setSub = (id: string, v: number) => {
    setSheet((prev) => ({ ...prev, sub: { ...prev.sub, [id]: clamp05(v) } }));
  };

  const setSocial = (id: string, v: number) => {
    setSheet((prev) => ({ ...prev, social: { ...prev.social, [id]: clamp05(v) } }));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: 8,
          padding: "6px 10px",
          border: "2px solid rgba(255, 255, 255, 0.25)",
          background: "rgba(0, 0, 0, 1)",
          cursor: "pointer",
        }}
      >
        Character Sheet
      </button>

      {/* overlay */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms ease",
          zIndex: 50,
        }}
      />

      {/* drawer */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "min(820px, 92vw)",
          background: "rgba(29, 29, 29, 1)",
          zIndex: 60,
          transform: open ? "translateX(0)" : "translateX(110%)",
          transition: "transform 220ms ease",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #ddd",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 800 }}>Character Sheet</div>
            <div style={{ fontSize: 14, color: "#666" }}>{isPending ? "Saving..." : "Autosave"}</div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.25)",
              background: "rgba(0,0,0,0.04)",
              cursor: "pointer",
            }}
          >
            Schliessen
          </button>
        </div>

        <div style={{ padding: 20, overflow: "auto" }}>
          {/* Main stats */}
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Attribute</h2>

          <div id="char-stats">
            {MAIN_STATS.map((m) => (
              <div key={m.id} id="char-stat">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800 }}>{m.label}</div>
                  {ratingDots(sheet.main[m.id] ?? 0, (n) => setMain(m.id, n))}
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {m.subs.map((s) => {
                    const val = sheet.sub[s.id] ?? 0;
                    const unlocked = val >= 5;
                    return (
                      <div
                        key={s.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 10,
                          alignItems: "center",
                          borderTop: "1px solid #eee",
                          paddingTop: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ fontWeight: 400 }}>
                            {s.label}{" "}
                            <span
                             title={unlocked ? s.skill : `${s.skill}`}
                              style={{
                                display: "inline-flex",
                                width: 16,
                                height: 16,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 999,
                                border: "1px solid rgba(255, 255, 255, 1)",
                                fontSize: 16,
                                color: unlocked ? "green" : "#ffffffff",
                                cursor: "help",
                              }}
                            >
                              ?
                            </span>
                          </div>

                          {unlocked ? (
                            <span style={{ fontSize: 14, color: "green" }} title={s.skill}>
                              MaxSkill
                            </span>
                          ) : (
                            <span style={{ fontSize: 14, color: "#ffffffff" }}>0–5</span>
                          )}
                        </div>

                        {ratingDots(val, (n) => setSub(s.id, n))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Social attributes */}
          <h2 style={{ marginTop: 40, marginBottom: 10 }}>Soziale Attribute</h2>
          <div className="soz-stats">
            <div className="soz-stat">
              {SOCIAL.map((s) => (
                <div className="soz"
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{s.label}</div>
                  {ratingDots(sheet.social[s.id] ?? 0, (n) => setSocial(s.id, n))}
                </div>
              ))}
            </div>
          </div>

          {/* Backstory + favorite legendary */}
          <h2 style={{ marginTop: 40, marginBottom: 10 }}>Backstory</h2>
          <textarea
            value={backstory}
            onChange={(e) => setBackstory(e.target.value)}
            placeholder="Write backstory..."
            rows={6}
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #bbb",
              fontFamily: "inherit",
            }}
          />

          <h2 style={{ marginTop: 40, marginBottom: 10 }}>Favourite Legendary Pokémon</h2>
          <input
            value={favoriteLegendary}
            onChange={(e) => setFavoriteLegendary(e.target.value)}
            placeholder="e.g. Lugia"
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #bbb",
              fontFamily: "inherit",
            }}
          />
        </div>
      </aside>
    </>
  );
}
