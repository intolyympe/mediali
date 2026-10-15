// Démo publique : accès aux espaces juridiction et médiateur sans mot de passe,
// avec des comptes de démonstration partagés (voir README, « Démo publique »).
// Préfixe NEXT_PUBLIC_ : valeur fixée au build, lisible côté serveur et client.
// Ne contient aucun secret : les identifiants restent côté serveur
// (DEMO_*_EMAIL, DEMO_*_PASSWORD, lus dans src/app/connexion/actions.ts).
export const MODE_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

export type EspaceDemo = "juridiction" | "mediateur"
