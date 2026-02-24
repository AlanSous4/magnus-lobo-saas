// app/dashboard/produtos-mais-vendidos/page.tsx

import ProdutosMaisVendidosClient from "./produtos-mais-vendidos-client"

export const metadata = {
  title: "Produtos Mais Vendidos",
  viewport: { width: "device-width", initialScale: 1, themeColor: "#ffffff" },
}

export default function ProdutosMaisVendidosPage() {
  return <ProdutosMaisVendidosClient />
}