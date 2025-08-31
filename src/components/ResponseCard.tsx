type Props = { role: "user" | "bot"; text: string };

export default function ResponseCard({ role, text }: Props) {
  const mine = role === "user";
  return (
    <div
      className={[
        "max-w-[80%] whitespace-pre-wrap rounded-xl border px-3 py-2 text-sm",
        mine
          ? "self-end border-neutral-700 bg-neutral-900"
          : "self-start border-neutral-800 bg-neutral-950",
      ].join(" ")}
    >
      {text}
    </div>
  );
}

