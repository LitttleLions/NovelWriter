import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RomanForge AI – Dein Roman, ein Klick",
  description: "Generiere komplette, stilgetreue Romane aus Summary, Charakteren und Outline – Kapitel für Kapitel, voll editierbar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
