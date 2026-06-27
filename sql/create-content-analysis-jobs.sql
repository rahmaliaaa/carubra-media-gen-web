CREATE TABLE IF NOT EXISTS public.content_analysis_jobs (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  platform text NOT NULL,
  target_audience text,
  status text NOT NULL,
  result jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.content_analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own content analysis jobs"
  ON public.content_analysis_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content analysis jobs"
  ON public.content_analysis_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content analysis jobs"
  ON public.content_analysis_jobs FOR UPDATE
  USING (auth.uid() = user_id);
