import Header from "./components/Header";
import PlaygroundForm from "./components/PlaygroundForm";

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-semibold">Try the Titan Router</h1>
        <p className="text-neutral-300 text-sm max-w-prose">Simple interface to call your router at <code>api.titancraft.io</code>. No dropdowns, just type and send. Use the task chips if you want to force a type.</p>
        <PlaygroundForm />
      </main>
    </div>
  );
}
