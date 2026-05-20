
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  language TEXT DEFAULT 'zh',
  user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_conversations_session ON public.chat_conversations(session_id);
CREATE INDEX idx_chat_conversations_created ON public.chat_conversations(created_at DESC);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conv ON public.chat_messages(conversation_id, created_at);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create conversations"
  ON public.chat_conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view all conversations"
  ON public.chat_conversations FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete conversations"
  ON public.chat_conversations FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert messages"
  ON public.chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view all messages"
  ON public.chat_messages FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_chat_conv_updated
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
