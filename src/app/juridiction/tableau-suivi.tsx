"use client"

import { DownloadIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { BadgeIssue, BadgeStatut } from "@/components/dsfr/statut-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LIBELLES_ISSUE, LIBELLES_MODE, LIBELLES_STATUT, trierParties } from "@/lib/statuts"
import type { Enums } from "@/lib/supabase/database.types"

import {
  exporterCsv,
  formaterNombre,
  indicateurs,
  joursEcoules,
  libelleChoix,
  nombreReponses,
  sansReponseDepuis7Jours,
  type DossierSuivi,
} from "./calculs"

const TOUS = "tous"

export function TableauSuivi({
  dossiers,
  maintenant,
}: {
  dossiers: DossierSuivi[]
  // Heure de la requête, fournie par le serveur (pas de Date.now() au rendu)
  maintenant: number
}) {
  const [mode, setMode] = useState<Enums<"mode_amiable"> | typeof TOUS>(TOUS)
  const [statut, setStatut] = useState<Enums<"statut_dossier"> | typeof TOUS>(TOUS)
  const [issue, setIssue] = useState<Enums<"issue_dossier"> | typeof TOUS>(TOUS)
  const [sansReponse, setSansReponse] = useState(false)

  const affiches = dossiers.filter(
    (dossier) =>
      (mode === TOUS || dossier.mode === mode) &&
      (statut === TOUS || dossier.statut === statut) &&
      (issue === TOUS || dossier.issue === issue) &&
      (!sansReponse || sansReponseDepuis7Jours(dossier, maintenant))
  )
  const filtre = mode !== TOUS || statut !== TOUS || issue !== TOUS || sansReponse
  const chiffres = indicateurs(affiches)

  function reinitialiser() {
    setMode(TOUS)
    setStatut(TOUS)
    setIssue(TOUS)
    setSansReponse(false)
  }

  function telecharger() {
    const csv = exporterCsv(affiches, maintenant)
    const lien = document.createElement("a")
    lien.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    lien.download = `dossiers-${new Date(maintenant).toISOString().slice(0, 10)}.csv`
    lien.click()
    URL.revokeObjectURL(lien.href)
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="titre-indicateurs" className="flex flex-col gap-3">
        <h2 id="titre-indicateurs" className="text-lg font-bold">
          Indicateurs{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({filtre ? "dossiers affichés" : "tous les dossiers"})
          </span>
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Indicateur libelle="Dossiers en cours" valeur={String(chiffres.enCours)} />
          <Indicateur
            libelle="Taux de réponse des parties"
            valeur={chiffres.tauxReponse === null ? "—" : `${Math.round(chiffres.tauxReponse * 100)} %`}
            precision={`${chiffres.partiesRepondu} parties sur ${chiffres.partiesTotal}`}
          />
          <Indicateur libelle="Refus" valeur={String(chiffres.refus)} precision="dossiers avec un refus" />
          <Indicateur libelle="Carences" valeur={String(chiffres.carences)} />
          <Indicateur
            libelle="Accords"
            valeur={String(chiffres.accords)}
            precision={chiffres.accordsPartiels > 0 ? `dont ${chiffres.accordsPartiels} partiel(s)` : undefined}
          />
          <Indicateur
            libelle="Délai moyen ordonnance → 1er rendez-vous"
            valeur={chiffres.delaiMoyenRdv === null ? "—" : `${formaterNombre(chiffres.delaiMoyenRdv)} j`}
          />
        </ul>
      </section>

      <section aria-labelledby="titre-dossiers" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="titre-dossiers" className="text-lg font-bold">
            Dossiers{" "}
            <span className="text-sm font-normal text-muted-foreground" aria-live="polite">
              ({affiches.length} sur {dossiers.length})
            </span>
          </h2>
          <Button variant="outline" onClick={telecharger} disabled={affiches.length === 0}>
            <DownloadIcon aria-hidden />
            Exporter en CSV
          </Button>
        </div>

        <fieldset className="flex flex-wrap items-end gap-4 rounded-sm bg-muted p-4">
          <legend className="sr-only">Filtres</legend>
          <Filtre id="filtre-mode" libelle="Mode" valeur={mode} onChange={setMode} options={LIBELLES_MODE} />
          <Filtre id="filtre-statut" libelle="Statut" valeur={statut} onChange={setStatut} options={LIBELLES_STATUT} />
          <Filtre id="filtre-issue" libelle="Issue" valeur={issue} onChange={setIssue} options={LIBELLES_ISSUE} />
          <Label className="flex h-10 cursor-pointer items-center gap-2 font-normal">
            <Checkbox checked={sansReponse} onCheckedChange={setSansReponse} />
            Sans réponse depuis plus de 7 jours
          </Label>
          {filtre && (
            <Button variant="ghost" onClick={reinitialiser}>
              Réinitialiser les filtres
            </Button>
          )}
        </fieldset>

        {affiches.length === 0 ? (
          <p className="text-muted-foreground">Aucun dossier ne correspond à ces filtres.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° RG</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Intervenant(s)</TableHead>
                <TableHead>Réponses</TableHead>
                <TableHead>Choix des parties</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead className="text-right">Jours écoulés</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {affiches.map((dossier) => {
                const jours = joursEcoules(dossier, maintenant)
                const enRetard = sansReponseDepuis7Jours(dossier, maintenant)
                return (
                  <TableRow key={dossier.id} className="align-top">
                    <TableCell className="font-bold">
                      <Link href={`/juridiction/dossiers/${dossier.id}`} className="text-primary underline">
                        {dossier.numero_rg}
                      </Link>
                    </TableCell>
                    <TableCell>{LIBELLES_MODE[dossier.mode]}</TableCell>
                    <TableCell className="whitespace-normal">
                      {dossier.mediateur?.nom ?? "—"}
                      {dossier.co_mediateur && (
                        <span className="block text-sm text-muted-foreground">
                          avec {dossier.co_mediateur.nom}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {nombreReponses(dossier)}/{dossier.parties.length}
                    </TableCell>
                    <TableCell className="min-w-56 whitespace-normal">
                      <ul className="flex flex-col gap-0.5 text-sm">
                        {trierParties(dossier.parties).map((partie) => (
                          <li key={partie.id}>
                            {partie.prenom} {partie.nom} :{" "}
                            <span className="text-muted-foreground">{libelleChoix(partie, dossier.mode)}</span>
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>
                      <BadgeStatut statut={dossier.statut} />
                    </TableCell>
                    <TableCell>
                      <BadgeIssue issue={dossier.issue} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={enRetard ? "font-bold text-destructive" : undefined}>{jours} j</span>
                      {enRetard && <span className="block text-xs text-destructive">sans réponse</span>}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}

function Indicateur({ libelle, valeur, precision }: { libelle: string; valeur: string; precision?: string }) {
  return (
    <li>
      <Card size="sm" className="h-full">
        <CardContent className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-primary">{valeur}</span>
          <span className="text-sm font-medium">{libelle}</span>
          {precision && <span className="text-xs text-muted-foreground">{precision}</span>}
        </CardContent>
      </Card>
    </li>
  )
}

function Filtre<T extends string>({
  id,
  libelle,
  valeur,
  onChange,
  options,
}: {
  id: string
  libelle: string
  valeur: T | typeof TOUS
  onChange: (valeur: T | typeof TOUS) => void
  options: Record<T, string>
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{libelle}</Label>
      <NativeSelect
        id={id}
        value={valeur}
        onChange={(event) => onChange(event.target.value as T | typeof TOUS)}
        className="min-w-44 bg-background"
      >
        <NativeSelectOption value={TOUS}>Tous</NativeSelectOption>
        {(Object.entries(options) as [T, string][]).map(([cle, texte]) => (
          <NativeSelectOption key={cle} value={cle}>
            {texte}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
