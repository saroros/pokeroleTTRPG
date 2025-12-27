"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { z } from "zod";
import { computeDiceStats, StatKey, diceTier, accuracyToDC } from "@/lib/rules";
import {
  autoPick4Moves,
  extractBaseStats,
  fetchMoveByName,
  fetchPokemonByName,
  levelUpMovesAtOrBelowLevel,
  computeTypeMatchups,
  pickMoveHoverText,
} from "@/lib/pokeapi";
import { PokemonStatus } from "@prisma/client";
import crypto from "crypto";
import { redirect } from "next/navigation";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
export async function deleteTrainer(formData: FormData) {
  const schema = z.object({
    trainerSlug: z.string().min(1),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
  });

  // Alles in einer Transaktion: erst Pokémon löschen, dann Trainer
  await db.$transaction(async (tx) => {
    const trainer = await tx.trainer.findUniqueOrThrow({
      where: { slug: p.trainerSlug },
      select: { id: true, slug: true },
    });

    await tx.pokemonInstance.deleteMany({
      where: { trainerId: trainer.id },
    });

    await tx.trainer.delete({
      where: { slug: p.trainerSlug },
    });
  });

  revalidatePath("/");
  revalidatePath("/dm");
}

function revalidateTrainerPages(trainerSlug: string) {
  revalidatePath(`/trainer/${trainerSlug}`);
  revalidatePath("/");
  revalidatePath("/dm");
}

export async function createTrainer(formData: FormData): Promise<void> {
  const schema = z.object({
    name: z.string().min(1),
    money: z.coerce.number().int().min(0).default(0),
    itemsNote: z.string().default(""),
  });

  const parsed = schema.parse({
    name: formData.get("name"),
    money: formData.get("money"),
    itemsNote: formData.get("itemsNote"),
  });

  const baseSlug = slugify(parsed.name) || "trainer";
  const editKey = crypto.randomUUID();
  const uniqueSlug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;

  const trainer = await db.trainer.create({
    data: {
      name: parsed.name,
      slug: uniqueSlug,
      editKey,
      money: parsed.money,
      itemsNote: parsed.itemsNote,
    },
  });

  // Home/DM Liste aktualisieren (optional)
  revalidatePath("/");
  revalidatePath("/dm");

  // direkt zur Trainerseite
  redirect(`/trainer/${trainer.slug}`);
}


export async function addPokemonToTrainer(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    speciesName: z.string().min(1),
    level: z.coerce.number().int().min(1).max(100).default(5),
    status: z.enum(["ACTIVE", "BOX", "DEAD"]).default("BOX"),
    nickname: z.string().default(""),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    speciesName: formData.get("speciesName"),
    level: formData.get("level"),
    status: formData.get("status"),
    nickname: formData.get("nickname"),
  });

  const trainer = await db.trainer.findUnique({ where: { slug: p.trainerSlug } });
  if (!trainer) throw new Error("Trainer not found");

  const poke = await fetchPokemonByName(p.speciesName);
  const types = (poke.types ?? [])
  .sort((a, b) => a.slot - b.slot)
  .map((t) => t.type.name);

const typeMatchups = await computeTypeMatchups(types);

  const baseStats = extractBaseStats(poke);

  const emptyMods: Record<StatKey, number> = {
    hp: 0,
    attack: 0,
    defense: 0,
    "special-attack": 0,
    "special-defense": 0,
    speed: 0,
  };

  const { diceStats, scaledHp, hpMax } = computeDiceStats(baseStats, emptyMods);
  const moves = await autoPick4Moves(poke, p.level);
  const availableMoves = levelUpMovesAtOrBelowLevel(poke, p.level);

  const created = await db.pokemonInstance.create({
    data: {
      trainerId: trainer.id,
      status: p.status as PokemonStatus,
      speciesId: poke.id,
      speciesName: poke.name,
      nickname: p.nickname,
      level: p.level,
      spriteUrl: poke.sprites?.front_default ?? "",
      baseStats,
      statMods: emptyMods,
      diceStats,
      scaledHp,
      hpMax,
      hpCurrent: hpMax,
      moves,
      availableMoves, 
      types,
      typeMatchups,
    },
  });

  revalidateTrainerPages(p.trainerSlug);
}

