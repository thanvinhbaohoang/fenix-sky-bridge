CREATE POLICY "Users can upload own task attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own task attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'task-attachments' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.email_domain = p2.email_domain
      WHERE p1.id = auth.uid()
        AND p2.id::text = (storage.foldername(name))[1]
        AND p1.email_domain IS NOT NULL
    )
  )
);

CREATE POLICY "Users can update own task attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own task attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
