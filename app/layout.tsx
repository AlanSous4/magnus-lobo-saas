import type React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import InstallPWAButton from "@/components/InstallPWAButton";
import { ThemeProvider } from "@/components/theme-provider";
import { SyncInitializer } from "@/components/sync-initializer"; 
// Importação corrigida do componente de registro
import RegisterSW from "@/app/register-sw"; 

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Magnus Lobo",
  description: "Sistema completo de vendas e gestão de estoque para padaria",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Magnus Lobo",
  },
};

export const viewport: Viewport = {
  themeColor: "#EA580C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#EA580C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo-padaria-192.png" type="image/png" />
      </head>
      
      <body className="antialiased overflow-x-hidden">
        {/* O RegisterSW detecta e aplica atualizações automaticamente */}
        <RegisterSW />

        <SyncInitializer />

        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <main className="min-h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {children}
          </main>

          <InstallPWAButton />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}