export async function movePokemonStatus(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    pokemonId: z.string().min(1),
    status: z.enum(["ACTIVE", "BOX", "DEAD"]),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    pokemonId: formData.get("pokemonId"),
    status: formData.get("status"),
  });

  // enforce max 6 ACTIVE
  if (p.status === "ACTIVE") {
    const trainer = await db.trainer.findUniqueOrThrow({ where: { slug: p.trainerSlug } });
    const activeCount = await db.pokemonInstance.count({
      where: { trainerId: trainer.id, status: "ACTIVE" },
    });
    const current = await db.pokemonInstance.findUniqueOrThrow({ where: { id: p.pokemonId } });
    if (current.status !== "ACTIVE" && activeCount >= 6) {
      throw new Error("Party already has 6 Pokémon.");
    }
  }

  const updated = await db.pokemonInstance.update({
    where: { id: p.pokemonId },
    data: { status: p.status as PokemonStatus },
  });

  revalidateTrainerPages(p.trainerSlug);
}

export async function updateStatModifier(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    pokemonId: z.string().min(1),
    statKey: z.enum(["hp", "attack", "defense", "special-attack", "special-defense", "speed"]),
    modValue: z.coerce.number().int(),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    pokemonId: formData.get("pokemonId"),
    statKey: formData.get("statKey"),
    modValue: formData.get("modValue"),
  });

  const mon = await db.pokemonInstance.findUniqueOrThrow({ where: { id: p.pokemonId } });

  const oldHpMax = mon.hpMax;
  const oldHpCurrent = mon.hpCurrent;

  const baseStats = mon.baseStats as any;
  const statMods = { ...(mon.statMods as any) };
  statMods[p.statKey] = p.modValue;

  const { diceStats, scaledHp, hpMax } = computeDiceStats(baseStats, statMods);

  const nextHpCurrent =
    oldHpCurrent === oldHpMax ? hpMax : Math.min(oldHpCurrent, hpMax);

  const updated = await db.pokemonInstance.update({
    where: { id: mon.id },
    data: { statMods, diceStats, scaledHp, hpMax, hpCurrent: nextHpCurrent },
  });

  revalidateTrainerPages(p.trainerSlug);
}

export async function updateHpCurrent(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    pokemonId: z.string().min(1),
    hpCurrent: z.coerce.number().int(),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    pokemonId: formData.get("pokemonId"),
    hpCurrent: formData.get("hpCurrent"),
  });

  const mon = await db.pokemonInstance.findUniqueOrThrow({ where: { id: p.pokemonId } });
  const capped = Math.max(0, Math.min(p.hpCurrent, mon.hpMax));

  const updated = await db.pokemonInstance.update({
    where: { id: mon.id },
    data: { hpCurrent: capped },
  });

  revalidateTrainerPages(p.trainerSlug);
}

export async function updateLevel(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    pokemonId: z.string().min(1),
    level: z.coerce.number().int().min(1).max(100),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    pokemonId: formData.get("pokemonId"),
    level: formData.get("level"),
  });

  const mon = await db.pokemonInstance.findUniqueOrThrow({ where: { id: p.pokemonId } });
  const poke = await fetchPokemonByName(mon.speciesName);
  const availableMoves = levelUpMovesAtOrBelowLevel(poke, p.level);

  const updated = await db.pokemonInstance.update({
    where: { id: mon.id },
    data: { level: p.level, availableMoves },
  });

  revalidateTrainerPages(p.trainerSlug);
}

export async function addMoveManually(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    pokemonId: z.string().min(1),
    moveName: z.string().min(1),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    pokemonId: formData.get("pokemonId"),
    moveName: formData.get("moveName"),
  });

  const mon = await db.pokemonInstance.findUniqueOrThrow({ where: { id: p.pokemonId } });
  const currentMoves = (mon.moves as any[]) ?? [];
  if (currentMoves.length >= 4) throw new Error("Max 4 moves.");

  const mv = await fetchMoveByName(p.moveName);
    const hover = pickMoveHoverText(mv);

  const next = [
    ...currentMoves,
    {
      name: mv.name,
      power: mv.power,
      powerDice: mv.power == null ? null : diceTier(mv.power),
      accuracy: mv.accuracy,
      accuracyDc: accuracyToDC(mv.accuracy),
      pp: mv.pp,
      type: mv.type.name,
      damageClass: mv.damage_class.name,
      flavorText: hover,
    },
  ];

  const updated = await db.pokemonInstance.update({
    where: { id: mon.id },
    data: { moves: next },
  });

  revalidateTrainerPages(p.trainerSlug);
}


export async function removeMove(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    pokemonId: z.string().min(1),
    moveIndex: z.coerce.number().int().min(0).max(3),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    pokemonId: formData.get("pokemonId"),
    moveIndex: formData.get("moveIndex"),
  });

  const mon = await db.pokemonInstance.findUniqueOrThrow({ where: { id: p.pokemonId } });
  const currentMoves = (mon.moves as any[]) ?? [];
  const next = currentMoves.filter((_: any, i: number) => i !== p.moveIndex);

  const updated = await db.pokemonInstance.update({
    where: { id: mon.id },
    data: { moves: next },
  });

  revalidateTrainerPages(p.trainerSlug);
}

