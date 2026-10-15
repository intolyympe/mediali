import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Accessibilité",
}

// Où signaler un problème d'accessibilité (à changer si le dépôt n'est pas public)
const SIGNALEMENT = "https://github.com/intolyympe/mediali/issues"

export default function PageAccessibilite() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <h1 className="text-3xl font-bold">Accessibilité</h1>

      <section aria-labelledby="titre-etat" className="flex flex-col gap-3">
        <h2 id="titre-etat" className="text-xl font-bold">
          État de conformité
        </h2>
        <p>
          Médiali est <strong>partiellement conforme</strong> au référentiel général
          d&apos;amélioration de l&apos;accessibilité (RGAA). C&apos;est un prototype de
          démonstration : il n&apos;a pas été audité.
        </p>
      </section>

      <section aria-labelledby="titre-fait" className="flex flex-col gap-3">
        <h2 id="titre-fait" className="text-xl font-bold">
          Ce qui a été fait
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>Un titre unique par page, des titres hiérarchisés et un lien « Aller au contenu ».</li>
          <li>
            Des formulaires avec des étiquettes reliées aux champs, les champs obligatoires
            indiqués en texte, des messages d&apos;erreur annoncés et reliés au champ concerné.
          </li>
          <li>
            Dans les parcours en étapes, le titre annonce l&apos;étape (« Étape 2 sur 6 ») et
            reçoit le focus.
          </li>
          <li>Les mises à jour en temps réel sont annoncées aux lecteurs d&apos;écran.</li>
          <li>
            Des couleurs contrastées, une information jamais portée par la couleur seule et un
            focus clavier visible partout.
          </li>
          <li>Des zones tactiles d&apos;au moins 44 pixels sur téléphone.</li>
          <li>Un test automatique (axe-core) sur les pages principales.</li>
        </ul>
      </section>

      <section aria-labelledby="titre-limites" className="flex flex-col gap-3">
        <h2 id="titre-limites" className="text-xl font-bold">
          Limites connues
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>Aucun audit RGAA complet ni test avec des utilisateurs de technologies d&apos;assistance.</li>
          <li>
            Sur petit écran, le tableau de suivi de la juridiction défile horizontalement.
          </li>
        </ul>
      </section>

      <section aria-labelledby="titre-signaler" className="flex flex-col gap-3">
        <h2 id="titre-signaler" className="text-xl font-bold">
          Signaler un problème
        </h2>
        <p>
          Si vous ne pouvez pas utiliser une page ou une fonction, décrivez le problème (page
          concernée, navigateur, technologie d&apos;assistance utilisée) en ouvrant un ticket sur{" "}
          <a href={SIGNALEMENT} className="text-primary underline">
            le dépôt du projet
          </a>
          . L&apos;équipe vous répondra dès que possible.
        </p>
      </section>
    </main>
  )
}
