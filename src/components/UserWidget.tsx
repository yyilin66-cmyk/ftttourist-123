import { useLocation, Link } from "@tanstack/react-router";
import { useUser, signOut } from "@/hooks/use-user";
import { useState } from "react";

export function UserWidget() {
  const { user, profile, loading } = useUser();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Hide on auth & admin pages
  if (location.pathname.startsWith("/auth") || location.pathname.startsWith("/admin")) {
    return null;
  }
  if (loading) return null;

  const wrapStyle: React.CSSProperties = {
    position: "fixed", top: 12, right: 12, zIndex: 50,
    fontFamily: "Inter, system-ui, sans-serif",
  };

  if (!user) {
    return (
      <div style={wrapStyle}>
        <Link
          to="/auth"
          search={{ redirect: location.pathname }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 999,
            background: "rgba(255,255,255,0.95)", color: "#1a1a1a",
            border: "1px solid rgba(0,0,0,0.08)", textDecoration: "none",
            fontSize: 13, fontWeight: 500, boxShadow: "0 2px 8px rgba(0,0,0,.06)",
          }}
        >
          登录
        </Link>
      </div>
    );
  }

  const initial = (profile?.full_name || user.email || "U").charAt(0).toUpperCase();
  const avatar = profile?.avatar_url;

  return (
    <div style={wrapStyle}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "1px solid rgba(0,0,0,0.08)", padding: 0, cursor: "pointer",
          background: avatar ? `url(${avatar}) center/cover` : "#1a1a1a",
          color: "#fff", fontSize: 14, fontWeight: 600,
          boxShadow: "0 2px 8px rgba(0,0,0,.1)",
        }}
        aria-label="账号"
      >
        {!avatar && initial}
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: 44, right: 0, minWidth: 220,
            background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.12)",
            padding: 12, fontSize: 13,
          }}
        >
          <div style={{ padding: "6px 8px", color: "#1a1a1a", fontWeight: 600 }}>
            {profile?.full_name || "已登录"}
          </div>
          <div style={{ padding: "0 8px 8px", color: "#666", fontSize: 12, wordBreak: "break-all" }}>
            {user.email}
          </div>
          <button
            onClick={async () => { await signOut(); setOpen(false); }}
            style={{
              width: "100%", textAlign: "left", padding: "8px",
              background: "none", border: "none", cursor: "pointer",
              borderRadius: 6, color: "#c44", fontSize: 13,
            }}
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
