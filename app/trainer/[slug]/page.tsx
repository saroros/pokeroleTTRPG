export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { diceTier } from "@/lib/rules";
import {
  addMoveManually,
  addPokemonToTrainer,
  deletePokemon,
  movePokemonStatus,
  removeMove,
  updateHpCurrent,
  updateLevel,
  updateStatModifier,
  updateTrainerLevel,
  incrementTrainerLevel,
  deleteTrainer,
  updateTrainerItemsAndMoney,
  updatePokemonCondition, updatePokemonNotes, addPokemonToFight,
} from "@/app/actions";
import ItemsBox from "./ItemsBox";
import CharacterSheetDrawer from "./CharacterSheetDrawer";
import Link from "next/link";
import DeleteTrainerButton from "./DeleteTrainerButton";
import ShowdownExportButton from "./ShowdownExportButton";

function titleCaseWord(w: string) {
  if (!w) return w;
  return w[0].toUpperCase() + w.slice(1);
}

function showdownNameFromPokeApiName(name: string) {
  // "geodude-alola" -> "Geodude-Alola"
  return name
    .split("-")
    .map((p) => titleCaseWord(p))
    .join("-");
}

function showdownMoveName(moveName: string) {
  // "rock-smash" -> "Rock Smash"
  return moveName
    .split("-")
    .map((p) => titleCaseWord(p))
    .join(" ");
}

function buildShowdownExport(trainerName: string, activeMons: any[]) {

  const blocks = activeMons.map((mon) => {
    const baseName = showdownNameFromPokeApiName(mon.speciesName);
    const nickname = (mon.nickname ?? "").trim();
    const firstLine = nickname ? `${nickname} (${baseName})` : `${baseName}`;

    const lines: string[] = [firstLine];

    // optional: Ability, Item etc. (nur wenn du es später speicherst)
    // if (mon.abilityName) lines.push(`Ability: ${mon.abilityName}`);

    lines.push(`Level: ${mon.level ?? 1}`);

    // Tera Type: wenn du willst, nimm den ersten Typ als placeholder
    if (Array.isArray(mon.types) && mon.types.length > 0) {
      lines.push(`Tera Type: ${titleCaseWord(mon.types[0])}`);
    }

    const moves = (mon.moves ?? []).slice(0, 4);
    for (const m of moves) {
      const mvName = typeof m === "string" ? m : (m?.name ?? "");
      if (!mvName) continue;
      lines.push(`- ${showdownMoveName(mvName)}`);
    }

    return lines.join("\n");
  });

  return blocks.join("\n\n") + "\n";
}

