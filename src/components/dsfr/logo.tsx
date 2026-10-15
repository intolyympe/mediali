import { cn } from "@/lib/utils"

// Logo texte de Médiali (« ali » en bleu). Volontairement sans bloc-marque de
// l'État : le site est un prototype, pas un service officiel.
export function LogoMediali({ taille = "normale" }: { taille?: "normale" | "petite" }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span
        className={cn(
          "leading-none font-bold tracking-tight text-foreground",
          taille === "petite" ? "text-xl" : "text-2xl sm:text-3xl"
        )}
      >
        Médi<span className="text-primary">Ali</span>
      </span>
      <span className={cn("text-muted-foreground", taille === "petite" ? "text-xs" : "text-sm")}>
        Médiation et conciliation judiciaires
      </span>
    </span>
  )
}
