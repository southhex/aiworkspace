// app/hermes/page.tsx
// The Hermes Control panel moved into the Command chamber (components/CommandView.tsx,
// rendered by app/page.tsx). This route now redirects so old bookmarks still work.
import { redirect } from "next/navigation";

export default function HermesRedirect() {
  redirect("/");
}
