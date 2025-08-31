export default function Header() {
  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-titan-500" />
        <span className="text-sm text-neutral-300">TitanCraft Playground</span>
      </div>
    </header>
  );
}

