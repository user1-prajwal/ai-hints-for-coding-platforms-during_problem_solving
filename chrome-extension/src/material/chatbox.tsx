

// src/material/ChatBox.tsx
import React, { useEffect, useRef, useState } from "react";

// Fixed Button component for TypeScript
const Button: React.FC<React.PropsWithChildren<{ onClick: () => void; loading?: boolean }>> = ({
  onClick,
  loading,
  children,
}) => {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: "8px",
        backgroundColor: "#2563eb",
        color: "white",
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
      }}
      disabled={loading}
    >
      {loading ? "..." : children}
    </button>
  );
};

interface ChatHistory {
  role: "user" | "assistant";
  content: string;
}

interface ChatBoxProps {
  visible: boolean;
  problemStatement: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ visible, problemStatement }) => {
  const [value, setValue] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Scroll to last message automatically
  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  const sendMessage = () => {
    if (!value.trim()) return;

    const userMessage: ChatHistory = { role: "user", content: value };
    setChatHistory((prev) => [...prev, userMessage]);
    setValue("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const botMessage: ChatHistory = {
        role: "assistant",
        content: `AI Response for: "${userMessage.content}"`,
      };
      setChatHistory((prev) => [...prev, botMessage]);
      setIsLoading(false);
    }, 1000);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        width: "400px",
        height: "500px",
        backgroundColor: "#f3f4f6",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px",
          backgroundColor: "#2563eb",
          color: "white",
          fontWeight: "bold",
        }}
      >
        Need Help?
      </div>

      <div style={{ padding: "8px", color: "#374151", borderBottom: "1px solid #D1D5DB" }}>
        {problemStatement}
      </div>

      <div style={{ flex: 1, padding: "8px", overflowY: "auto" }}>
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            style={{
              padding: "8px",
              borderRadius: "8px",
              backgroundColor: msg.role === "user" ? "#BFDBFE" : "#E5E7EB",
              marginLeft: msg.role === "user" ? "auto" : "0",
              marginBottom: "4px",
            }}
          >
            {msg.content}
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              padding: "8px",
              backgroundColor: "#E5E7EB",
              borderRadius: "8px",
              width: "96px",
              marginBottom: "4px",
              animation: "pulse 1s infinite",
            }}
          />
        )}

        <div ref={lastMessageRef} />
      </div>

      <div style={{ padding: "8px", display: "flex", gap: "8px" }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid #D1D5DB",
          }}
        />
        <Button loading={isLoading} onClick={sendMessage}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatBox;


