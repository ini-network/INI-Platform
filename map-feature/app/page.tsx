import { redirect } from "next/navigation";

// The map lives at /map (and /map/[borough] for the deep-dive) so its internal
// links match the main product. The root simply forwards there.
export default function Home() {
  redirect("/map");
}
