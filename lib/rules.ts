export type StatKey =
  | "hp"
  | "attack"
  | "defense"
  | "special-attack"
  | "special-defense"
  | "speed";

export function diceTier(value: number): number {
  if (value <= 40) return 1;
  if (value <= 60) return 2;
  if (value <= 80) return 3;
  if (value <= 99) return 4;
  if (value <= 110) return 5;
  if (value <= 120) return 6;
  if (value <= 130) return 7;
  if (value <= 140) return 8;
  if (value <= 150) return 9;
  return 10;
}

export function accuracyToDC(acc: number | null | undefined): number | null {
  if (acc == null) return null;

  // clamp 0..100
  const a = Math.max(0, Math.min(100, Math.trunc(acc)));

  // round DOWN to nearest 10 (85 -> 80)
  const rounded = Math.floor(a / 10) * 10;

  // handle 0..9 as 0 -> DC 21 (optional). If you prefer DC 19 minimum, clamp at 10.
  if (rounded < 10) return 21;

  return 21 - rounded / 5;
}


// KP = (scaled HP value) * 5 + 10
export function computeDiceStats(
  baseStats: Record<StatKey, number>,
  statMods: Record<StatKey, number>
) {
  const dice: Record<StatKey, number> = {
    hp: 1,
    attack: 1,
    defense: 1,
    "special-attack": 1,
    "special-defense": 1,
    speed: 1,
  };

  (Object.keys(dice) as StatKey[]).forEach((k) => {
    const baseTier = diceTier(baseStats[k] ?? 0);     // tier from base stat
    const mod = statMods[k] ?? 0;                     // modifier is tier modifier
    const finalTier = baseTier + mod;
    dice[k] = Math.max(1, finalTier);                 // never below 1
  });

  const scaledHp = dice.hp;
  const hpMax = scaledHp * 5 + 10;

  return { diceStats: dice, scaledHp, hpMax };
}
