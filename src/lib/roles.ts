// Le rôle d'un compte est stocké dans app_metadata (modifiable seulement côté
// serveur ou en SQL, contrairement à user_metadata). Il est inclus dans le JWT,
// donc lisible sans requête à la base.
//
// Le rôle technique "greffe" correspond à l'espace « juridiction » (/juridiction) :
// il n'a pas été renommé pour ne pas modifier les comptes existants.
//
//   { "role": "greffe" }
//   { "role": "mediateur", "mediateur_id": "<id dans la table mediateurs>" }
export type Role = "greffe" | "mediateur"

export const ACCUEIL_PAR_ROLE: Record<Role, string> = {
  greffe: "/juridiction",
  mediateur: "/mediateur",
}

// Accepte les claims du JWT (getClaims) ou un utilisateur (signInWithPassword).
type AvecAppMetadata = { app_metadata?: Record<string, unknown> } | null | undefined

export function lireRole(compte: AvecAppMetadata): Role | null {
  const role = compte?.app_metadata?.role
  return role === "greffe" || role === "mediateur" ? role : null
}

// Pour un compte médiateur : l'id de sa ligne dans la table mediateurs.
export function lireMediateurId(compte: AvecAppMetadata): string | null {
  const id = compte?.app_metadata?.mediateur_id
  return typeof id === "string" ? id : null
}
