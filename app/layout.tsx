import type React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geist.className} antialiased`}
      >
        {children}
        <Analytics />

        {/* 🔥 Registro manual do Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function() { console.log('✅ SW registrado'); })
                    .catch(function(err) { console.log('❌ SW erro:', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}