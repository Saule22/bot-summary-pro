
-- Fix: restrict INSERT to authenticated users inserting their own posts
DROP POLICY "Service role can insert posts" ON public.generated_posts;

CREATE POLICY "Users can insert their own posts"
  ON public.generated_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
