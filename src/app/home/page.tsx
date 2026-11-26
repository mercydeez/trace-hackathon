import { Workspace } from "@/components/Workspace";

/** The landing page at a stable address. It opens even when projects are saved, and offers to resume the open one. */
export default function HomePage() {
  return <Workspace view="home" />;
}
