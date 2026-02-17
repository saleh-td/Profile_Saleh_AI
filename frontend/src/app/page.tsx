import { redirect } from "next/navigation";

export default function RootPage() {
  // Par défaut, le site est en français.
  redirect("/fr");
}
