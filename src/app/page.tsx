import { redirect } from "next/navigation"

// Le proxy envoie déjà les comptes connectés vers /greffe ou /mediateur.
export default function Accueil() {
  redirect("/connexion")
}
