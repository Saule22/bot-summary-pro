
-- Channels table
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own channels" ON public.channels FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Keywords table
CREATE TABLE public.keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  word TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own keywords" ON public.keywords FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Messages table (collected from channels)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  message_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own messages" ON public.messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Digests table
CREATE TABLE public.digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ru',
  period TEXT NOT NULL DEFAULT 'day',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own digests" ON public.digests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
