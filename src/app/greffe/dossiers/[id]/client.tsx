"use client"

import { Button } from "@/components/ui/button"

// qrcode.react utilise des hooks : il doit être rendu côté client.
export { QRCodeSVG } from "qrcode.react"

export function BoutonImprimer() {
  return <Button onClick={() => window.print()}>Imprimer</Button>
}
