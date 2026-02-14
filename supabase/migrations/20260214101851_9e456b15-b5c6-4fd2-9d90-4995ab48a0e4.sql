
-- Create table for generated posts
CREATE TABLE public.generated_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  source TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own posts"
  ON public.generated_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.generated_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert (from edge function)
CREATE POLICY "Service role can insert posts"
  ON public.generated_posts FOR INSERT
  WITH CHECK (true);
