import type { FilmLookSettings } from "./film-settings";

export interface EffectLayer {
  id: string;
  presetId: string;
  intensity: number;
  enabled: boolean;
  locked?: boolean;
}

export interface SavedPreset {
  id: string;
  name: string;
  layers: { presetId: string; intensity: number }[];
  filmSettings?: FilmLookSettings;
}

export interface CurrentImage {
  src: string;
  name: string;
}

export type ScreenId = "onboarding" | "auth" | "home" | "editor";
export type ResetStep = "email" | "code" | "password";
