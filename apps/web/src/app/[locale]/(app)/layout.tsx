import "~/assets/styles/app-tokens.css";
import { ForceLight } from "~/modules/common/force-light";

export default function AppLayout(props: { children: React.ReactNode }) {
  return (
    <ForceLight>
      <main className="bg-paper text-ink min-h-screen w-full font-sans antialiased">
        {props.children}
      </main>
    </ForceLight>
  );
}
