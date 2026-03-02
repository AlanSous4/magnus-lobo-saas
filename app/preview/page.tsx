import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  // ✅ BASE ABSOLUTA (OBRIGATÓRIO)
  metadataBase: new URL("https://v0-padaria-system.vercel.app"),

  title: "Sistema de Padaria | Magnus Lobo",
  description:
    "Sistema completo de controle de vendas, estoque e faturamento para padarias e lanchonetes",

  robots: {
    index: true,
    follow: true,
  },

  // ✅ OPEN GRAPH (WhatsApp / Facebook)
  openGraph: {
    title: "Sistema de Padaria | Magnus Lobo",
    description:
      "Gerencie vendas, produtos, estoque e faturamento em um único sistema",
    url: "https://v0-padaria-system.vercel.app/preview",
    siteName: "Sistema de Padaria Magnus Lobo",
    images: [
      {
        // ✅ URL ABSOLUTA DA IMAGEM
        url: "https://v0-padaria-system.vercel.app/preview-dashboard.png",
        width: 1200,
        height: 630,
        alt: "Dashboard do Sistema de Padaria Magnus Lobo",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },

  // ✅ TWITTER (X)
  twitter: {
    card: "summary_large_image",
    title: "Sistema de Padaria | Magnus Lobo",
    description:
      "Sistema completo para controle de vendas e estoque em padarias",
    images: [
      "https://v0-padaria-system.vercel.app/preview-dashboard.png",
    ],
  },
}

export default function PreviewPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Card className="max-w-xl w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            Sistema de Padaria – Magnus Lobo
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Controle vendas, estoque, produtos e faturamento em um sistema
            simples e eficiente, feito para padarias e lanchonetes.
          </p>

          {/* Imagem VISUAL (não interfere no OG) */}
          <img
            src="/preview-dashboard.png"
            alt="Preview do Dashboard"
            className="rounded-lg border"
          />

          <Button asChild className="w-full" size="lg">
            <Link href="/login">Acessar sistema</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}