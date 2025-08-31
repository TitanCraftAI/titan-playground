import React, { useEffect, useMemo, useRef, useState } from "react";

/** localStorage keys */
const LS_BASE = "tc.base";
const LS_KEY = "tc.key";
const LS_RECENT = "tc.recent";

/** tiny helpers */
const pretty = (obj: any) => JSON.stringify(obj, null, 2);
const now = () => performance.now();

type Task = "auto" | "math" | "writing" | "search";

type RouteBody = {
  prompt: string;
  task?: Task;
};

type Jsonish = Record<string, any> | Array<any> | string | number | boolean | null;

export default function PlaygroundForm() {
  const [base, setBase] = useState<string>(
    () => localStorage.getItem(LS_BASE) || "https://api.titancraft.io"
  );
  const [key, setKey] = useState<string>(() => localStorage.getItem(LS_KEY) || "");
  const [task, setTask] = useState<Task>("auto");
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<Jsonish | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_RECENT) || "[]");
    } catch {
      return [];
    }
  });

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const resultBoxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem(LS_BASE, base);
  }, [base]);

  useEffect(() => {
    localStorage.setItem(LS_KEY, key);
  }, [key]);

  useEffect(() => {
    localStorage.setItem(LS_RECENT, JSON.stringify(recent.slice(0, 10)));
  }, [recent]);

  /** network wrappers */
  async function getJSON(path: string) {
    setLoading(true);
    setError(null);
    setStatus(null);
    setResult(null);
    setMs(null);
    const t0 = now();
    try {
      const url = `${base}${path}`;
      const r = await fetch(url, {
        headers: {
          ...(key ? { "X-API-Key": key } : {}),
        },
      });
      setStatus(r.status);
      const text = await r.text();
      let body: any = text;
      try {
        body = JSON.parse(text);
      } catch {
        /* leave as text */
      }
      setResult(body);
      setMs(now() - t0);
    } catch (e: any) {
      setError(e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function postJSON(path: string, json: any) {
    setLoading(true);
    setError(null);
    setStatus(null);
    setResult(null);
    setMs(null);
    const t0 = now();
    try {
      const url = `${base}${path}`;
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(key ? { "X-API-Key": key } : {}),
        },
        body: JSON.stringify(json),
      });
      setStatus(r.status);
      const text = await r.text();
      let body: any = text;
      try {
        body = JSON.parse(text);
      } catch {
        /* leave as text */
      }
      setResult(body);
      setMs(now() - t0);
    } catch (e: any) {
      setError(e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  /** actions */
  const doVersion = () => getJSON("/version");
  const doHealth = () => getJSON("/health");
  const doMetrics = () => getJSON("/metrics");
  const doImprovementLog = () => getJSON("/improvement-log");

  const send = async () => {
    if (!canSend) return;
    const body: RouteBody = { prompt: input.trim() };
    if (task !== "auto") body.task = task;
    await postJSON("/v1/route", body);
    // store in recent
    const next = [input.trim(), ...recent.filter((r) => r !== input.trim())];
    setRecent(next.slice(0, 10));
  };

  /** Admin endpoints – require key */
  const requireKey = () => {
    if (!key) {
      setError("Admin calls require X-API-Key (add it above).");
      return false;
    }
    return true;
  };

  const admin = {
    freeze: () => requireKey() && postJSON("/v1/freeze", {}),
    unfreeze: () => requireKey() && postJSON("/v1/unfreeze", {}),
    rollback: () => requireKey() && postJSON("/v1/rollback", {}),
    clearCandidate: () => requireKey() && postJSON("/v1/clear-candidate", {}),
  };

  /** UX niceties */
  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(
        typeof result === "string" ? result : pretty(result)
      );
    } catch { /* ignore */ }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void send();
    }
  };

  const applyRecent = (r: string) => {
    setInput(r);
    // focus textarea
    requestAnimationFrame(() => resultBoxRef.current?.focus());
  };

  return (
    <div className="space-y-6">
      {/* Config */}
      <section className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="block text-xs text-neutral-400 mb-1">Base URL</label>
          <input
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className="w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2"
            placeholder="https://api.titancraft.io"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">API Key (optional)</label>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2"
            placeholder="X-API-Key"
          />
        </div>
      </section>

      {/* Quick actions */}
      <section className="flex flex-wrap items-center gap-2">
        <button
          onClick={doVersion}
          disabled={loading}
          className="btn">Version</button>
        <button onClick={doHealth} disabled={loading} className="btn">Health</button>
        <button onClick={doMetrics} disabled={loading} className="btn">/metrics</button>
        <button onClick={doImprovementLog} disabled={loading} className="btn">
          /improvement-log
        </button>
        <div className="ml-auto flex items-center gap-1">
          {(["auto", "math", "writing", "search"] as Task[]).map((t) => (
            <button
              key={t}
              disabled={loading}
              onClick={() => setTask(t)}
              className={
                "chip " +
                (task === t ? "chip--active" : "")
              }
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Prompt */}
      <section>
        <label className="block text-xs text-neutral-400 mb-1">
          Type a question… <span className="opacity-60">(Cmd/Ctrl+Enter to send)</span>
        </label>
        <textarea
          ref={resultBoxRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={6}
          className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-3 resize-y"
          placeholder="e.g., four times five"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={send}
            disabled={!canSend}
            className="btn btn--primary"
          >
            {loading ? "Sending…" : "Send"}
          </button>
          <button
            onClick={() => {
              setInput("");
              setResult(null);
              setError(null);
              setStatus(null);
              setMs(null);
            }}
            disabled={loading}
            className="btn"
          >
            Clear
          </button>
        </div>
      </section>

      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-red-600 bg-red-950/40 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      <section className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-xs text-neutral-400">Server responses</div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <div className="mb-2 flex items-center gap-3 text-xs text-neutral-400">
              <span>Status: {status ?? "—"}</span>
              <span>Time: {ms ? `${ms.toFixed(0)}ms` : "—"}</span>
              <span className="ml-auto" />
              <button
                className="text-neutral-300 hover:underline disabled:opacity-40"
                onClick={copyResult}
                disabled={!result}
              >
                Copy JSON
              </button>
            </div>
            <pre className="max-h-[420px] overflow-auto text-[12.5px] leading-5">
{result ? pretty(result) : pretty({ ok: true })}
            </pre>
          </div>
        </div>

        {/* Admin + Recent */}
        <div className="space-y-3">
          <div>
            <div className="text-xs text-neutral-400 mb-2">Admin</div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 grid grid-cols-2 gap-2">
              <button className="btn" disabled={loading} onClick={() => admin.freeze()}>
                Freeze
              </button>
              <button className="btn" disabled={loading} onClick={() => admin.unfreeze()}>
                Unfreeze
              </button>
              <button className="btn" disabled={loading} onClick={() => admin.rollback()}>
                Rollback
              </button>
              <button className="btn" disabled={loading} onClick={() => admin.clearCandidate()}>
                Clear candidate
              </button>
              <div className="col-span-2 text-[11px] text-neutral-400 mt-1">
                Admin calls include your X-API-Key header if provided.
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-400 mb-2">Recent</div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-2">
              {recent.length === 0 ? (
                <div className="p-2 text-sm text-neutral-400">No requests yet.</div>
              ) : (
                <ul className="divide-y divide-neutral-800">
                  {recent.map((r, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2">
                      <div className="text-sm truncate pr-2">{r}</div>
                      <div className="flex items-center gap-2">
                        <button className="btn btn--sm" onClick={() => applyRecent(r)}>
                          Load
                        </button>
                        <button
                          className="btn btn--sm"
                          onClick={() => setRecent(recent.filter((x) => x !== r))}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {recent.length > 0 && (
                <div className="mt-2 flex">
                  <button className="btn btn--sm ml-auto" onClick={() => setRecent([])}>
                    Clear recent
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* tiny style helpers (scoped by Tailwind classes you already have) */}
      <style>{`
        .btn {
          @apply rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50;
        }
        .btn--primary {
          @apply border-titan-500 bg-titan-700/20 hover:bg-titan-700/30;
        }
        .btn--sm {
          @apply px-2 py-1 text-xs;
        }
        .chip {
          @apply rounded-full border border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-900;
        }
        .chip--active {
          @apply border-titan-500 bg-titan-900/40;
        }
      `}</style>
    </div>
  );
}
