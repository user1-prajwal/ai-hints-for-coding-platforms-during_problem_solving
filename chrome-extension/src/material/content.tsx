







import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";

/* ---------------- Helpers (kept from your original) ---------------- */
function getProblemText(): string {
  const lc = document.querySelector<HTMLElement>(".question-content");
  if (lc?.innerText.trim()) return lc.innerText.trim();
  const article = document.querySelector<HTMLElement>("article");
  if (article?.innerText.trim()) return article.innerText.trim();
  const alt = document.querySelector<HTMLElement>(".problem-statement, .description");
  if (alt?.innerText.trim()) return alt.innerText.trim();
  return "Problem text not found on this page.";
}

function getUserCode(): string {
  const lines = document.querySelectorAll<HTMLElement>(".view-lines .view-line");
  if (lines.length > 0) return Array.from(lines).map((l) => l.innerText).join("\n");
  const ta = document.querySelector<HTMLTextAreaElement>("textarea");
  if (ta?.value.trim()) return ta.value;
  const pre = document.querySelector<HTMLElement>("pre, code");
  if (pre?.innerText.trim()) return pre.innerText;
  return "";
}

function readSettings(): Promise<{ provider?: string; apiKey?: string }> {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.sync) {
        chrome.storage.sync.get(["provider", "apiKey"], (items) => resolve(items));
        return;
      }
    } catch {
      // ignore and fallback
    }
    // preview fallback
    resolve({ provider: localStorage.getItem("provider") || undefined, apiKey: localStorage.getItem("apiKey") || undefined });
  });
}

/* ---------------- Provider calls (kept) ---------------- */
async function callOllama(prompt: string) {
  try {
    return await new Promise<string>((resolve) => {
      if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
        resolve("❌ Ollama not reachable");
        return;
      }
      chrome.runtime.sendMessage({ type: "ollama", prompt }, (response) => {
        if (!response?.ok) resolve("❌ Ollama not reachable");
        else resolve(response.result);
      });
    });
  } catch (err) {
    console.error("callOllama error:", err);
    return "❌ Ollama not reachable";
  }
}

async function callOpenAI(prompt: string, apiKey: string) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] }),
    });
    const json = await res.json();
    return json?.choices?.[0]?.message?.content?.trim() || "No response from OpenAI.";
  } catch (e) {
    console.error("callOpenAI error:", e);
    return "OpenAI error.";
  }
}

async function callGemini(prompt: string, apiKey: string) {
  return new Promise<string>((resolve) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      resolve("No response from Gemini...");
      return;
    }
    chrome.runtime.sendMessage({ action: "callGemini", apiKey, prompt }, (resp) => {
      if (!resp || !resp.ok) resolve("No response from Gemini...");
      else resolve(resp.text || "No response from Gemini.");
    });
  });
}

async function callAnthropic(prompt: string, apiKey: string) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "claude-3-mini", max_tokens_to_sample: 150, prompt }),
    });
    const json = await res.json();
    return json?.completion?.trim() || "No response from Anthropic.";
  } catch (e) {
    console.error("callAnthropic error:", e);
    return "Anthropic error.";
  }
}

function shortHint(text: string) {
  if (!text) return "No hint available.";
  text = text.trim().replace(/\s+/g, " ");
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  return sentences.slice(0, 2).join(" ").trim();
}

