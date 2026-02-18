
-- Add type column to channels to distinguish own channels from research sources
ALTER TABLE public.channels ADD COLUMN type text NOT NULL DEFAULT 'own';

-- Create index for filtering by type
CREATE INDEX idx_channels_type ON public.channels (type);
