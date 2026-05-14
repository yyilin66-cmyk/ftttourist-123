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
