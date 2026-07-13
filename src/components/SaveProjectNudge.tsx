import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, BookmarkCheck, X, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  applicationNumber: string;
  title: string;
};

/**
 * Floating bottom-left nudge that offers to save the current application
 * as a project on the user's profile. If the user is signed out, the
 * nudge prompts them to sign in first. Dismissals are remembered per
 * application number for the browser session.
 */
export function SaveProjectNudge({ applicationNumber, title }: Props) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const dismissKey = `nudge-dismissed:${applicationNumber}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(sessionStorage.getItem(dismissKey) === "1");
    }
  }, [dismissKey]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setSavedId(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
      .eq("application_number", applicationNumber)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSavedId(data?.id ?? null);
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, applicationNumber]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        application_number: applicationNumber,
        title: title || `Application ${applicationNumber}`,
        status: "saved",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast({
        title: "Couldn't save project",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setSavedId(data.id);
    toast({ title: "Project saved", description: "You can find it in your dashboard." });
  };

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") sessionStorage.setItem(dismissKey, "1");
  };

  if (checking || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <AnimatePresence mode="wait">
        {savedId ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              to="/app"
              className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/90 backdrop-blur px-3 py-2 text-xs text-zinc-100 shadow-lg hover:bg-zinc-800"
            >
              <BookmarkCheck className="h-3.5 w-3.5 text-emerald-400" />
              Saved · View in dashboard
            </Link>
          </motion.div>
        ) : !user ? (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="w-72 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur p-3 shadow-xl"
          >
            <div className="flex items-start gap-2">
              <Bookmark className="h-4 w-4 mt-0.5 text-zinc-300 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-100">Save this project</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Sign in to keep this application in your dashboard.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button asChild size="sm" className="h-7 px-2 text-xs">
                    <Link to="/auth">Sign in</Link>
                  </Button>
                  <button
                    onClick={dismiss}
                    className="text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Not now
                  </button>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="text-zinc-500 hover:text-zinc-200"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="save"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="w-72 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur p-3 shadow-xl"
          >
            <div className="flex items-start gap-2">
              <Bookmark className="h-4 w-4 mt-0.5 text-zinc-300 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-100">Save this project</p>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                  Keep {applicationNumber} in your dashboard for quick access.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-7 px-2 text-xs"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving…
                      </>
                    ) : (
                      "Save project"
                    )}
                  </Button>
                  <button
                    onClick={dismiss}
                    className="text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Not now
                  </button>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="text-zinc-500 hover:text-zinc-200"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}