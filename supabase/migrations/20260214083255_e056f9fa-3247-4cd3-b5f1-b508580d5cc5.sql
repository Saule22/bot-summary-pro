
CREATE TABLE public.telegram_user_states (
  telegram_chat_id BIGINT PRIMARY KEY,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_user_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.telegram_user_states
  FOR ALL USING (false);
