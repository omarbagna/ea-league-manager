-- Storage bucket for match evidence screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'match-evidence',
  'match-evidence',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own folder
CREATE POLICY "Users upload own evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'match-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users read evidence for their matches"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'match-evidence');

CREATE POLICY "Admins manage evidence"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'match-evidence'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
