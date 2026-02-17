-- Add missing UPDATE and DELETE RLS policies

-- telegram_users: UPDATE
CREATE POLICY "Users can update their own telegram data"
  ON public.telegram_users
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- telegram_users: DELETE
CREATE POLICY "Users can delete their own telegram data"
  ON public.telegram_users
  FOR DELETE
  USING (auth.uid() = user_id);

-- subscriptions: UPDATE
CREATE POLICY "Users can update own subscription"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- subscriptions: DELETE
CREATE POLICY "Users can delete own subscription"
  ON public.subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- generated_posts: UPDATE
CREATE POLICY "Users can update their own posts"
  ON public.generated_posts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);