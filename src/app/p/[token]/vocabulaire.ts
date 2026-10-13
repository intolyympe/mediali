import type { Enums } from "@/lib/supabase/database.types"

// Vocabulaire du parcours selon le mode du dossier (dossiers.mode).
export function vocabulaire(mode: Enums<"mode_amiable">) {
  return mode === "conciliation"
    ? {
        procedure: "conciliation",
        laProcedure: "la conciliation",
        tiers: "conciliateur",
        leTiers: "le conciliateur",
        auTiers: "au conciliateur",
      }
    : {
        procedure: "médiation",
        laProcedure: "la médiation",
        tiers: "médiateur",
        leTiers: "le médiateur",
        auTiers: "au médiateur",
      }
}

export type Vocabulaire = ReturnType<typeof vocabulaire>
