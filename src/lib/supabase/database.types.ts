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
        }
        Insert: {
          id?: string
          nom: string
          email: string
          telephone?: string | null
        }
        Update: {
          id?: string
          nom?: string
          email?: string
          telephone?: string | null
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
      statut_dossier:
        | "en_attente"
        | "partiellement_joignable"
        | "joignable"
        | "rdv_fixe"
      role_partie: "demandeur" | "defendeur"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Raccourcis : Tables<"dossiers">, Enums<"statut_dossier">
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