function StatTable({
  trainerSlug,
  pokemonId,
  baseStats,
  statMods,
  diceStats,
  scaledHp,
  hpMax,
}: any) {
const keys = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"] as const;

const LABEL: Record<(typeof keys)[number], string> = {
  hp: "KP",
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpAtk",
  "special-defense": "SpDef",
  speed: "Init",
};

  return (
    <div id="stats">
      <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Stat</th>
            <th align="left">Base</th>
            <th align="left">Modifier</th>
            <th align="left">Dice</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k}>
              <td>{LABEL[k]}</td>
              <td>{baseStats[k]}</td>
              <td>
                <form action={updateStatModifier} style={{ display: "flex", gap: 6 }}>
                  <input type="hidden" name="trainerSlug" value={trainerSlug} />
                  <input type="hidden" name="pokemonId" value={pokemonId} />
                  <input type="hidden" name="statKey" value={k} />
                  <input
                    name="modValue"
                    type="number"
                    defaultValue={statMods[k] ?? 0}
                    style={{ width: 40 }}
                  />
                  <button type="submit">Set</button>
                </form>
              </td>
              <td>
                {diceTier(baseStats[k])} ({(statMods[k] ?? 0) >= 0 ? "+" : ""}
                {statMods[k] ?? 0}) = <b>{diceStats[k]}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Moves({ trainerSlug, pokemonId, moves, availableMoves }: any) {
  return (
    <div id="moves">
      <b>Moves (max 4)</b>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Typ</th>
            <th align="left">Class</th>
            <th align="left">Power</th>
            <th align="left">Dice</th>
            <th align="left">Acc</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(moves ?? []).map((m: any, idx: number) => (
            <tr key={`${m.name}-${idx}`}>
              <td>
              <span
                title={m.flavorText ?? ""}
                style={{ textDecoration: m.flavorText ? "underline dotted" : "none", cursor: m.flavorText ? "help" : "default" }}
              >
                {m.name}
              </span>
            </td>
              <td id="small">{m.type}</td>
              <td title={m.damageClass}>
                {m.damageClass === "physical" ? "⚔️" : m.damageClass === "special" ? "✨" : "🌀"}
              </td>
              <td>{m.power ?? "-"}</td>
              <td>{m.powerDice ?? "-"} d6</td>
              <td>
                {m.accuracy == null ? "-" : `DC ${m.accuracyDc ?? "-"}`}
              </td>
              <td>
                <form action={removeMove}>
                  <input type="hidden" name="trainerSlug" value={trainerSlug} />
                  <input type="hidden" name="pokemonId" value={pokemonId} />
                  <input type="hidden" name="moveIndex" value={idx} />
                  <button type="submit">X</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <datalist id={`moves-${pokemonId}`}>
        {(availableMoves ?? []).map((m: any) => (
          <option key={m.name} value={m.name} />
        ))}
      </datalist>

      <form action={addMoveManually} style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input type="hidden" name="trainerSlug" value={trainerSlug} />
        <input type="hidden" name="pokemonId" value={pokemonId} />
        <input name="moveName" placeholder="Add move" list={`moves-${pokemonId}`} />
        <button type="submit">Move lernen</button>
      </form>

      <div style={{ fontSize: 14, color: "#666", marginTop: 6 }}>
        Es werden nur Moves angezeigt, die das Pokémon zum jetzigen Level lernen kann.
      </div>
    </div>
  );
}


const TYPE_COLORS: Record<string, string> = {
  bug: "#94bc4a",
  dark: "#736c75",
  dragon: "#6a7baf",
  electric: "#e5c531",
  fairy: "#e397d1",
  fighting: "#cb5f48",
  fire: "#ea7a3c",
  flying: "#7da6de",
  ghost: "#846ab6",
  grass: "#71c558",
  ground: "#cc9f4f",
  ice: "#70cbd4",
  normal: "#aab09f",
  poison: "#b468b7",
  psychic: "#e5709b",
  rock: "#b2a061",
  steel: "#89a1b0",
  water: "#539ae2",
};

function readableTextColor(hex: string) {
  // hex like "#aabbcc"
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  // perceived luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 150 ? "#111" : "#fff";
}

function TypeBadge({ type, mult }: { type: string; mult?: number }) {
  const key = (type ?? "").toLowerCase();
  const bg = TYPE_COLORS[key] ?? "#777777";
  const fg = readableTextColor(bg);

  const multLabel =
    mult === undefined
      ? null
      : mult === 0
      ? "0×"
      : mult === 0.25
      ? "¼"
      : mult === 0.5
      ? "½"
      : `${mult}×`;

  return (
    <span
      style={{
        background: bg,
        color: fg,
        padding: "2px 5px",
        borderRadius: 2,
        fontSize: 16,           // smaller type text
        fontWeight: 700,
        textTransform: "capitalize",
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        lineHeight: 1.2,
      }}
      title={key}
    >
      <span>{key}</span>

      {multLabel ? (
        <span
          style={{
            color: fg,
            fontSize: 16,                   // even smaller for multiplier
            fontWeight: 800,
          }}
          title={`Multiplier: ${multLabel}`}
        >
          {multLabel}
        </span>
      ) : null}
    </span>
  );
}


function TypeBadges({ types }: { types: string[] }) {
  if (!types?.length) return <span style={{ fontSize: 16, color: "#666" }}>Types: —</span>;

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 0 }}>
      <span style={{ fontSize: 20, color: "#666" }}>Typ:</span>
      {types.map((t) => (
        <TypeBadge key={t} type={t} />
      ))}
    </div>
  );
}

function MultiplierBadge({ m }: { m: number }) {
  const label =
    m === 0 ? "0×" : m === 0.25 ? "¼×" : m === 0.5 ? "½×" : `${m}×`;

  return (
    <span
      style={{
        fontSize: 16,
        padding: "2px 6px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.15)",
        background: "rgba(0,0,0,0.04)",
      }}
      title={`Multiplier: ${label}`}
    >
      {label}
    </span>
  );
}

