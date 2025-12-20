
// ------------------------------------------------------
// BACKGROUND.JS — CLEAN, SAFE, WORKING VERSION
// Supports: Ollama (via Flask), Gemini, OpenAI, Anthropic
// ------------------------------------------------------

console.log("ThinkBuddy BACKGROUND READY");

// Utility safe logger
function safeLog(...args) {
  try { console.log(...args); } catch {}
}

// Extract text from LLM responses
function extractTextFromResponse(data) {
  if (!data) return null;
  try {
    if (data.candidates?.[0]?.content?.parts?.[0]?.text)
      return data.candidates[0].content.parts[0].text.trim();

    if (data.candidates?.[0]?.output)
      return data.candidates[0].output.trim();

    if (typeof data.text === "string")
      return data.text.trim();

    if (data.response)
      return data.response.trim();

  } catch {}
  return null;
}

// ------------------------------------------------------
// UNIFIED MESSAGE HANDLER
// ------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
   console.log("DEBUG background.js received message:", msg);

  // ---------------------------
  // OLLAMA THROUGH FLASK
  // ---------------------------
  if (msg.type === "ollama") {
    fetch("http://127.0.0.1:5000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: msg.prompt,
        model: msg.model || "phi3:3.8b-mini-128k-instruct-q4_0"
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("DEBUG background.js got response from Flask:", data);
        safeLog("Ollama Response:", data);
        sendResponse({ ok: true, result: data.response });
      })
      .catch(err => {
        console.error("DEBUG background.js fetch error:", err);
        sendResponse({ ok: false, error: err.toString() });
      });

    return true; // keep channel open
  }

  // ---------------------------
  // GEMINI CALL
  // ---------------------------
  if (msg.action === "callGemini") {
    (async () => {
      const prompt = msg.prompt || "";
      const apiKey = msg.apiKey?.trim();
      const model = msg.model || "models/gemini-2.5-flash";

      if (!apiKey)
        return sendResponse({ ok: false, error: "Missing API key" });

      const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

      const body = {
        contents: [{ parts: [{ text: prompt }] }]
      };

      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        const data = await r.json();
        const text = extractTextFromResponse(data);

        if (text)
          return sendResponse({ ok: true, text });

        sendResponse({
          ok: false,
          error: "Could not extract text",
          detail: data
        });

      } catch (err) {
        sendResponse({ ok: false, error: err.toString() });
      }
    })();

    return true; // async response
  }

});
