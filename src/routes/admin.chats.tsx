import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Conversation = {
  id: string;
  session_id: string;
  language: string | null;
  user_email: string | null;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export const Route = createFileRoute("/admin/chats")({
  component: AdminChats,
  head: () => ({ meta: [{ title: "Admin — Chats" }] }),
});

function AdminChats() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      navigate({ to: "/admin/login" });
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sess.session.user.id);
    const admin = (roles || []).some((r: { role: string }) => r.role === "admin");
    if (!admin) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);
    setConvs((data || []) as Conversation[]);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setMsgs([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", selected)
        .order("created_at", { ascending: true });
      setMsgs((data || []) as Message[]);
    })();
  }, [selected]);

  const del = async (id: string) => {
    if (!confirm("删除这条对话？")) return;
    await supabase.from("chat_conversations").delete().eq("id", id);
    if (selected === id) setSelected(null);
    load();
  };

  if (loading) return <div style={{ padding: 40 }}>加载中...</div>;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <aside style={{ width: 320, borderRight: "1px solid #eee", overflowY: "auto", background: "#fafafa" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #eee", background: "#fff" }}>
          <Link to="/admin" style={{ color: "#8b6f4e", fontSize: 13, textDecoration: "none" }}>
            ← 订单管理
          </Link>
          <h2 style={{ margin: "6px 0 0", fontSize: 16 }}>客服对话 ({convs.length})</h2>
        </div>
        {convs.length === 0 && (
          <div style={{ padding: 20, color: "#999", fontSize: 13 }}>暂无对话</div>
        )}
        {convs.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelected(c.id)}
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #eee",
              cursor: "pointer",
              background: selected === c.id ? "#fff" : "transparent",
            }}
          >
            <div style={{ fontSize: 12, color: "#888" }}>
              {new Date(c.updated_at).toLocaleString("zh-CN")}
            </div>
            <div style={{ fontSize: 13, color: "#333", marginTop: 4 }}>
              {c.user_email || `访客 ${c.session_id.slice(0, 8)}`}
            </div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{c.language}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                del(c.id);
              }}
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "#c44",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              删除
            </button>
          </div>
        ))}
      </aside>
      <main style={{ flex: 1, overflowY: "auto", padding: 20, background: "#f5f3ee" }}>
        {!selected && (
          <div style={{ color: "#999", textAlign: "center", marginTop: 80 }}>
            从左侧选择一个对话查看详情
          </div>
        )}
        {selected &&
          msgs.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: m.role === "user" ? "#c4654a" : "#fff",
                  color: m.role === "user" ? "#fff" : "#2d2d2d",
                  border: m.role === "user" ? "none" : "1px solid #e8e4dd",
                  whiteSpace: "pre-wrap",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>
                  {m.role === "user" ? "访客" : "AI 客服"} ·{" "}
                  {new Date(m.created_at).toLocaleString("zh-CN")}
                </div>
                {m.content}
              </div>
            </div>
          ))}
      </main>
    </div>
  );
}