function Matchups({ typeMatchups }: { typeMatchups: Record<string, number> }) {
  const entries = Object.entries(typeMatchups ?? {});

  const immune = entries.filter(([, m]) => m === 0);
  const resist = entries.filter(([, m]) => m > 0 && m < 1).sort((a, b) => a[1] - b[1]);
  const weak = entries.filter(([, m]) => m > 1).sort((a, b) => b[1] - a[1]);

  const Row = ({ title, items }: { title: string; items: [string, number][] }) => (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
      <span style={{ fontSize: 16, color: "#666", minWidth: 70 }}>
        <b>{title}:</b>
      </span>

      {items.length ? (
        items.map(([t, m]) => <TypeBadge key={`${title}-${t}`} type={t} mult={m} />)
      ) : (
        <span style={{ fontSize: 16, color: "#666" }}>—</span>
      )}
    </div>
  );

  return (
    <div style={{ marginTop: 6 }}>
      <Row title="Schwächen" items={weak as any} />
      <Row title="Resistenz" items={resist as any} />
      <Row title="Immunität" items={immune as any} />
    </div>
  );
}


function PokemonCard({ trainerSlug, mon }: any) {
  const baseStats = mon.baseStats as any;
  const statMods = mon.statMods as any;
  const diceStats = mon.diceStats as any;
  const moves = mon.moves as any;

  return (
    <div className={`pokemonCard condition-${(mon.condition ?? "NONE").toLowerCase()}`}>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {(["ACTIVE", "BOX", "DEAD"] as const).map((s) => {
 const STATUS_LABEL: Record<"ACTIVE" | "BOX" | "DEAD", string> = {
  ACTIVE: "⭐ TEAM",
  BOX: "🖥️ BOX",
  DEAD: "💀 DEAD",
};

const label = STATUS_LABEL[s];


  return (
    <form key={s} action={movePokemonStatus}>
      <input type="hidden" name="trainerSlug" value={trainerSlug} />
      <input type="hidden" name="pokemonId" value={mon.id} />
      <input type="hidden" name="status" value={s} />
      <button type="submit" disabled={mon.status === s}>
        {label}
      </button>
    </form>
  );
})}

        <form action={deletePokemon}>
          <input type="hidden" name="trainerSlug" value={trainerSlug} />
          <input type="hidden" name="pokemonId" value={mon.id} />
          <button className="btn-close" type="submit">❌</button>
        </form>
        <form id="addfighter" action={addPokemonToFight}>
  <input type="hidden" name="trainerSlug" value={trainerSlug} />
  <input type="hidden" name="pokemonId" value={mon.id} />
  <button type="submit" title="Add to Fight">⚔️</button>
</form>

      </div>
      <div className="card-header">
        <div className="card-sprite">
          {mon.spriteUrl ? <img src={mon.spriteUrl} alt={mon.speciesName} width={56} height={56} /> : null}
        </div>
          <div className="pokemon-name">
            <b>{mon.nickname ? `${mon.nickname} (${mon.speciesName})` : mon.speciesName}</b>
          </div>
      </div>
      
    
<div id="typ-cond">
      <div id="typ"><TypeBadges types={mon.types ?? []} /></div>
      <form action={updatePokemonCondition}>
  <input type="hidden" name="trainerSlug" value={trainerSlug} />
  <input type="hidden" name="pokemonId" value={mon.id} />

  <select
    key={`${mon.id}-${mon.condition ?? "NONE"}`} 
    name="condition"
    defaultValue={mon.condition ?? "NONE"}
  >
    <option value="NONE">✅</option>
    <option value="BRN">🔥 BRN</option>
    <option value="PAR">⚡ PAR</option>
    <option value="PSN">☠️ POI</option>
    <option value="TOX">🫧 TOX</option>
    <option value="SLP">💤 SLP</option>
    <option value="FRZ">🧊 FRZ</option>
    <option value="FNT">💀 KO</option>
  </select>
  <button id="margin-left" type="submit">Set</button>
</form>

</div>

      <Matchups typeMatchups={mon.typeMatchups ?? {}} />
<div id="lvl-hp" style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
            <form action={updateLevel} style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <input type="hidden" name="trainerSlug" value={trainerSlug} />
              <input type="hidden" name="pokemonId" value={mon.id} />
              <span>Lv</span>
              <input name="level" type="number" min={1} max={100} defaultValue={mon.level} style={{ width: 50 }} />
              <button type="submit">Set</button>
            </form>

            <form action={updateHpCurrent} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="hidden" name="trainerSlug" value={trainerSlug} />
              <input type="hidden" name="pokemonId" value={mon.id} />
              <span>HP</span>
              <input name="hpCurrent" type="number" defaultValue={mon.hpCurrent} style={{ width: 50 }} />
              <span>/ {mon.hpMax}</span>
              <button type="submit">Set</button>
            </form>
        </div>
      <StatTable
        trainerSlug={trainerSlug}
        pokemonId={mon.id}
        baseStats={baseStats}
        statMods={statMods}
        diceStats={diceStats}
        scaledHp={mon.scaledHp}
        hpMax={mon.hpMax}
      />

      <Moves
        trainerSlug={trainerSlug}
        pokemonId={mon.id}
        moves={moves}
        availableMoves={mon.availableMoves}
      />
      <div id="notizen">
  <form action={updatePokemonNotes} style={{ display: "grid", gap: 6, marginTop: 6 }}>
    <input type="hidden" name="trainerSlug" value={trainerSlug} />
    <input type="hidden" name="pokemonId" value={mon.id} />
    <textarea
      name="notes"
      defaultValue={mon.notes ?? ""}
      rows={3}
      placeholder="Notizen…"
    />
    <button type="submit">Save</button>
  </form>
</div>

    </div>
  );
}

