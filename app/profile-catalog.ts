import bloomIndex from "../tultul/profiles/bloom/index_film.json";
import dirtIndex from "../tultul/profiles/damage/index_dirt.json";
import photoDirtIndex from "../tultul/profiles/damage/index_photo_dirt.json";
import filmBreathIndex from "../tultul/profiles/film_breath/index_film.json";
import gateWeaveIndex from "../tultul/profiles/gate_weave/index_film.json";
import grainIndex from "../tultul/profiles/grain/index_film.json";
import halationIndex from "../tultul/profiles/halation/index_film.json";
import type { EffectLayer } from "./types";

export type ProfileFamily = "bloom" | "dirt" | "photo-dirt" | "film_breath" | "gate_weave" | "grain" | "halation";

export interface FilmProfile {
  id: string;
  name: string;
  family: ProfileFamily;
  category: string;
  sourceId: string;
  settings: Record<string, unknown>;
}

export interface ProfileGroup {
  id: ProfileFamily;
  name: string;
  profiles: FilmProfile[];
}

const FAMILY_NAMES: Record<ProfileFamily, string> = {
  bloom: "Bloom",
  dirt: "Dirt",
  "photo-dirt": "Photo Dirt",
  film_breath: "Film Breath",
  gate_weave: "Gate Weave",
  grain: "Grain",
  halation: "Halation",
};

type RawIndexEntry = { name?: unknown; id?: unknown; profile?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function readProfiles(source: unknown, key: string, family: ProfileFamily, category: string): FilmProfile[] {
  if (!isRecord(source) || !isRecord(source[key]) || !Array.isArray(source[key].profiles)) return [];
  const profiles: FilmProfile[] = [];
  for (const entry of source[key].profiles) {
    if (!isRecord(entry)) continue;
    const raw = entry as RawIndexEntry;
    if (typeof raw.id !== "string" || typeof raw.name !== "string" || !isRecord(raw.profile) || !isJsonValue(raw.profile)) continue;
    profiles.push({
      id: `${family}:${raw.id}`,
      name: raw.name,
      family,
      category,
      sourceId: raw.id,
      settings: raw.profile,
    });
  }
  return profiles;
}

export const PROFILE_GROUPS: ProfileGroup[] = [
  { id: "bloom", name: FAMILY_NAMES.bloom, profiles: readProfiles(bloomIndex, "film", "bloom", "Film") },
  { id: "dirt", name: FAMILY_NAMES.dirt, profiles: readProfiles(dirtIndex, "dirt", "dirt", "Film") },
  { id: "photo-dirt", name: FAMILY_NAMES["photo-dirt"], profiles: readProfiles(photoDirtIndex, "dirt", "photo-dirt", "Photo") },
  { id: "film_breath", name: FAMILY_NAMES.film_breath, profiles: readProfiles(filmBreathIndex, "film", "film_breath", "Film") },
  { id: "gate_weave", name: FAMILY_NAMES.gate_weave, profiles: readProfiles(gateWeaveIndex, "film", "gate_weave", "Film") },
  { id: "grain", name: FAMILY_NAMES.grain, profiles: readProfiles(grainIndex, "film", "grain", "Film") },
  { id: "halation", name: FAMILY_NAMES.halation, profiles: readProfiles(halationIndex, "film", "halation", "Film") },
];

export const PROFILE_CATALOG: FilmProfile[] = PROFILE_GROUPS.flatMap((group) => group.profiles);
export const PROFILE_BY_ID = new Map(PROFILE_CATALOG.map((profile) => [profile.id, profile]));

export function parseStoredProfileLayers(value: unknown): EffectLayer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): EffectLayer[] => {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.presetId !== "string" ||
        !PROFILE_BY_ID.has(entry.presetId) || typeof entry.enabled !== "boolean" ||
        typeof entry.intensity !== "number" || !Number.isFinite(entry.intensity)) return [];
    return [{
      id: entry.id,
      presetId: entry.presetId,
      intensity: Math.max(0, Math.min(100, entry.intensity)),
      enabled: entry.enabled,
      locked: typeof entry.locked === "boolean" ? entry.locked : false,
    }];
  });
}

