import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BookingSchema = z.object({
  package: z.string().min(1).max(200),
  arrival_date: z.string().max(20).optional().nullable(),
  departure_date: z.string().max(20).optional().nullable(),
  adults: z.coerce.number().int().min(1).max(50),
  children: z.coerce.number().int().min(0).max(50),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  contact: z.string().trim().max(100).optional().nullable(),
  hotel: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  language: z.enum(["zh", "en"]).optional(),
});

const ADMIN_EMAIL = "yyilin66@gmail.com";
const SENDER_DOMAIN = "notify.tourism.interviewtracker.org";
const FROM_DOMAIN = "tourism.interviewtracker.org";

type BookingEmailData = z.infer<typeof BookingSchema> & { id: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[char];
  });
}

function renderAdminBookingEmail(booking: BookingEmailData) {
  const subject = `新预订：${booking.package} — ${booking.name}`;
  const rows = [
    ["套餐", booking.package],
    ["客人", booking.name],
    ["邮箱", booking.email],
    ["联系方式", booking.contact || "未填写"],
    ["到达", booking.arrival_date || "未填写"],
    ["离开", booking.departure_date || "未填写"],
    ["人数", `${booking.adults} 成人${booking.children > 0 ? ` + ${booking.children} 儿童` : ""}`],
    ["酒店", booking.hotel || "未填写"],
    ["备注", booking.notes || "无"],
    ["订单 ID", booking.id],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #eee;color:#666;width:120px;">${escapeHtml(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;color:#111;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return {
    subject,
    text: rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111;"><h2 style="margin:0 0 16px;">收到新的旅游预订</h2><table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;">${htmlRows}</table><p style="margin-top:16px;color:#666;font-size:13px;">请登录后台查看和处理订单。</p></div>`,
  };
}

async function enqueueAdminNotification(booking: BookingEmailData) {
  const messageId = crypto.randomUUID();
  const unsubscribeToken = crypto.randomUUID();
  const email = renderAdminBookingEmail(booking);

  const { data: tokenRow } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .upsert(
      { email: ADMIN_EMAIL, token: unsubscribeToken },
      { onConflict: "email", ignoreDuplicates: true },
    )
    .select("token")
    .single();

  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: "booking_admin_notification",
    recipient_email: ADMIN_EMAIL,
    status: "pending",
  });

  const { error } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: ADMIN_EMAIL,
      from: `Four Tourist Travel <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: email.subject,
      html: email.html,
      text: email.text,
      purpose: "transactional",
      label: "booking_admin_notification",
      idempotency_key: `booking-admin-${booking.id}`,
      unsubscribe_token: tokenRow?.token || unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });

  if (error) {
    console.error("Booking notification enqueue error:", error);
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "booking_admin_notification",
      recipient_email: ADMIN_EMAIL,
      status: "failed",
      error_message: "Failed to enqueue booking notification",
    });
  }
}

export const Route = createFileRoute("/api/public/bookings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const data = BookingSchema.parse(body);

          const { data: inserted, error } = await supabaseAdmin
            .from("bookings")
            .insert({
              package: data.package,
              arrival_date: data.arrival_date || null,
              departure_date: data.departure_date || null,
              adults: data.adults,
              children: data.children,
              name: data.name,
              email: data.email,
              contact: data.contact || null,
              hotel: data.hotel || null,
              notes: data.notes || null,
              language: data.language || "zh",
            })
            .select("id")
            .single();

          if (error) {
            console.error("Booking insert error:", error);
            return Response.json({ error: "Failed to save booking" }, { status: 500 });
          }

          await enqueueAdminNotification({ ...data, id: inserted.id });

          return Response.json({ success: true, id: inserted.id });
        } catch (err) {
          if (err instanceof z.ZodError) {
            return Response.json({ error: "Invalid input", details: err.issues }, { status: 400 });
          }
          console.error("Booking error:", err);
          return Response.json({ error: "Server error" }, { status: 500 });
        }
      },
    },
  },
});
