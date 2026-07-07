import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { LogOut, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearGoogleToken, setGoogleToken } from "@/lib/google-token";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Compact sign-in / user menu for embedding in app top-bars (e.g. the
 * Workspace header on /project). Shows a "Sign in" button when signed out
 * and an avatar dropdown when signed in.
 */
export function UserMenu() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      const t = (session as unknown as { provider_token?: string })
        ?.provider_token;
      if (t) setGoogleToken(t);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      const t = (session as unknown as { provider_token?: string })
        ?.provider_token;
      if (t) setGoogleToken(t);
      if (event === "SIGNED_OUT") clearGoogleToken();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else toast.success("Signed out");
  };

  if (!user) {
    return (
      <Button
        size="sm"
        onClick={() => navigate({ to: "/auth" })}
        className="h-8 px-3 text-xs"
      >
        Sign in
      </Button>
    );
  }

  const meta = user.user_metadata as { avatar_url?: string; full_name?: string };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={meta?.avatar_url} alt={user.email ?? ""} />
            <AvatarFallback>
              <UserIcon className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col space-y-0.5 px-2 py-1.5">
          <p className="text-sm font-medium leading-none">
            {meta?.full_name || user.email}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" /> <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}