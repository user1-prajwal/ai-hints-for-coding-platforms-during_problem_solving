import React, { useEffect, useState } from "react";
import type { CSSProperties } from "react";

// Providers
const PROVIDERS = [
  { id: "ollama", label: "Ollama", hint: "Local • No API Key" },
  { id: "google", label: "Google AI", hint: "Gemini Models" },
  { id: "openai", label: "OpenAI", hint: "GPT Models" }
];

// Safe storage wrapper with localStorage fallback
type StorageRecord = Record<string, string | undefined>;

function storageGet(keys: string[]): Promise<StorageRecord> {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.sync) {
        chrome.storage.sync.get(keys, (items) => resolve(items as StorageRecord));
        return;
      }
    } catch { /* empty */ }

    const out: StorageRecord = {};
    keys.forEach((k) => {
      out[k] = localStorage.getItem(k) || undefined;
    });
    resolve(out);
  });
}

function storageSet(obj: Record<string, string>): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.sync) {
        chrome.storage.sync.set(obj, () => resolve());
        return;
      }
    } catch { /* empty */ }

    Object.keys(obj).forEach((k) => {
      if (!obj[k]) localStorage.removeItem(k);
      else localStorage.setItem(k, String(obj[k]));
    });
    resolve();
  });
}

// Popup Component
const Popup: React.FC = () => {
  const [provider, setProvider] = useState("ollama");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await storageGet(["provider", "apiKey"]);
      if (!mounted) return;
      if (saved.provider) setProvider(String(saved.provider));
      if (saved.apiKey) setApiKey(String(saved.apiKey));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await storageSet({ provider, apiKey: provider === "ollama" ? "" : apiKey });
      setLoading(false);
      alert("Settings saved ✔");
    } catch (e) {
      console.error(e);
      setLoading(false);
      alert("Save failed");
    }
  };

  const isOllama = provider === "ollama";

  const cardStyle: CSSProperties = {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #2d2d2d",
    background: "#111",
    color: "#eee",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    gap: 12,
    alignItems: "center",
    boxSizing: "border-box"
  };

  const selectedStyle: CSSProperties = {
    border: "2px solid #4aa3ff",
    background: "#1a1f2b"
  };

  return (
    <div
      style={{
        width: 360,
        padding: 18,
        fontFamily: "Inter, Arial, sans-serif",
        background: "#0d1117",
        color: "white",
        boxSizing: "border-box"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "linear-gradient(135deg,#2563eb,#06b6d4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 20
          }}
        >
          ⚡
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>AI Connector Hub</div>
          <div style={{ fontSize: 12, color: "#999" }}>Connect a model and manage API keys</div>
        </div>
      </div>

      {/* Ollama */}
      <button
        onClick={() => setProvider("ollama")}
        style={{ ...cardStyle, ...(isOllama ? selectedStyle : {}) }}
      >
        <div
          style={{
            width: 56,
            height: 40,
            borderRadius: 8,
            background: "#1e293b",
            color: "#cfe8ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700
          }}
        >
          O
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Ollama</div>
          <div style={{ fontSize: 12, color: "#aaa" }}>Local • No API Key</div>
        </div>
      </button>

      {/* Google + OpenAI */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        {PROVIDERS.filter((p) => p.id !== "ollama").map((p) => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            style={{ flex: 1, ...cardStyle, ...(provider === p.id ? selectedStyle : {}) }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>{p.label}</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>{p.hint}</div>
          </button>
        ))}
      </div>

      {/* API Key */}
      {!isOllama && (
        <div style={{ marginTop: 14 }}>
          <label style={{ fontWeight: 700 }}>API Key</label>
          <textarea
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Paste your ${provider} API key...`}
            style={{
              width: "100%",
              minHeight: 84,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #333",
              background: "#0b0f14",
              color: "white",
              marginTop: 6,
              boxSizing: "border-box"
            }}
          />
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            background: loading ? "#3b82f680" : "#3b82f6",
            color: "white",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            border: "none"
          }}
        >
          {loading ? "Saving…" : "Save Settings"}
        </button>

        <button
          onClick={() => {
            setApiKey("");
            setProvider("ollama");
          }}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #444", background: "#111", color: "#eee" }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Popup;
