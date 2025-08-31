import { useEffect, useMemo, useRef, useState } from "react";
import ResponseCard from "./ResponseCard";

const DEFAULT_BASE = import.meta.env.VITE_API_BASE || "https://api.titancraft.io";

type ServerOut = unknown;

export default function PlaygroundForm() {
  const [baseUrl, setBaseUrl] = useState<string>(DEFAULT_BASE);
  const [apiKey, setApiKey] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [out, setOut] = useState<ServerOut | string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [msgs, setMsgs] = useState<{ role: "user" | "bot"; text: string }[]>([]);

  // load/save local storage
  useEffect(() => {
    const b = localStorage.getItem("tc_baseUrl") || DEFAULT_BASE;
    const k = localStorage.getItem("tc_apiKey") || "";
    setBaseUrl(b);
    setApiKey(k);
  }, []);
  const saveCfg = () => {
    localStorage.setItem("tc_baseUrl", baseUrl.trim());
    localStorage.setItem("tc_apiKey", apiKey.trim());
    pushBot("Saved config.");
  };

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey.trim()) h["X-API-Key"] = apiKey.trim();
    return h;
  }, [apiKey]);

  const req = async (path: string, init?: RequestInit) => {
    const url = baseUrl.replace(/\/+$/, "") + path;
    const res = await fetch(url, { method: "GET", headers, ...init });
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) as unknown };
    } catch {
      return { ok: res.ok, status: res.status, data: text as unknown };
    }
  };

  const pushUser = (t: string) => setMsgs((m) => [...m, { role: "user", text: t }]);
  const pushBot  = (t: string) => setMsgs((m) => [...m, { role: "bot", text: t }]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const text = prompt.trim();
    if (!text) return;
    setPrompt("");
    pushUser(text);

    try {
      const r = await req("/v1/route", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: text, task: "auto" })
      });
      setOut(r);
      const d: any = r.data;
      const answer = (d && (d.answer || d.output || d.text)) ?? JSON.stringify(d, null, 2);
      pushBot(String(answer));
    } catch (e: any) {
      setOut(String(e));
      pushBot("Request failed.");
    }
  };

  const health = async () => setOut(await req("/health"));
  const version = async () => setOut(await req("/version"));
  const metrics = async () => setOut(await req("/metrics"));
  const log = async () => setOut(await req("/improvement-log"));
  const clear = () => { setMsgs([]); setOut(""); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* left */}
      <div className="border border-neutral-800 rounded-xl p-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs text-neutral-400">Base URL</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2"
            />
          </div>
          <div className="w-[260px]">
            <label className="text-xs text-neutral-400">API Key (optional)</label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2"
              placeholder="X-API-Key"
            />
          </div>
          <button onClick={saveCfg} className="rounded-md border border-neutral-700 px-3 py-2 hover:border-titan-500">
            Save
          </button>
          <button onClick={health} className="rounded-md border border-neutral-700 px-3 py-2">Health</button>
          <button onClick={version} className="rounded-md border border-neutral-700 px-3 py-2">Version</button>
          <button onClick={clear} className="rounded-md border border-neutral-700 px-3 py-2">Clear</button>
        </div>

        <div className="mt-3 h-[56vh] overflow-auto flex flex-col gap-2 p-2">
          {msgs.map((m, i) => <ResponseCard key={i} role={m.role} text={m.text} />)}
          <div ref={chatEndRef} />
        </div>

        <div className="mt-2 flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a question…"
            className="flex-1 min-h-[56px] rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
          <button onClick={send} className="rounded-md bg-titan-500 text-black px-4">Send</button>
        </div>
      </div>

      {/* right */}
      <div className="border border-neutral-800 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-neutral-400">Server responses</div>
          <div className="flex gap-2">
            <button onClick={metrics} className="rounded-md border border-neutral-700 px-3 py-2">/metrics</button>
            <button onClick={log} className="rounded-md border border-neutral-700 px-3 py-2">/improvement-log</button>
          </div>
        </div>
        <pre className="mt-2 max-h-[56vh] overflow-auto text-xs whitespace-pre-wrap">
          {typeof out === "string" ? out : JSON.stringify(out, null, 2)}
        </pre>
      </div>
    </div>
  );
}

