-- Task activity log (GitHub-style events per workflow task)
CREATE TABLE public.task_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'opened','reopened','closed','commented',
    'status_changed','deadline_changed','assignee_changed',
    'attachment_added','link_added','edited'
  )),
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX task_activity_task_key_idx ON public.task_activity (task_key, created_at);
CREATE INDEX task_activity_user_id_idx ON public.task_activity (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_activity TO authenticated;
GRANT ALL ON public.task_activity TO service_role;

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

-- Visible to teammates in the same email domain (matches profiles pattern)
CREATE POLICY "View task activity in same domain"
ON public.task_activity FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p1.email_domain = p2.email_domain
    WHERE p1.id = auth.uid()
      AND p2.id = task_activity.user_id
      AND p1.email_domain IS NOT NULL
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Insert own task activity"
ON public.task_activity FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own task activity"
ON public.task_activity FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own task activity"
ON public.task_activity FOR DELETE TO authenticated
USING (auth.uid() = user_id);
