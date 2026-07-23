import type { Metadata } from "next";
import localFont from "next/font/local";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const geistPixel = localFont({
  variable: "--font-pixel",
  src: "../public/fonts/GeistPixel-Square.ttf",
});

export const metadata: Metadata = {
  title: "tul — edit photos, have fun",
  description: "Upload a photo. Pick a look. Done.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${geistPixel.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
