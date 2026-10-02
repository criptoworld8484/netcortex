import type { Metadata } from "next";
import { Sora, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: { default: "NetCortex", template: "%s · NetCortex" },
  description: "Personal network troubleshooting brain: cases, error KB, log analyzer.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${plexMono.variable}`}>
      <body className="min-h-screen font-sans text-fg antialiased">{children}</body>
    </html>
  );
}
