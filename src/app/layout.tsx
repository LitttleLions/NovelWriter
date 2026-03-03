import type { Metadata } from "next";
import Script from "next/script";
import { AuthInterceptor } from "@/components/auth-interceptor";
import "./globals.css";

export const metadata: Metadata = {
  title: "RomanForge AI – Dein Roman, ein Klick",
  description: "Generiere komplette, stilgetreue Romane aus Summary, Charakteren und Outline – Kapitel für Kapitel, voll editierbar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark" suppressHydrationWarning>
      <head>
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <AuthInterceptor />
        {children}
      </body>
    </html>
  );
}
