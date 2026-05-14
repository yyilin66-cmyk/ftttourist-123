import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
  head: () => ({ meta: [{ title: "Admin Login — FTT" }] }),
});

function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        setMsg("账号已创建,正在登录...");
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
      navigate({ to: "/admin" });
    } catch (err: any) {
      setMsg(err.message || "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f3ee", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", padding: 40, borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,.08)" }}>
        <h1 style={{ fontSize: 24, marginBottom: 8, color: "#1a1a1a" }}>管理后台</h1>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
          {mode === "signin" ? "登录查看预订" : "首次使用,创建管理员账号"}
        </p>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email"
            required
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="密码 (至少 6 位)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? "处理中..." : mode === "signin" ? "登录" : "创建并登录"}
          </button>
        </form>
        {msg && <p style={{ fontSize: 13, color: "#c44", marginTop: 12 }}>{msg}</p>}
        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}
          style={{ marginTop: 16, fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
        >
          {mode === "signin" ? "首次使用?创建账号" : "已有账号?去登录"}
        </button>
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #eee" }}>
          <Link to="/" style={{ fontSize: 13, color: "#999" }}>← 返回网站</Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: "#c4654a",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};
