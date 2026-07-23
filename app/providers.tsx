"use client";

import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <Theme theme={neutralTheme}>{children}</Theme>;
}
