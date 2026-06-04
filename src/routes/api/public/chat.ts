import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const BodySchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  sessionId: z.string().min(1).max(128),
  language: z.enum(["zh", "en"]).default("zh"),
  message: z.string().min(1).max(2000),
  userEmail: z.string().email().max(255).optional().nullable(),
});

const SYSTEM_PROMPT_ZH = `你是 Four Tourist Travel (FTT) 的中文客服助理。FTT 是位于阿根廷伊瓜苏港 (Puerto Iguazú) 的华人家庭旅行社，自 2011 年开始为华人游客提供本地旅游服务。

业务包括：
- 机场/酒店接送 (Transfers)：伊瓜苏机场往返酒店
- 阿根廷瀑布一日游 (Cataratas Argentinas)
- 巴西瀑布一日游 (Cataratas Brasileras)
- 圣伊格纳西奥耶稣会遗址 + Wanda 宝石矿一日游
- 多日套餐组合 (Combos)
- 中文导游、华人司机、定制行程

服务理念：本地家庭经营、纯中文服务、价格透明、灵活定制。

请用简洁、亲切、专业的中文回答。如果用户询问报价、具体日期或预订，请引导他们到 /booking.html 页面提交预订表单，或访问对应业务页面 (/transfers.html, /cataratas-argentinas.html, /cataratas-brasileras.html, /san-ignacio-wanda.html, /combos.html, /contact.html) 了解详情。不要编造价格，让用户提交表单获取最新报价。`;

const SYSTEM_PROMPT_EN = `You are the customer service assistant for Four Tourist Travel (FTT), a Chinese family-run travel agency based in Puerto Iguazú, Argentina since 2011.

Services: airport/hotel transfers, Argentinian Falls day tour, Brazilian Falls day tour, San Ignacio + Wanda mines tour, multi-day combo packages, Chinese-speaking guides.

Answer concisely and warmly. For pricing or booking, guide users to /booking.html or the relevant service page. Never invent prices — direct users to submit the booking form for the latest quote.`;

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let parsed;
        try {
          parsed = BodySchema.parse(await request.json());
        } catch (err) {
          return new Response(JSON.stringify({ error: "Invalid request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Get or create conversation
        let conversationId = parsed.conversationId ?? null;
        if (!conversationId) {
          const { data: conv, error: convErr } = await supabaseAdmin
            .from("chat_conversations")
            .insert({
              session_id: parsed.sessionId,
              language: parsed.language,
              user_email: parsed.userEmail ?? null,
            })
            .select("id")
            .single();
          if (convErr || !conv) {
            return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          conversationId = conv.id;
        }

        // Save user message
        await supabaseAdmin.from("chat_messages").insert({
          conversation_id: conversationId,
          role: "user",
          content: parsed.message,
        });

        // Load conversation history (last 30)
        const { data: history } = await supabaseAdmin
          .from("chat_messages")
          .select("role, content")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(30);

        const systemPrompt = parsed.language === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;
        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("openai/gpt-5-mini");

        let reply: string;
        try {
          const result = await generateText({
            model,
            system: systemPrompt,
            messages: (history ?? []).map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          });
          reply = result.text;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "AI request failed";
          const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
          return new Response(
            JSON.stringify({
              error:
                status === 429
                  ? "请求过于频繁，请稍后再试"
                  : status === 402
                    ? "AI 额度已用尽，请联系管理员充值"
                    : "AI 暂时不可用，请稍后再试",
            }),
            { status, headers: { "Content-Type": "application/json" } },
          );
        }

        // Save assistant reply
        await supabaseAdmin.from("chat_messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: reply,
        });

        // Bump updated_at
        await supabaseAdmin
          .from("chat_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);

        return new Response(
          JSON.stringify({ conversationId, reply }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
