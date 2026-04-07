import type React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import InstallPWAButton from "@/components/InstallPWAButton";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });
// ... seus outros imports (fonts, analytics, etc)

export const metadata: Metadata = {
  title: "",
  description: "Sistema completo de vendas e gestão de estoque para padaria",
  // Adicionando suporte básico para iOS aqui também
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Magnus Lobo",
  },
};

// 1. Garantindo o objeto Viewport (Padrão Next.js 14/15)
export const viewport: Viewport = {
  themeColor: "#EA580C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Impede o zoom indesejado em inputs no mobile
  viewportFit: "cover", // Força o app a ocupar a tela toda, incluindo a barra de status
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* 2. Meta tags de reforço para Android e iOS */}
        <meta name="theme-color" content="#EA580C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Garante que o navegador não tente "adivinhar" as cores */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo-padaria-192.png" type="image/png" />
      </head>
      
      <body className="antialiased overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* 3. A classe pb-safe e pt-safe ajuda a não cortar botões no topo/rodapé */}
          <main className="min-h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {children}
          </main>

          <InstallPWAButton />
          <Analytics />
        </ThemeProvider>

        {/* Seu script de Service Worker continua igual abaixo */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function() { console.log('✅ SW registrado'); })
                    .catch(function(err) { console.error('❌ Erro SW:', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}