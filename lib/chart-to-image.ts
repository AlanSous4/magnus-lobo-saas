import * as htmlToImage from "html-to-image"

export async function chartToPng(
  elementId: string
): Promise<string> {
  const node = document.getElementById(elementId)

  if (!node) {
    throw new Error("Gráfico não encontrado")
  }

  return await htmlToImage.toPng(node, {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
  })
}
