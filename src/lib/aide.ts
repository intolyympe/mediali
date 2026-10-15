// Contenu de la fenêtre d'aide (bouton « ? » en bas à droite de chaque page).
// Tout le texte est ici : le modifier sans toucher au composant
// (src/components/aide/bouton-aide.tsx). Phrases courtes, français simple.

export type PageAide = "accueil" | "juridiction" | "partie" | "avocat" | "mediateur"

export type ContenuAide = {
  titre: string
  intro: string
  /** Titre de la liste (lu aussi par les lecteurs d'écran). */
  titreListe: string
  /** true : liste numérotée (étapes à suivre dans l'ordre). */
  numerotee?: boolean
  liste: { titre: string; texte: string }[]
  /** Phrase finale, mise en avant. */
  note?: string
}

const DONNEES_FICTIVES =
  "Tout est fictif : n'écrivez aucune donnée personnelle réelle. Les données sont remises à zéro chaque nuit."

export const AIDE: Record<PageAide, ContenuAide> = {
  accueil: {
    titre: "Bienvenue sur Médiali",
    intro:
      "Quand un juge désigne un médiateur, celui-ci n'a souvent pas les coordonnées des parties. Avec Médiali, chaque partie reçoit un QR code et transmet ses coordonnées et ses disponibilités depuis son téléphone.",
    titreListe: "Faire le tour de la démo en 3 étapes",
    numerotee: true,
    liste: [
      {
        titre: "Entrez comme juridiction",
        texte: "Cliquez sur « Entrer comme juridiction », puis ouvrez le dossier 26/00300 dans le tableau de suivi.",
      },
      {
        titre: "Répondez à la place d'une partie",
        texte: "Sous un QR code, cliquez sur « Ouvrir le parcours de cette partie » et remplissez le formulaire.",
      },
      {
        titre: "Passez côté médiateur",
        texte: "Cliquez sur « Changer d'espace » : le dossier 26/00300 affiche déjà la réponse de la partie.",
      },
    ],
    note: DONNEES_FICTIVES,
  },

  juridiction: {
    titre: "Espace juridiction",
    intro: "Ici, la juridiction enregistre les ordonnances et suit chaque dossier jusqu'au premier rendez-vous.",
    titreListe: "Ce que vous pouvez faire",
    liste: [
      {
        titre: "Suivre les dossiers",
        texte:
          "Le tableau de suivi montre le statut de chaque dossier : en attente, partiellement joignable, joignable ou rendez-vous fixé. Les filtres aident à trouver les dossiers sans réponse.",
      },
      {
        titre: "Créer un dossier",
        texte:
          "« Nouveau dossier » : saisissez le n° RG, le médiateur ou le conciliateur et les parties. Un QR code est créé pour chaque partie.",
      },
      {
        titre: "Imprimer les QR codes",
        texte:
          "Ouvrez un dossier pour imprimer les QR codes à joindre aux notifications. « Ouvrir le parcours de cette partie » permet de tester sans téléphone.",
      },
    ],
    note: "« Changer d'espace » vous emmène côté médiateur.",
  },

  partie: {
    titre: "Le parcours d'une partie",
    intro:
      "C'est la page qu'une partie ouvre en scannant le QR code reçu avec la décision du juge. Elle répond en quelques minutes, sur son téléphone.",
    titreListe: "À quoi servent les étapes",
    liste: [
      {
        titre: "Vérification",
        texte:
          "Le nom de famille, écrit sous le QR code, confirme que c'est bien la bonne personne. Un lien permet aussi à son avocat de répondre à sa place.",
      },
      {
        titre: "Choix",
        texte: "Réunion d'information d'abord, accord ou refus de la médiation.",
      },
      {
        titre: "Coordonnées et accord",
        texte: "Téléphone, e-mail ou adresse, puis accord pour que le médiateur les utilise.",
      },
      {
        titre: "Rendez-vous et disponibilités",
        texte:
          "Préférences pour le premier rendez-vous et créneaux possibles. Dès que toutes les parties ont un créneau commun, le rendez-vous est fixé tout seul.",
      },
    ],
    note: DONNEES_FICTIVES,
  },

  avocat: {
    titre: "Le parcours de l'avocat",
    intro:
      "L'avocat d'une partie peut répondre à sa place avec le même QR code. Le médiateur sait alors qu'il doit passer par lui.",
    titreListe: "À quoi servent les étapes",
    liste: [
      {
        titre: "Vérification",
        texte: "Le nom de famille du client, écrit sous le QR code, confirme le bon dossier.",
      },
      {
        titre: "Vos coordonnées",
        texte: "Nom, barreau, téléphone et e-mail de l'avocat.",
      },
      {
        titre: "Position et coordonnées du client",
        texte: "Réunion d'information, accord ou refus, puis les coordonnées du client.",
      },
      {
        titre: "Rendez-vous et disponibilités",
        texte:
          "Préférences pour le premier rendez-vous et créneaux possibles. Dès que toutes les parties ont un créneau commun, le rendez-vous est fixé tout seul.",
      },
    ],
    note: DONNEES_FICTIVES,
  },

  mediateur: {
    titre: "Espace médiateur",
    intro:
      "Ici, le médiateur ou le conciliateur retrouve ses dossiers et les coordonnées des parties dès qu'elles répondent.",
    titreListe: "Ce que vous pouvez faire",
    liste: [
      {
        titre: "Tableau de bord",
        texte: "Vos dossiers et les réponses des parties, mis à jour en temps réel.",
      },
      {
        titre: "Timeline",
        texte:
          "Dans chaque dossier, l'historique montre qui a fait quoi et quand : ordonnance, réponses, refus, rendez-vous, compte rendu, issue.",
      },
      {
        titre: "Actions",
        texte:
          "Fixer ou modifier le premier rendez-vous, noter une séance ou une absence, relancer une partie, ajouter un compte rendu, clôturer le dossier.",
      },
    ],
    note: "« Changer d'espace » vous ramène côté juridiction.",
  },
}

/** Aide adaptée à la page en cours, d'après son chemin. */
export function pageAide(chemin: string): PageAide {
  if (chemin.startsWith("/p/")) return chemin.endsWith("/avocat") ? "avocat" : "partie"
  if (chemin === "/juridiction" || chemin.startsWith("/juridiction/")) return "juridiction"
  if (chemin === "/mediateur" || chemin.startsWith("/mediateur/")) return "mediateur"
  // Accueil, connexion et pages inconnues
  return "accueil"
}
