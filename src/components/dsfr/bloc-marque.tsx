// Bloc-marque de l'État en texte seul (pas d'image du logo officiel) :
// « République Française » et la devise, sur le modèle du DSFR.
export function BlocMarque({ taille = "normale" }: { taille?: "normale" | "petite" }) {
  return (
    <div className="flex flex-col gap-1.5 leading-none">
      <p
        className={
          taille === "petite"
            ? "text-sm font-bold tracking-tight uppercase"
            : "text-base font-bold tracking-tight uppercase sm:text-lg"
        }
      >
        République
        <br />
        Française
      </p>
      <p className="text-[0.7rem] leading-tight italic">
        Liberté
        <br />
        Égalité
        <br />
        Fraternité
      </p>
    </div>
  )
}
