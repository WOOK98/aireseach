import "~/assets/styles/app-tokens.css";

export default function AppLayout(props: { children: React.ReactNode }) {
  return (
    <main className="bg-paper text-ink min-h-screen w-full font-sans antialiased">
      {props.children}
    </main>
  );
}
