import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  // ✅ BASE REAL DO PROJETO (ESSENCIAL PARA OG/TWITTER)
  metadataBase: new URL("https://v0-padaria-system.vercel.app"),

  title: {
    default: "Padaria Lanchonete Magnus Lobo - Sistema de Gestão",
    template: "%s | Magnus Lobo",
  },

  description:
    "Sistema completo de vendas, controle de estoque e gestão para padarias e lanchonetes",

  // ✅ SEO OK, sem forçar preview global
  robots: {
    index: true,
    follow: true,
  },

  // ❗ NÃO DEFINIMOS openGraph AQUI
  // Cada página (ex: /preview) controla seu próprio OG
  // Isso evita conflito e cache errado no WhatsApp
}

// 🔹 Viewport (Next 15+ correto aqui)
export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geist.className} ${geistMono.className} font-sans antialiased`}
      >
        {children}

        {/* Analytics */}
        <Analytics />

        {/* 🔥 Service Worker (mantido, sem alteração) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker
                    .register('/sw.js')
                    .then(() => console.log('✅ SW registrado'))
                    .catch(err => console.log('❌ SW erro:', err))
                })
              }
            `,
          }}
        />
      </body>
    </html>
  )
}