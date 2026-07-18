
CREATE POLICY "Admins manage client-photos select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'client-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage client-photos insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage client-photos update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'client-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage client-photos delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));
