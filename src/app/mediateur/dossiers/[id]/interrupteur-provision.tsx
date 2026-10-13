"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import { changerProvision } from "./actions"

export function InterrupteurProvision({
  dossierId,
  initial,
  desactive = false,
}: {
  dossierId: string
  initial: boolean
  desactive?: boolean
}) {
  const [consignee, setConsignee] = useState(initial)
  const [enCours, startTransition] = useTransition()

  function changer(valeur: boolean) {
    setConsignee(valeur)
    startTransition(async () => {
      const { erreur } = await changerProvision(dossierId, valeur)
      if (erreur) {
        setConsignee(!valeur)
        toast.error(erreur)
      }
    })
  }

  return (
    <Label className="flex items-center gap-3">
      <Switch checked={consignee} onCheckedChange={changer} disabled={enCours || desactive} />
      Provision consignée
    </Label>
  )
}
