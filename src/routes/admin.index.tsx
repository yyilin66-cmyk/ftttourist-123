import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Booking = {
  id: string;
  package: string;
  arrival_date: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
  name: string;
  email: string;
  contact: string | null;
  hotel: string | null;
  notes: string | null;
  language: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
};

const STATUS_LABELS: Record<Booking["status"], string> = {
  pending: "待确认",
  confirmed: "已确认",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_COLORS: Record<Booking["status"], string> = {
  pending: "#f0ad4e",
  confirmed: "#5cb85c",
  completed: "#5bc0de",
  cancelled: "#999",
};

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Admin — FTT Bookings" }] }),
});

function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"all" | Booking["status"]>("all");
  const [userEmail, setUserEmail] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      navigate({ to: "/admin/login" });
      return;
    }
    setUserEmail(sess.session.user.email || "");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sess.session.user.id);
    const admin = (roles || []).some((r: any) => r.role === "admin");
    setIsAdmin(admin);

    if (admin) {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setBookings(data as Booking[]);
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      if (!sess) navigate({ to: "/admin/login" });
    });
    return () => sub.subscription.unsubscribe();
  }, [load, navigate]);

  const updateStatus = async (id: string, status: Booking["status"]) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (!error) setBookings((b) => b.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  const remove = async (id: string) => {
    if (!confirm("确认删除这条预订?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) setBookings((b) => b.filter((x) => x.id !== id));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  if (loading) {
    return <div style={{ padding: 40, fontFamily: "Inter, sans-serif" }}>加载中...</div>;
  }

  if (isAdmin === false) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Inter, sans-serif", background: "#f5f3ee" }}>
        <div style={{ background: "#fff", padding: 32, borderRadius: 12, maxWidth: 480, boxShadow: "0 10px 40px rgba(0,0,0,.08)" }}>
          <h2 style={{ marginBottom: 12 }}>未授权</h2>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
            你已登录 (<b>{userEmail}</b>),但还没有管理员权限。
          </p>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
            请联系开发者将你设为管理员。账号 ID 已记录,刷新本页可重试。
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => location.reload()} style={primaryBtn}>刷新</button>
            <button onClick={logout} style={ghostBtn}>退出</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3ee", padding: "24px 16px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, color: "#1a1a1a", margin: 0 }}>预订管理</h1>
            <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>
              已登录: {userEmail} · 共 {bookings.length} 条
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/" style={ghostBtnLink}>查看网站</Link>
            <button onClick={load} style={ghostBtn}>刷新</button>
            <button onClick={logout} style={ghostBtn}>退出</button>
          </div>
        </header>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                ...filterBtn,
                background: filter === k ? "#c4654a" : "#fff",
                color: filter === k ? "#fff" : "#333",
              }}
            >
              {k === "all" ? `全部 (${bookings.length})` : `${STATUS_LABELS[k]} (${bookings.filter((b) => b.status === k).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: "#fff", padding: 40, borderRadius: 12, textAlign: "center", color: "#999" }}>
            暂无预订
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((b) => (
              <article key={b.id} style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>
                      {new Date(b.created_at).toLocaleString("zh-CN")} · {b.language?.toUpperCase()}
                    </div>
                    <h3 style={{ fontSize: 17, margin: "0 0 4px", color: "#1a1a1a" }}>{b.package}</h3>
                    <div style={{ fontSize: 14, color: "#555" }}>
                      <b>{b.name}</b> · {b.adults} 成人{b.children > 0 ? ` + ${b.children} 儿童` : ""}
                    </div>
                  </div>
                  <span style={{ background: STATUS_COLORS[b.status], color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                    {STATUS_LABELS[b.status]}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, fontSize: 13, color: "#555", padding: "12px 0", borderTop: "1px solid #f0ebe3", borderBottom: "1px solid #f0ebe3" }}>
                  <div><b>邮箱:</b> <a href={`mailto:${b.email}`} style={{ color: "#c4654a" }}>{b.email}</a></div>
                  {b.contact && <div><b>WhatsApp/微信:</b> {b.contact}</div>}
                  {b.arrival_date && <div><b>到达:</b> {b.arrival_date}</div>}
                  {b.departure_date && <div><b>离开:</b> {b.departure_date}</div>}
                  {b.hotel && <div><b>酒店:</b> {b.hotel}</div>}
                </div>

                {b.notes && (
                  <div style={{ marginTop: 12, padding: 10, background: "#faf8f5", borderRadius: 6, fontSize: 13, color: "#555" }}>
                    <b>备注:</b> {b.notes}
                  </div>
                )}

                <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <select
                    value={b.status}
                    onChange={(e) => updateStatus(b.id, e.target.value as Booking["status"])}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }}
                  >
                    <option value="pending">待确认</option>
                    <option value="confirmed">已确认</option>
                    <option value="completed">已完成</option>
                    <option value="cancelled">已取消</option>
                  </select>
                  <a href={`mailto:${b.email}?subject=您的伊瓜苏预订 — ${encodeURIComponent(b.package)}`} style={smallBtn}>邮件回复</a>
                  {b.contact?.startsWith("+") && (
                    <a href={`https://wa.me/${b.contact.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" style={smallBtn}>WhatsApp</a>
                  )}
                  <button onClick={() => remove(b.id)} style={{ ...smallBtn, color: "#c44", borderColor: "#fcc" }}>删除</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = { padding: "8px 16px", background: "#c4654a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 };
const ghostBtn: React.CSSProperties = { padding: "8px 14px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontSize: 13 };
const ghostBtnLink: React.CSSProperties = { ...ghostBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" };
const filterBtn: React.CSSProperties = { padding: "8px 14px", border: "1px solid #ddd", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 500 };
const smallBtn: React.CSSProperties = { padding: "6px 12px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, cursor: "pointer", textDecoration: "none" };
