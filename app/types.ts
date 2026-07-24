export interface EffectLayer {
  id: string;
  presetId: string;
  intensity: number;
  enabled: boolean;
}

export interface UserPreset {
  id: string;
  name: string;
  filters: Record<string, number>;
}

export interface SavedPreset {
  id: string;
  name: string;
  layers: { presetId: string; intensity: number }[];
}

export interface CurrentImage {
  src: string;
  name: string;
}

export type ScreenId = "onboarding" | "auth" | "home" | "editor";
export type ResetStep = "email" | "code" | "password";
