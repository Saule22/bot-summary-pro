
-- Создаём таблицу для связи Telegram пользователей с Supabase users
CREATE TABLE IF NOT EXISTS public.telegram_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  telegram_chat_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Индекс для быстрого поиска по telegram_chat_id
CREATE INDEX idx_telegram_users_chat_id ON public.telegram_users(telegram_chat_id);

-- RLS политики
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Пользователи видят только свои данные
CREATE POLICY "Users can view their own telegram data"
  ON public.telegram_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи могут добавлять свой telegram_chat_id
CREATE POLICY "Users can insert their own telegram mapping"
  ON public.telegram_users
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
