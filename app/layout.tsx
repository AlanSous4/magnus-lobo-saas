import type React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import InstallPWAButton from "@/components/InstallPWAButton";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Padaria Lanchonete Magnus Lobo - Sistema de Gestão",
  description: "Sistema completo de vendas e gestão de estoque para padaria",
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // Essencial para o PWA preencher a barra de status
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* suppressHydrationWarning é essencial para evitar erros de console com temas */
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo-padaria-192.png" type="image/png" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"   // 👈 Força o início no modo claro
          enableSystem={false}    // 👈 Ignora o tema do sistema operacional
          disableTransitionOnChange
        >
          {children}

          {/* Botão de instalação PWA */}
          <InstallPWAButton />

          <Analytics />
        </ThemeProvider>

        {/* Registro manual do Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function() { console.log('✅ Service Worker registrado'); })
                    .catch(function(err) { console.error('❌ Erro ao registrar Service Worker:', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}