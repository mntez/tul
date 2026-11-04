import { PROFILE_BY_ID } from "./profile-catalog";
import { applyFilmProfile } from "./profile-effects";
import { applyFilmLook } from "./film-processing";
import { getProfileModuleId, parseFilmSettings, type FilmLookSettings, type FilmModuleId } from "./film-settings";

interface ProfileWorkRequest {
  data: ArrayBuffer;
  width: number;
  height: number;
  layers: { presetId: string; intensity: number }[];
  settings: FilmLookSettings;
}

interface ProfileWorkResponse {
  data: ArrayBuffer;
  width: number;
  height: number;
}

const workerScope = self as unknown as {
  addEventListener(type: "message", listener: (event: MessageEvent<ProfileWorkRequest>) => void): void;
  postMessage(message: ProfileWorkResponse, transfer: Transferable[]): void;
};

workerScope.addEventListener("message", (event) => {
  const { data, width, height, layers } = event.data;
  if (!(data instanceof ArrayBuffer) || width < 1 || height < 1 || data.byteLength !== width * height * 4) return;
  let image = new ImageData(new Uint8ClampedArray(data), width, height);
  const settings = parseFilmSettings(event.data.settings);
  const intensities: Partial<Record<FilmModuleId, number>> = {};
  for (const layer of layers) {
    const profile = PROFILE_BY_ID.get(layer.presetId);
    if (!profile || !Number.isFinite(layer.intensity)) continue;
    const familyModule = getProfileModuleId(profile.family);
    if (familyModule && settings[familyModule].enabled === true) {
      const previous = intensities[familyModule] ?? 0;
      const amount = Math.max(0, Math.min(100, layer.intensity)) / 100;
      intensities[familyModule] = 1 - (1 - previous) * (1 - amount);
      continue;
    }
    image = applyFilmProfile(image, profile, layer.intensity);
  }
  image = applyFilmLook(image, settings, intensities);
  const output = image.data.buffer.slice(0) as ArrayBuffer;
  workerScope.postMessage({ data: output, width, height }, [output]);
});

