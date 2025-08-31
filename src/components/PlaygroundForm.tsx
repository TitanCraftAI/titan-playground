import React, { useEffect, useMemo, useRef, useState } from "react";

type Json = Record<string, any>;

type TaskType = "auto" | "math" | "writing" | "search";

const TASKS: { key: TaskType; label: string }[] = [
  { key: "auto", label: "Auto" },
  { key: "math", label: "Math" },
  { key: "writing", label: "Writing" },
  { key: "search", label: "Search" },
];

function pretty(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export default function PlaygroundForm() {
  // --- persisted settings (localStorage) ---
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    return localStorage.getItem("tc_baseUrl") || "https://api.titancraft.io";
  });
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("tc_apiKey") || "";
  });

  // --- runtime state ---
  const [task, setTask] = useState<TaskType>("auto");
  const [prompt, setPrompt] = useState("");
  const [server, setServer] = useState<string>(""); // right-pane text
  const [busy, setBusy] = useState(false);

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey.trim()) h["X-API-Key"] = apiKey.trim();
    return h;
  }, [apiKey]);

  function saveSettings() {
    localStorage.setItem("tc_baseUrl", baseUrl);
    localStorage.setItem("tc_apiKey", apiKey);
    toast("Saved.");
  }

  function toast(msg: string) {
    setServer((prev) =>
      [prev, `\n${new Date().toISOString()}  ${msg}`].filter(Boolean).join("\n")
    );
  }

  async function call(path: string, init?: RequestInit) {
    const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: { ...(init?.headers || {}), ...headers },
    });
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, json: JSON.parse(text) as Json };
    } catch {
      return { ok: res.ok, status: res.status, text };
    }
  }

  // ---------- built-in buttons ----------

  async function onHealth() {
    setBusy(true);
    try {
      const r = await call(`/health`);
      setServer(pretty(r));
    } catch (e: any) {
      setServer(pretty({ ok: false, error: String(e) }));
    } finally {
      setBusy(false);
    }
  }

  async function onVersion() {
    setBusy(true);
    try {
      const r = await call(`/version`);
      setServer(pretty(r));
    } catch (e: any) {
      setServer(pretty({ ok: false, error: String(e) }));
    } finally {
      setBusy(false);
    }
  }

  async function onMetrics() {
    setBusy(true);
    try {
      const r = await call(`/metrics`);
      setServer(pretty(r));
    } catch (e: any) {
      setServer(pretty({ ok: false, error: String(e) }));
    } finally {
      setBusy(false);
    }
  }

  async function onImprovementLog() {
    setBusy(true);
    try {
      const r = await call(`/improvement-log`);
      setServer(pretty(r));
    } catch (e: any) {
      setServer(pretty({ ok: false, error: String(e) }));
    } finally {
      setBusy(false);
    }
  }

  // ---------- main /v1/route ----------

  async function onSend() {
    if (!prompt.trim()) return toast("Type something first.");
    setBusy(true);
    setServer((s) => s || ""); // keep pane visible
    try {
      const r = await call(`/v1/route`, {
        method: "POST",
        body: JSON.stringify({ prompt, task }),
      });
      setServer(pretty(r));
    } catch (e: any) {
      setServer(pretty({ ok: false, error: String(e) }));
    } finally {
      setBusy(false);
    }
  }

  // ---------- Admin panel ----------
  // These call the server admin endpoints. They also send X-API-Key if provided.
  async function adminHit(path: string, verb: "POST" | "DELETE" = "POST") {
    setBusy(true);
    try {
      const r = await call(path, { method: verb });
      setServer(pretty(r));
    } catch (e: any) {
      setServer(pretty({ ok: false, error: String(e) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* LEFT */}
      <div className="space-y-4">
        {/* Settings row */}
        <div className="flex items-center gap-2">
          <div className="grow">
            <label className="text-xs text-neutral-400">Base URL</label>
            <input
              className="w-full rounded-md bg-neutral-900 px-3 py-2 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <div className="w-56">
            <label className="text-xs text-neutral-400">API Key (optional)</label>
            <input
              className="w-full rounded-md bg-neutral-900 px-3 py-2 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
              value={apiKey}
              placeholder="X-API-Key"
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <button
            onClick={saveSettings}
            className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
          >
            Save
          </button>
          <button
            onClick={onHealth}
            className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
          >
            Health
          </button>
        </div>

        {/* Task chips */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">Task:</span>
          {TASKS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTask(t.key)}
              className={[
                "rounded-full px-3 py-1 text-sm ring-1 ring-neutral-700 transition",
                task === t.key ? "bg-neutral-700" : "bg-neutral-900 hover:bg-neutral-800",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button
              onClick={onVersion}
              className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
            >
              Version
            </button>
            <button
              onClick={onMetrics}
              className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
            >
              /metrics
            </button>
            <button
              onClick={onImprovementLog}
              className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
            >
              /improvement-log
            </button>
          </div>
        </div>

        {/* Prompt input */}
        <div>
          <textarea
            className="h-32 w-full resize-y rounded-md bg-neutral-900 p-3 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
            placeholder="Type a question…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <button
              disabled={busy}
              onClick={onSend}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
        </div>

        {/* Admin controls */}
        <div className="rounded-xl border border-neutral-800 p-3">
          <div className="mb-2 text-xs font-semibold text-neutral-300">Admin</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <button
              disabled={busy}
              onClick={() => adminHit(`/admin/freeze`)}
              className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50"
              title="Freeze auto-tuning (stop promotions/rollbacks)"
            >
              Freeze
            </button>
            <button
              disabled={busy}
              onClick={() => adminHit(`/admin/unfreeze`)}
              className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50"
            >
              Unfreeze
            </button>
            <button
              disabled={busy}
              onClick={() => adminHit(`/admin/rollback`)}
              className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50"
            >
              Rollback
            </button>
            <button
              disabled={busy}
              onClick={() => adminHit(`/admin/clear-candidate`, "DELETE")}
              className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50"
            >
              Clear candidate
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Admin calls include your <code>X-API-Key</code> header if provided.
          </p>
        </div>
      </div>

      {/* RIGHT: server responses */}
      <div className="rounded-xl border border-neutral-800 p-3">
        <pre className="h-[520px] overflow-auto text-[12px] leading-5">
          {server || "// server responses will appear here"}
        </pre>
      </div>
    </div>
  );
}
