import json
from flask import Flask, flash, request, jsonify
from flask_cors import CORS
import subprocess
import requests
import time
import psutil

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

OLLAMA_URL = "http://127.0.0.1:11434"

OLLAMA_CMD = ["ollama", "serve"]


# Check if Ollama is running

def is_ollama_running():
    try:
        r = requests.get(OLLAMA_URL, timeout=2)
        return r.status_code == 200
    except:
        for p in psutil.process_iter(['name', 'cmdline']):
            cmd = " ".join(p.info.get('cmdline') or [])
            if "ollama" in cmd.lower():
                return True
        return False


# Start ollama if not running

def start_ollama():
    if is_ollama_running():
        return True

    subprocess.Popen(
        OLLAMA_CMD,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    for _ in range(15):
        if is_ollama_running():
            return True
        time.sleep(1)

    return False


# /ask endpoint — clean & fixed

@app.route("/ask", methods=["POST"])
def ask():
    payload = request.get_json(force=True)
    prompt = payload.get("prompt", "")
    model = payload.get("model", "phi3:3.8b-mini-128k-instruct-q4_0")

    # Start Ollama if needed
    if not start_ollama():
        return jsonify({"response": "❌ Could not start Ollama"}), 500

    try:
        # Send prompt to Ollama
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": model, "prompt": prompt, "stream": True},
            stream=True,
            timeout=240
        )

        final_text = ""

        # Read streaming JSON lines
        for line in resp.iter_lines():
            if not line:
                continue

            try:
                obj = json.loads(line.decode("utf-8"))
                chunk = obj.get("response", "")
                final_text += chunk
            except:
                continue

        # Fallback: if nothing received
        if not final_text.strip():
            final_text = "⚠ No hint generated."

        return jsonify({"response": final_text.strip()})

    except Exception as e:
        return jsonify({"response": f"❌ Error: {str(e)}"}), 500


@app.route("/")
def home():
    return "✅ ThinkBuddy Flask Server is running!"


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
