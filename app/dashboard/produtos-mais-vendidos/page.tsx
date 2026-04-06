// app/dashboard/produtos-mais-vendidos/page.tsx

import ProdutosMaisVendidosClient from "./produtos-mais-vendidos-client"

// 1. Metadata agora só cuida do SEO (Título, Descrição, etc)
export const metadata = {
  title: "Produtos Mais Vendidos",
}

// 2. Viewport agora é uma exportação SEPARADA (Isso remove o erro da Vercel)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
}

export default function ProdutosMaisVendidosPage() {
  return <ProdutosMaisVendidosClient />
}