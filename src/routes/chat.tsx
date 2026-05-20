import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "在线客服 — Four Tourist Travel" },
      { name: "description", content: "FTT 伊瓜苏旅游在线客服，关于瀑布游、接送、套餐的任何问题都可以咨询。" },
    ],
  }),
});

function getSessionId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("ftt_chat_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ftt_chat_session", id);
  }
  return id;
}

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "你好！我是 FTT 伊瓜苏旅游的在线客服 🌴 关于瀑布游览、机场接送、套餐价格、行程安排，有什么可以帮您的吗？",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          sessionId: getSessionId(),
          language: "zh",
          message: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: data.error || "出错了，请稍后再试" }]);
      } else {
        setConversationId(data.conversationId);
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "网络错误，请检查网络后重试" }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3ee", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e8e4dd",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <a href="/home.html" style={{ color: "#8b6f4e", textDecoration: "none", fontSize: 14 }}>
            ← 返回首页
          </a>
          <h1 style={{ margin: "4px 0 0", fontSize: 18, color: "#2d2d2d" }}>FTT 在线客服</h1>
        </div>
        <div style={{ fontSize: 12, color: "#888" }}>AI 助手 · 实时回复</div>
      </header>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          maxWidth: 760,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius: 12,
                background: m.role === "user" ? "#c4654a" : "#fff",
                color: m.role === "user" ? "#fff" : "#2d2d2d",
                border: m.role === "user" ? "none" : "1px solid #e8e4dd",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                fontSize: 14,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ color: "#888", fontSize: 13, padding: "4px 8px" }}>客服正在输入...</div>
        )}
      </div>

      <div
        style={{
          background: "#fff",
          borderTop: "1px solid #e8e4dd",
          padding: 16,
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 8 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="输入您的问题... (Enter 发送，Shift+Enter 换行)"
            rows={2}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1px solid #d4cfc4",
              borderRadius: 8,
              fontSize: 14,
              resize: "none",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: "0 20px",
              background: loading || !input.trim() ? "#ccc" : "#c4654a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
