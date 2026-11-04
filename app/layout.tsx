import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import localFont from "next/font/local";
import Providers from "./providers";
import "./globals.css";

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
      className={geistPixel.variable}
      suppressHydrationWarning
    >
      <body>
        <ClerkProvider appearance={{ elements: { footer: { display: "none" }, userButtonPopoverFooter: { display: "none" } } }}>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}