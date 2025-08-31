import React, { useEffect, useMemo, useRef, useState } from "react";

type Task = "auto" | "math" | "writing" | "search";

type HistoryItem = {
  id: string;
  ts: string;
  base: string;
  task: Task;
  prompt: string;
  status: number | null;
  ok: boolean;
  responsePreview: string;
  raw: any;
};

const LS_KEYS = {
  base: "tc_baseUrl",
  key: "tc_apiKey",
  history: "tc_history_v1",
};

function loadBase(): string {
  return localStorage.getItem(LS_KEYS.base) || "https://api.titancraft.io";
}
function loadKey(): string {
  return localStorage.getItem(LS_KEYS.key) || "";
}
function saveBase(v: string) {
  localStorage.setItem(LS_KEYS.base, v.trim());
}
function saveKey(v: string) {
  localStorage.setItem(LS_KEYS.key, v.trim());
}
function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS.history) || "[]") || [];
  } catch {
    return [];
  }
}
function saveHistory(items: HistoryItem[]) {
  localStorage.setItem(LS_KEYS.history, JSON.stringify(items.slice(0, 10)));
}

const TaskChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "px-3 py-1 rounded-full border text-sm",
      active
        ? "bg-titan-700 border-titan-700 text-white"
        : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-500",
    ].join(" ")}
  >
    {label}
  </button>
);

const JsonBox: React.FC<{ value: any }> = ({ value }) => {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <pre className="max-h-[56vh] overflow-auto text-xs bg-neutral-900 border border-neutral-800 rounded-lg p-3 whitespace-pre-wrap">
      {text}
    </pre>
  );
};

export default function PlaygroundForm() {
  const [base, setBase] = useState(loadBase);
  const [apiKey, setApiKey] = useState(loadKey);
  const [task, setTask] = useState<Task>("auto");
  const [prompt, setPrompt] = useState("");
  const [serverOut, setServerOut] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // autosize textarea a tiny bit
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(200, ta.scrollHeight)}px`;
  }, [prompt]);

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey.trim()) h["X-API-Key"] = apiKey.trim();
    return h;
  }, [apiKey]);

  const saveCfg = () => {
    saveBase(base);
    saveKey(apiKey);
  };

  const clearLocal = () => {
    setPrompt("");
    setServerOut(null);
  };

  const copy = (text: string) => navigator.clipboard.writeText(text);

  async function get(path: string) {
    const url = base.replace(/\/+$/, "") + path;
    const res = await fetch(url, { method: "GET", headers });
    const raw = await res.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
    setServerOut({ ok: res.ok, status: res.status, data });
    return { res, data, raw };
  }

  async function postRoute(body: any) {
    const url = base.replace(/\/+$/, "") + "/v1/route";
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
    setServerOut({ ok: res.ok, status: res.status, data });
    return { res, data, raw };
  }

  async function send() {
    const text = prompt.trim();
    if (!text || submitting) return;
    setSubmitting(true);

    try {
      const { res, data, raw } = await postRoute({
        prompt: text,
        task, // "auto" by default, or forced via chip
      });

      const preview =
        typeof data === "string"
          ? data.slice(0, 300)
          : JSON.stringify(data, null, 2).slice(0, 300);

      const item: HistoryItem = {
        id: `${Date.now()}`,
        ts: new Date().toISOString(),
        base,
        task,
        prompt: text,
        status: res.status,
        ok: res.ok,
        responsePreview: preview,
        raw: data,
      };
      const next = [item, ...history].slice(0, 10);
      setHistory(next);
      saveHistory(next);
    } catch (e: any) {
      setServerOut({ ok: false, status: null, data: String(e) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left column */}
      <div className="space-y-4">
        {/* Config row */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-400">Base URL</label>
            <input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="w-full mt-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2"
            />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-neutral-400">API Key (optional)</label>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="X-API-Key"
                className="w-full mt-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2"
              />
            </div>
            <button onClick={saveCfg} className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 hover:border-neutral-500">
              Save
            </button>
            <button
              onClick={() => get("/health")}
              className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 hover:border-neutral-500"
            >
              Health
            </button>
          </div>
        </div>

        {/* Task chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-400 mr-1">Task:</span>
          {([
            ["Auto", "auto"],
            ["Math", "math"],
            ["Writing", "writing"],
            ["Search", "search"],
          ] as const).map(([label, value]) => (
            <TaskChip
              key={value}
              label={label}
              active={task === value}
              onClick={() => setTask(value)}
            />
          ))}
        </div>

        {/* Prompt + send */}
        <div className="space-y-2">
          <textarea
            ref={taRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type a question…"
            className="w-full min-h-[90px] rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
          <div className="flex gap-2">
            <button
              onClick={() => get("/version")}
              className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 hover:border-neutral-500"
            >
              Version
            </button>
            <button
              onClick={clearLocal}
              className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 hover:border-neutral-500"
            >
              Clear
            </button>
            <div className="flex-1" />
            <button
              onClick={send}
              disabled={submitting || !prompt.trim()}
              className="px-4 py-2 rounded-lg bg-titan-700 hover:bg-titan-500 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send"}
            </button>
          </div>
        </div>

        {/* Mini history */}
        <div className="space-y-2">
          <div className="text-sm text-neutral-300">Recent</div>
          <div className="space-y-2">
            {history.length === 0 && (
              <div className="text-xs text-neutral-500">No requests yet.</div>
            )}
            {history.map((h) => (
              <div
                key={h.id}
                className="border border-neutral-800 rounded-lg p-3 bg-neutral-900"
              >
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span>{new Date(h.ts).toLocaleTimeString()}</span>
                  <span>•</span>
                  <span className="uppercase">{h.task}</span>
                  <span>•</span>
                  <span className={h.ok ? "text-green-400" : "text-red-400"}>
                    {h.ok ? h.status : "ERR"}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => copy(h.prompt)}
                    className="px-2 py-1 rounded border border-neutral-700 hover:border-neutral-500"
                  >
                    Copy prompt
                  </button>
                  <button
                    onClick={() =>
                      copy(
                        typeof h.raw === "string"
                          ? h.raw
                          : JSON.stringify(h.raw, null, 2)
                      )
                    }
                    className="px-2 py-1 rounded border border-neutral-700 hover:border-neutral-500"
                  >
                    Copy JSON
                  </button>
                </div>
                <div className="mt-2 text-sm text-neutral-200 line-clamp-2">
                  {h.prompt}
                </div>
                <pre className="mt-2 text-xs text-neutral-400 whitespace-pre-wrap max-h-28 overflow-auto">
                  {h.responsePreview}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column: server output */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => get("/metrics")}
            className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 hover:border-neutral-500"
          >
            /metrics
          </button>
          <button
            onClick={() => get("/improvement-log")}
            className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 hover:border-neutral-500"
          >
            /improvement-log
          </button>
        </div>
        {!serverOut ? (
          <div className="text-neutral-500 text-sm">
            Server responses will appear here.
          </div>
        ) : (
          <JsonBox value={serverOut} />
        )}
      </div>
    </div>
  );
}
