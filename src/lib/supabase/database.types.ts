// Types de la base, au format de `supabase gen types`.
// Pour les régénérer après une migration : npm run db:types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      mediateurs: {
        Row: {
          id: string
          nom: string
          email: string
          telephone: string | null
          fonction: Database["public"]["Enums"]["fonction_amiable"]
        }
        Insert: {
          id?: string
          nom: string
          email: string
          telephone?: string | null
          fonction?: Database["public"]["Enums"]["fonction_amiable"]
        }
        Update: {
          id?: string
          nom?: string
          email?: string
          telephone?: string | null
          fonction?: Database["public"]["Enums"]["fonction_amiable"]
        }
        Relationships: []
      }
      creneaux: {
        Row: {
          id: string
          mediateur_id: string
          debut: string
          fin: string
        }
        Insert: {
          id?: string
          mediateur_id: string
          debut: string
          fin: string
        }
        Update: {
          id?: string
          mediateur_id?: string
          debut?: string
          fin?: string
        }
        Relationships: [
          {
            foreignKeyName: "creneaux_mediateur_id_fkey"
            columns: ["mediateur_id"]
            isOneToOne: false
            referencedRelation: "mediateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers: {
        Row: {
          id: string
          numero_rg: string
          juridiction: string
          date_ordonnance: string
          mediateur_id: string | null
          provision_consignee: boolean
          statut: Database["public"]["Enums"]["statut_dossier"]
          rdv_creneau_id: string | null
          created_at: string
          mode: Database["public"]["Enums"]["mode_amiable"]
          co_mediateur_id: string | null
          rdv_format: Database["public"]["Enums"]["format_rdv"] | null
          rdv_lieu: Database["public"]["Enums"]["lieu_rdv"] | null
          issue: Database["public"]["Enums"]["issue_dossier"]
          compte_rendu: string | null
          cloture_le: string | null
        }
        Insert: {
          id?: string
          numero_rg: string
          juridiction: string
          date_ordonnance: string
          mediateur_id?: string | null
          provision_consignee?: boolean
          statut?: Database["public"]["Enums"]["statut_dossier"]
          rdv_creneau_id?: string | null
          created_at?: string
          mode?: Database["public"]["Enums"]["mode_amiable"]
          co_mediateur_id?: string | null
          rdv_format?: Database["public"]["Enums"]["format_rdv"] | null
          rdv_lieu?: Database["public"]["Enums"]["lieu_rdv"] | null
          issue?: Database["public"]["Enums"]["issue_dossier"]
          compte_rendu?: string | null
          cloture_le?: string | null
        }
        Update: {
          id?: string
          numero_rg?: string
          juridiction?: string
          date_ordonnance?: string
          mediateur_id?: string | null
          provision_consignee?: boolean
          statut?: Database["public"]["Enums"]["statut_dossier"]
          rdv_creneau_id?: string | null
          created_at?: string
          mode?: Database["public"]["Enums"]["mode_amiable"]
          co_mediateur_id?: string | null
          rdv_format?: Database["public"]["Enums"]["format_rdv"] | null
          rdv_lieu?: Database["public"]["Enums"]["lieu_rdv"] | null
          issue?: Database["public"]["Enums"]["issue_dossier"]
          compte_rendu?: string | null
          cloture_le?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_mediateur_id_fkey"
            columns: ["mediateur_id"]
            isOneToOne: false
            referencedRelation: "mediateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_co_mediateur_id_fkey"
            columns: ["co_mediateur_id"]
            isOneToOne: false
            referencedRelation: "mediateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_rdv_creneau_id_fkey"
            columns: ["rdv_creneau_id"]
            isOneToOne: true
            referencedRelation: "creneaux"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          id: string
          dossier_id: string
          role: Database["public"]["Enums"]["role_partie"]
          nom: string
          prenom: string
          avocat_nom: string | null
          token: string
          telephone: string | null
          email: string | null
          consentement_rgpd: boolean
          confirme_le: string | null
          avocat_email: string | null
          avocat_telephone: string | null
          avocat_barreau: string | null
          passer_par_avocat: boolean
          rempli_par: Database["public"]["Enums"]["rempli_par"] | null
          telephone_2: string | null
          email_2: string | null
          adresse: string | null
          choix: Database["public"]["Enums"]["choix_partie"] | null
          pref_format: Database["public"]["Enums"]["preference_format"] | null
          pref_lieu: Database["public"]["Enums"]["preference_lieu"] | null
        }
        Insert: {
          id?: string
          dossier_id: string
          role: Database["public"]["Enums"]["role_partie"]
          nom: string
          prenom: string
          avocat_nom?: string | null
          token?: string
          telephone?: string | null
          email?: string | null
          consentement_rgpd?: boolean
          confirme_le?: string | null
          avocat_email?: string | null
          avocat_telephone?: string | null
          avocat_barreau?: string | null
          passer_par_avocat?: boolean
          rempli_par?: Database["public"]["Enums"]["rempli_par"] | null
          telephone_2?: string | null
          email_2?: string | null
          adresse?: string | null
          choix?: Database["public"]["Enums"]["choix_partie"] | null
          pref_format?: Database["public"]["Enums"]["preference_format"] | null
          pref_lieu?: Database["public"]["Enums"]["preference_lieu"] | null
        }
        Update: {
          id?: string
          dossier_id?: string
          role?: Database["public"]["Enums"]["role_partie"]
          nom?: string
          prenom?: string
          avocat_nom?: string | null
          token?: string
          telephone?: string | null
          email?: string | null
          consentement_rgpd?: boolean
          confirme_le?: string | null
          avocat_email?: string | null
          avocat_telephone?: string | null
          avocat_barreau?: string | null
          passer_par_avocat?: boolean
          rempli_par?: Database["public"]["Enums"]["rempli_par"] | null
          telephone_2?: string | null
          email_2?: string | null
          adresse?: string | null
          choix?: Database["public"]["Enums"]["choix_partie"] | null
          pref_format?: Database["public"]["Enums"]["preference_format"] | null
          pref_lieu?: Database["public"]["Enums"]["preference_lieu"] | null
        }
        Relationships: [
          {
            foreignKeyName: "parties_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilites: {
        Row: {
          partie_id: string
          creneau_id: string
        }
        Insert: {
          partie_id: string
          creneau_id: string
        }
        Update: {
          partie_id?: string
          creneau_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disponibilites_partie_id_fkey"
            columns: ["partie_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disponibilites_creneau_id_fkey"
            columns: ["creneau_id"]
            isOneToOne: false
            referencedRelation: "creneaux"
            referencedColumns: ["id"]
          },
        ]
      }
      evenements: {
        Row: {
          id: string
          dossier_id: string
          type: string
          libelle: string
          acteur: "juridiction" | "partie" | "avocat" | "mediateur" | "systeme"
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          dossier_id: string
          type: string
          libelle: string
          acteur: "juridiction" | "partie" | "avocat" | "mediateur" | "systeme"
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          dossier_id?: string
          type?: string
          libelle?: string
          acteur?: "juridiction" | "partie" | "avocat" | "mediateur" | "systeme"
          details?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evenements_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recalculer_statut_dossier: {
        Args: { p_dossier_id: string }
        Returns: Database["public"]["Enums"]["statut_dossier"]
      }
    }
    Enums: {
      statut_dossier: "en_attente" | "partiellement_joignable" | "joignable" | "rdv_fixe"
      role_partie: "demandeur" | "defendeur"
      rempli_par: "partie" | "avocat"
      mode_amiable: "mediation" | "conciliation"
      fonction_amiable: "mediateur" | "conciliateur"
      choix_partie: "information" | "accepte" | "refuse"
      preference_format: "ensemble" | "separe" | "indifferent"
      preference_lieu: "presentiel" | "distanciel" | "indifferent"
      format_rdv: "ensemble" | "separe"
      lieu_rdv: "presentiel" | "distanciel"
      issue_dossier: "en_cours" | "accord_total" | "accord_partiel" | "echec" | "carence" | "refus"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Raccourcis : Tables<"dossiers">, TablesInsert<"parties">, TablesUpdate<"parties">, Enums<"statut_dossier">
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
