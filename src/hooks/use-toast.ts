import { toast as sonnerToast } from "sonner";

type ToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
};

export function toast({ title, description, variant }: ToastOptions) {
  const message = (title as string) ?? "";
  if (variant === "destructive") {
    return sonnerToast.error(message, { description: description as string });
  }
  return sonnerToast(message, { description: description as string });
}

export function useToast() {
  return { toast };
}