export async function deletePokemon(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    pokemonId: z.string().min(1),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    pokemonId: formData.get("pokemonId"),
  });

  const deleted = await db.pokemonInstance.delete({
    where: { id: p.pokemonId },
  });

  revalidateTrainerPages(p.trainerSlug);
}




export async function updateTrainerLevel(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    level: z.coerce.number().int().min(1).max(100),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    level: formData.get("level"),
  });

  const updated = await db.trainer.update({
    where: { slug: p.trainerSlug },
    data: { level: p.level },
  });

  revalidateTrainerPages(p.trainerSlug);
}

export async function incrementTrainerLevel(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
  });

  const updated = await db.trainer.update({
    where: { slug: p.trainerSlug },
    data: { level: { increment: 1 } },
  });

  revalidateTrainerPages(p.trainerSlug);
}

export async function updateTrainerItemsAndMoney(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    itemsNote: z.string().default(""),
    money: z.coerce.number().int(),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    itemsNote: formData.get("itemsNote"),
    money: formData.get("money"),
  });

  const updated = await db.trainer.update({
    where: { slug: p.trainerSlug },
    data: {
      itemsNote: p.itemsNote,
      money: p.money,
    },
  });

  revalidateTrainerPages(p.trainerSlug);
}
export async function updatePokemonCondition(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    pokemonId: z.string().min(1),
    condition: z.enum(["NONE", "BRN", "PAR", "PSN", "TOX", "SLP", "FRZ", "FNT"]),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    pokemonId: formData.get("pokemonId"),
    condition: formData.get("condition"),
  });

  await db.pokemonInstance.update({
    where: { id: p.pokemonId },
    data: { condition: p.condition as any },
  });

  revalidateTrainerPages(p.trainerSlug);
}

export async function updatePokemonNotes(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    pokemonId: z.string().min(1),
    notes: z.string().default(""),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    pokemonId: formData.get("pokemonId"),
    notes: formData.get("notes"),
  });

  await db.pokemonInstance.update({
    where: { id: p.pokemonId },
    data: { notes: p.notes },
  });

  revalidateTrainerPages(p.trainerSlug);
}



//Character Sheet
export async function saveCharacterSheet(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1),
    characterSheet: z.string().default("{}"),
    backstory: z.string().default(""),
    favoriteLegendary: z.string().default(""),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug"),
    characterSheet: formData.get("characterSheet"),
    backstory: formData.get("backstory"),
    favoriteLegendary: formData.get("favoriteLegendary"),
  });

  let sheet: any = {};
  try {
    sheet = JSON.parse(p.characterSheet || "{}");
  } catch {
    sheet = {};
  }

  const updated = await db.trainer.update({
    where: { slug: p.trainerSlug },
    data: {
      characterSheet: sheet,
      backstory: p.backstory,
      favoriteLegendary: p.favoriteLegendary,
    },
  });

  revalidateTrainerPages(p.trainerSlug);
}

//fight
export async function addPokemonToFight(formData: FormData): Promise<void> {
  const schema = z.object({
    trainerSlug: z.string().min(1).optional(),
    pokemonId: z.string().min(1),
  });

  const p = schema.parse({
    trainerSlug: formData.get("trainerSlug") ?? undefined,
    pokemonId: formData.get("pokemonId"),
  });

  await db.$transaction(async (tx) => {
    // schon drin? -> nichts tun
    const existing = await tx.fightEntry.findUnique({
      where: { pokemonId: p.pokemonId },
      select: { id: true },
    });
    if (existing) return;

    const max = await tx.fightEntry.aggregate({
      _max: { order: true },
    });

    const nextOrder = (max._max.order ?? 0) + 1;

    await tx.fightEntry.create({
      data: {
        pokemonId: p.pokemonId,
        order: nextOrder,
      },
    });
  });

  revalidatePath("/fight");
  if (p.trainerSlug) revalidateTrainerPages(p.trainerSlug);
}

export async function removeFightEntry(formData: FormData): Promise<void> {
  const schema = z.object({
    entryId: z.string().min(1),
  });

  const p = schema.parse({
    entryId: formData.get("entryId"),
  });

  await db.fightEntry.delete({ where: { id: p.entryId } });
  revalidatePath("/fight");
}

export async function reorderFightEntries(entryIds: string[]): Promise<void> {
  // Server Action mit serializable args (keine FormData nötig)
  await db.$transaction(
    entryIds.map((id, idx) =>
      db.fightEntry.update({
        where: { id },
        data: { order: idx + 1 },
      })
    )
  );

  revalidatePath("/fight");
}