export default async function TrainerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const trainer = await db.trainer.findUnique({
    where: { slug },
    include: { pokemons: { orderBy: { createdAt: "desc" } } },
  });

  if (!trainer) {
    return (
      <main style={{ padding: 16, fontFamily: "system-ui" }}>
        <h1>Trainer</h1>
        <p>Trainer not found for slug: <code>{slug}</code></p>
        <div style={{ marginTop: 24 }}>
      <Link href="/">
        <button type="button">← Back to Home</button>
      </Link>
    </div>
      </main>
    );
  }

  const active = trainer.pokemons.filter((p) => p.status === "ACTIVE");
  const box = trainer.pokemons.filter((p) => p.status === "BOX");
  const dead = trainer.pokemons.filter((p) => p.status === "DEAD");
  const showdownText = buildShowdownExport(trainer.name, active);

  return (
    <main>
     <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
  <h1 style={{ margin: 0 }}>{trainer.name}</h1>

  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ fontSize: 20, color: "#666" }}>Lvl</span>
    <b>{trainer.level ?? 1}</b>

    <form action={incrementTrainerLevel}>
      <input type="hidden" name="trainerSlug" value={trainer.slug} />
      <button type="submit">Click to LVL UP</button>
    </form>
  </div>
</div>
<div id="char-fight">
  <div id="char">
  <CharacterSheetDrawer
    trainerSlug={trainer.slug}
    initialSheet={trainer.characterSheet}
    initialBackstory={trainer.backstory}
    initialFavoriteLegendary={trainer.favoriteLegendary}
  />
  </div>
  <div id="fightbtn"><Link href="/fight" target="_blank"><button type="button">⚔️ Zum Kampf</button></Link>
  </div>
</div>
<div id="add-stuff">
    <section id="addmon">
        <h2>Add Pokémon</h2>
        <form action={addPokemonToTrainer} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
          <input type="hidden" name="trainerSlug" value={trainer.slug} />
          <input name="speciesName" placeholder="Name oder ID (pikachu / 25)" />
          <input name="nickname" placeholder="Nickname (optional)" />
          <input name="level" type="number" defaultValue={5} min={1} max={100} />
          <select name="status" defaultValue="BOX">
            <option value="ACTIVE">⭐ TEAM</option>
            <option value="BOX">🖥️ BOX</option>
            <option value="DEAD">💀 DEAD</option>
          </select>
          <button type="submit">Pokémon hinzufügen</button>
        </form>
      </section>  
      <ItemsBox
  trainerSlug={trainer.slug}
  initialItems={trainer.itemsNote ?? ""}
  initialMoney={trainer.money ?? 0}
/>

</div>
      <section id="pokebox">
        <div id="mons">
          <h2>Party (Active)</h2>
         
          <div className="mons">
            {active.map((m) => <PokemonCard key={m.id} trainerSlug={trainer.slug} mon={m} />)}
          </div>
           <ShowdownExportButton text={showdownText} />
        </div>
        <div id="mons">
          <h2>Box</h2>
          <div className="mons">
            {box.map((m) => <PokemonCard key={m.id} trainerSlug={trainer.slug} mon={m} />)}
          </div>
        </div>
        <div id="mons">
          <h2>Dead</h2>
          <div className="mons">
            {dead.map((m) => <PokemonCard key={m.id} trainerSlug={trainer.slug} mon={m} />)}
          </div>
        </div>
      </section>
      <p>&nbsp;</p>
      
     <div style={{ marginTop: 24 }}>
      <Link href="/">
        <button type="button">← Back to Home</button>
      </Link>
    </div>
    <DeleteTrainerButton trainerSlug={trainer.slug} />


    </main>
  );
}
