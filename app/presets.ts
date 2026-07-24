export const PRESETS = [
  { id: "original", name: "Original", filter: () => "none" },
  { id: "mono", name: "Mono", filter: (i: number) => `grayscale(${i}%) contrast(${100 + i * 0.15}%)` },
  { id: "noir", name: "Noir", filter: (i: number) => `grayscale(${i}%) contrast(${100 + i * 0.35}%) brightness(${100 - i * 0.1}%)` },
  { id: "warm", name: "Warm", filter: (i: number) => `sepia(${i * 0.4}%) saturate(${100 + i * 0.35}%) brightness(${100 + i * 0.05}%)` },
  { id: "cool", name: "Cool", filter: (i: number) => `hue-rotate(${i * 1.8}deg) saturate(${100 - i * 0.1}%) brightness(${100 + i * 0.08}%)` },
  { id: "fade", name: "Fade", filter: (i: number) => `contrast(${100 - i * 0.25}%) brightness(${100 + i * 0.15}%) saturate(${100 - i * 0.35}%)` },
  { id: "vivid", name: "Vivid", filter: (i: number) => `saturate(${100 + i * 0.6}%) contrast(${100 + i * 0.15}%)` },
];

export const PRESET_CATEGORIES = [
  { name: "B&W", ids: ["mono", "noir"] },
  { name: "Color", ids: ["warm", "cool", "vivid"] },
  { name: "Mood", ids: ["fade"] },
];
