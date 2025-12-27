import { StatKey } from "./rules";
import { StatKey, diceTier, accuracyToDC } from "./rules";

const POKEAPI = "https://pokeapi.co/api/v2";

type PokePokemon = {
  id: number;
  name: string;
  sprites?: { front_default?: string | null };
  stats: { base_stat: number; stat: { name: StatKey } }[];
  types: { slot: number; type: { name: string } }[];
  moves: {
    move: { name: string; url: string };
    version_group_details: {
      level_learned_at: number;
      move_learn_method: { name: string };
    }[];
  }[];
};

type PokeMove = {
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  type: { name: string };
  damage_class: { name: string };
  flavor_text_entries?: {
    flavor_text: string;
    language: { name: string };
    version_group: { name: string };
  }[];
  effect_entries?: {
    effect: string;
    short_effect: string;
    language: { name: string };
  }[];
};

export type MoveSummary = {
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: string;
  damageClass: string;
  learnedAt?: number;
    powerDice: number | null;

};

export async function fetchPokemonByName(nameOrId: string): Promise<PokePokemon> {
  const q = String(nameOrId).trim().toLowerCase();

  // if user typed "25" etc, that's fine — PokéAPI accepts numeric IDs too
  const res = await fetch(`${POKEAPI}/pokemon/${encodeURIComponent(q)}`, {
    next: { revalidate: 60 * 60 },
  });

  if (!res.ok) throw new Error(`PokéAPI pokemon fetch failed: ${res.status}`);
  return res.json();
}


export async function fetchMoveByName(name: string): Promise<PokeMove> {
  const res = await fetch(`${POKEAPI}/move/${encodeURIComponent(name.toLowerCase())}`, {
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) throw new Error(`PokéAPI move fetch failed: ${res.status}`);
  return res.json();
}

export function extractBaseStats(p: PokePokemon): Record<StatKey, number> {
  const out: Record<StatKey, number> = {
    hp: 0,
    attack: 0,
    defense: 0,
    "special-attack": 0,
    "special-defense": 0,
    speed: 0,
  };
  for (const s of p.stats) {
    if (s.stat.name in out) out[s.stat.name] = s.base_stat;
  }
  return out;
}

export function levelUpMovesAtOrBelowLevel(p: PokePokemon, level: number) {
  const candidates: { name: string; learnedAt: number }[] = [];

  for (const m of p.moves) {
    const best = m.version_group_details
      .filter((d) => d.move_learn_method.name === "level-up")
      .map((d) => d.level_learned_at)
      .filter((n) => n > 0 && n <= level)
      .sort((a, b) => b - a)[0];

    if (best !== undefined) candidates.push({ name: m.move.name, learnedAt: best });
  }

  candidates.sort((a, b) => b.learnedAt - a.learnedAt);

  const seen = new Set<string>();
  return candidates.filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
}

export async function autoPick4Moves(p: PokePokemon, level: number): Promise<MoveSummary[]> {
  const eligible = levelUpMovesAtOrBelowLevel(p, level).slice(0, 4);

  const details = await Promise.all(
    eligible.map(async (m) => {
      const mv = await fetchMoveByName(m.name);
      return {
        name: mv.name,
        power: mv.power,
        accuracy: mv.accuracy,
        pp: mv.pp,
        type: mv.type.name,
        damageClass: mv.damage_class.name,
        learnedAt: m.learnedAt,
        powerDice: mv.power == null ? null : diceTier(mv.power),
        accuracy: mv.accuracy,
        accuracyDc: accuracyToDC(mv.accuracy),
        flavorText: pickMoveHoverText(mv)
      } satisfies MoveSummary;
    })
  );

  return details;
}

const ALL_TYPES = [
  "normal","fire","water","electric","grass","ice","fighting","poison","ground",
  "flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy",
] as const;

type PokeType = {
  name: string;
  damage_relations: {
    double_damage_from: { name: string }[];
    half_damage_from: { name: string }[];
    no_damage_from: { name: string }[];
  };
};

export async function fetchTypeByName(name: string): Promise<PokeType> {
  const res = await fetch(`${POKEAPI}/type/${encodeURIComponent(name.toLowerCase())}`, {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`PokéAPI type fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Returns a map of attackingType -> multiplier (0, 0.25, 0.5, 1, 2, 4)
 * for a Pokémon with the given defender types.
 */
export async function computeTypeMatchups(defenderTypes: string[]) {
  const mult: Record<string, number> = {};
  for (const t of ALL_TYPES) mult[t] = 1;

  // Combine relations by multiplying across the defender's types
  const typeData = await Promise.all(defenderTypes.map(fetchTypeByName));

  for (const td of typeData) {
    for (const a of td.damage_relations.double_damage_from) mult[a.name] = (mult[a.name] ?? 1) * 2;
    for (const a of td.damage_relations.half_damage_from) mult[a.name] = (mult[a.name] ?? 1) * 0.5;
    for (const a of td.damage_relations.no_damage_from) mult[a.name] = 0;
  }

  // If something became 0 due to immunity, keep it 0 even if other type would multiply it
  // (the loop above already sets to 0; but multiplication might have happened earlier)
  for (const k of Object.keys(mult)) {
    if (mult[k] === 0) continue;
    // normalize floating rounding artifacts like 0.2500000000004
    const v = mult[k];
    mult[k] = Math.round(v * 100) / 100;
  }

  return mult;
}

export function pickMoveHoverText(mv: PokeMove): string | null {
  // Prefer short_effect (cleaner text), fallback to flavor text.
  const short = mv.effect_entries?.find((e) => e.language.name === "en")?.short_effect;
  if (short) return short.replace(/\$effect_chance/g, "").trim();

  const flavor = mv.flavor_text_entries?.find((e) => e.language.name === "en")?.flavor_text;
  if (!flavor) return null;

  return flavor.replace(/\f/g, " ").trim();
}
