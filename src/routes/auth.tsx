import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({ meta: [{ title: "登录 — Four Tourist Travel" }] }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect || "/" });
    });
  }, [navigate, redirect]);

  const onGoogle = async () => {
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + (redirect || "/"),
    });
    if (result.error) setMsg(result.error.message || "谷歌登录失败");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + (redirect || "/"),
            data: { full_name: name },
          },
        });
        if (error) throw error;
      }
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
      if (e2) throw e2;
      navigate({ to: redirect || "/" });
    } catch (err: any) {
      setMsg(err.message || "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f3ee", fontFamily: "Inter, system-ui, sans-serif", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", padding: 32, borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,.08)" }}>
        <h1 style={{ fontSize: 24, marginBottom: 8, color: "#1a1a1a" }}>
          {mode === "signin" ? "欢迎回来" : "创建账号"}
        </h1>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
          登录后可保存预订记录、咨询历史
        </p>

        <button
          onClick={onGoogle}
          style={{
            width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: 8,
            background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 0 1 0-24c3 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.4-.4-3.5z"/></svg>
          使用 Google 账号登录
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: "#999", fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#eee" }} /> 或 <div style={{ flex: 1, height: 1, background: "#eee" }} />
        </div>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <input type="text" placeholder="姓名" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          )}
          <input type="email" required placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" required minLength={6} placeholder="密码 (至少 6 位)" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? "处理中..." : mode === "signin" ? "登录" : "注册并登录"}
          </button>
        </form>

        {msg && <p style={{ fontSize: 13, color: "#c44", marginTop: 12 }}>{msg}</p>}

        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}
          style={{ marginTop: 16, fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
        >
          {mode === "signin" ? "还没有账号? 注册" : "已有账号? 登录"}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none",
};
const btnStyle: React.CSSProperties = {
  padding: "12px", border: "none", borderRadius: 8, background: "#1a1a1a", color: "#fff",
  fontSize: 14, fontWeight: 500, cursor: "pointer",
};
