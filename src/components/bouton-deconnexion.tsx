import { seDeconnecter } from "@/app/connexion/actions"
import { Button } from "@/components/ui/button"

export function BoutonDeconnexion() {
  return (
    <form action={seDeconnecter}>
      <Button type="submit" variant="outline">
        Se déconnecter
      </Button>
    </form>
  )
}
