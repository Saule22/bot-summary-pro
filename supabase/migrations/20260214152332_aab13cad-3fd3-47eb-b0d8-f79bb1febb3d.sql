
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users manage own digests" ON public.digests;

-- Create a permissive policy instead
CREATE POLICY "Users manage own digests"
ON public.digests
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