async function fetchHint(payload: { hintStage: number; prevHints: string[]; whereStuck: string }) {
  const problem = getProblemText();
  const code = getUserCode();
  const settings = await readSettings();
  const provider = (settings.provider || "ollama").toLowerCase();
  const apiKey = settings.apiKey?.trim();



  let promptText = `You are a hint generator for coding problems. Return exactly ONE short hint (1–2 sentences only!).

HINT STAGE: ${payload.hintStage}
PREVIOUS HINTS: ${payload.prevHints.join(" || ")}

PROBLEM:
${problem}

USER CODE:
${code}

USER SAYS:
${payload.whereStuck}
`;

// ----------- OLLAMA LOGIC (unchanged) ------------
if (provider === "ollama") {
  const shortProblem = problem.slice(0, 200);
  const shortCode = code.split("\n").slice(-30).join("\n");
  const hasWhereStuck = payload.whereStuck?.trim().length > 0;

  promptText = `Give ONE short hint (1–2 sentences). No full solution.

${hasWhereStuck ? `Focus 80% on user's question, 20% on problem/code.` : `Focus 70% on code, 30% on problem.`}

HINT STAGE: ${payload.hintStage}
PREV HINTS: ${payload.prevHints.join(" || ")}

PROBLEM (short):
${shortProblem}

CODE (short):
${shortCode}

USER QUESTION:
${payload.whereStuck}

Give only the hint.`;
}


// ----------- OPENAI + GEMINI NEW LOGIC -----------
if (provider === "openai" || provider === "google") {
  const userFocused = payload.whereStuck?.trim().length > 0;

  promptText = `You are a coding hint generator. Respond with ONE short hint (1–2 sentences only). No full solution.

${userFocused ?
  `Focus 80% on user's question and 20% on problem/context.` :
  `Focus 65% on the code and 35% on the problem.`}

HINT STAGE: ${payload.hintStage}
PREVIOUS HINTS: ${payload.prevHints.join(" || ")}

PROBLEM:
${problem}

USER CODE:
${code}

USER QUESTION:
${payload.whereStuck}

Give only the hint.`;
}


  try {
    if (provider === "ollama") return await callOllama(promptText);
    if (provider === "openai") {
      if (!apiKey) return "⚠️ Missing OpenAI API Key.";
      return await callOpenAI(promptText, apiKey);
    }
    if (provider === "google" || provider === "gemini") {
      if (!apiKey) return "⚠️ Missing Gemini API Key.";
      return await callGemini(promptText, apiKey);
    }
    if (provider === "anthropic") {
      if (!apiKey) return "⚠️ Missing Anthropic API Key.";
      return await callAnthropic(promptText, apiKey);
    }
    return await callOllama(promptText);
  } catch (err) {
    console.error("fetchHint ERROR:", err);
    return "❌ Error contacting hint server.";
  }
}

/* ---------------- ChatBox (dark modern) ---------------- */
type ChatMsg = { role: "user" | "assistant"; content: string };

const ChatBox: React.FC<{
  visible: boolean;
  problemStatement: string;
  fetchHint: typeof fetchHint;
  onClose: () => void;
}> = ({ visible, problemStatement, fetchHint, onClose }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [whereStuck, setWhereStuck] = useState("");
  const [hintStage, setHintStage] = useState(0);
  const [prevHints, setPrevHints] = useState<string[]>([]);
  const [manualQuery, setManualQuery] = useState("");
  const lastRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => lastRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, isLoading]);
  useEffect(() => {
    if (visible) {
      setMessages([{ role: "assistant", content: "Click 'Ask' to get a short step. Use 'Reset' to restart hints." }]);
      setHintStage(0);
      setPrevHints([]);
      setWhereStuck("");
    }
  }, [visible, problemStatement]);

  const askHint = async (stuck?: string) => {
    setIsLoading(true);
    const s = (stuck ?? whereStuck ?? "").trim();
    if (s) setMessages((m) => [...m, { role: "user", content: `Stuck: ${s}` }]);
    const raw = await fetchHint({ hintStage, prevHints, whereStuck: s });
    const hint = shortHint(String(raw));
    setMessages((m) => [...m, { role: "assistant", content: hint }]);
    setPrevHints((p) => [...p, hint]);
    setHintStage((h) => h + 1);
    setIsLoading(false);
  };

  const handleManual = async () => {
    if (!manualQuery.trim()) return;
    setMessages((m) => [...m, { role: "user", content: manualQuery }]);
    setIsLoading(true);
    const raw = await fetchHint({ hintStage, prevHints, whereStuck: manualQuery.trim() });
    const hint = shortHint(String(raw));
    setMessages((m) => [...m, { role: "assistant", content: hint }]);
    setPrevHints((p) => [...p, hint]);
    setHintStage((h) => h + 1);
    setManualQuery("");
    setIsLoading(false);
  };

  const resetHints = () => {
    setHintStage(0);
    setPrevHints([]);
    setMessages([{ role: "assistant", content: "Hints restarted. Click 'Ask' when you're stuck." }]);
    setWhereStuck("");
  };

  if (!visible) return null;

  return (
    <div
      style={{
        width: 340,
        height: 500,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(2,6,23,0.6)",
        background: "linear-gradient(180deg,#07101a, #0d1320)",
        color: "#E6F0FF",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#1f6fe7,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
            ⚡
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>ThinkBuddy</div>
            <div style={{ fontSize: 12, color: "#9fb0d8" }}>{problemStatement?.slice(0, 80) || "Problem not found."}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Reset button (uses resetHints) */}
          <button onClick={resetHints} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.04)", color: "#9fb0d8", padding: 6, borderRadius: 8, cursor: "pointer" }}>
            Reset
          </button>

          {/* Close button */}
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#9fb0d8", cursor: "pointer", padding: 8, borderRadius: 8 }}>
            ✕
          </button>
        </div>
      </div>

      <div style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
        <input value={whereStuck} onChange={(e) => setWhereStuck(e.target.value)} placeholder="Where are you stuck? (optional)" style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", background: "#07101a", color: "#e6f0ff" }} />
        <button onClick={() => askHint()} style={{ padding: "8px 12px", borderRadius: 10, background: "#1f8cff", border: "none", color: "white", cursor: "pointer" }}>
          {isLoading ? "..." : "Ask"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "82%", padding: 10, borderRadius: 10, background: m.role === "user" ? "linear-gradient(90deg,#2e8bff,#1f6fe7)" : "rgba(255,255,255,0.03)", color: m.role === "user" ? "white" : "#dbe8ff" }}>{m.content}</div>
          </div>
        ))}
        <div ref={lastRef} />
      </div>

      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.02)", display: "flex", gap: 8 }}>
        <input value={manualQuery} onChange={(e) => setManualQuery(e.target.value)} placeholder="Ask a short question" style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", background: "#07101a", color: "#e6f0ff" }} />
        <button onClick={handleManual} style={{ padding: "8px 12px", borderRadius: 10, background: "#2563eb", border: "none", color: "white" }}>
          Send
        </button>
      </div>
    </div>
  );
};

/* ---------------- Floating Button + Drag behavior (dark modern) ---------------- */
const ContentApp: React.FC = () => {
  const [chatVisible, setChatVisible] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 110, y: window.innerHeight - 160 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });

  // keep problem text
  const [problemText, setProblemText] = useState("");
  useEffect(() => setProblemText(getProblemText()), []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      // nothing else needed here
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  // clicking the floating button only opens the popup (does NOT close it). Closing must be done via popup's close
  const onFabClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setChatVisible(true);
  };

  const popupPos = chatVisible
    ? (() => {
        const W = 340,
          H = 500;
        let left = pos.x - W - 20;
        let top = pos.y - H + 20;
        if (pos.x < W + 40) left = pos.x + 80;
        if (top < 10) top = pos.y + 80;
        if (top + H > window.innerHeight - 20) top = window.innerHeight - H - 20;
        if (left < 8) left = 8;
        if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
        return { left, top };
      })()
    : null;

  return (
    <>
      <div
        onMouseDown={onMouseDown}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          width: 64,
          height: 64,
          borderRadius: 18,
          background: "linear-gradient(135deg,#1f6fe7,#06b6d4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#031025",
          fontSize: 26,
          zIndex: 999999,
          boxShadow: "0 10px 30px rgba(15,40,80,0.45)",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <button
          onClick={onFabClick}
          style={{ all: "unset", cursor: "pointer", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Open ThinkBuddy"
        >
          💡
        </button>
      </div>

      {chatVisible && popupPos && (
        <div style={{ position: "fixed", left: popupPos.left, top: popupPos.top, zIndex: 999998 }}>
          <ChatBox visible={chatVisible} problemStatement={problemText} fetchHint={fetchHint} onClose={() => setChatVisible(false)} />
        </div>
      )}
    </>
  );
};

/* ---------------- Mount safely ---------------- */
function mount() {
  try {
    const win = window as unknown as Record<string, unknown>;
    if (win.__thinkbuddy_mounted) return;
    const existing = document.getElementById("thinkbuddy-root");
    if (existing) {
      win.__thinkbuddy_mounted = true;
      return;
    }
    const container = document.createElement("div");
    container.id = "thinkbuddy-root";
    (document.body || document.documentElement).appendChild(container);
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(ContentApp));
    win.__thinkbuddy_mounted = true;
  } catch (err) {
    // swallow during preview but log
     
    console.error("ThinkBuddy mount failed:", err);
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
else mount();

// Export default for Fast Refresh and clarity
export default ContentApp;
