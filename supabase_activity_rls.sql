-- Enable RLS for activity table
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;

-- Policy: Kullanıcı kendi aktivitelerini görebilsin
CREATE POLICY "Users can view own activity" ON public.activity
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Kullanıcı kendi aktivitesini ekleyebilsin
CREATE POLICY "Users can insert own activity" ON public.activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);
