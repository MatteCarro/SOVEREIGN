"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  children,
  className,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "relative max-h-[88vh] w-full overflow-y-auto rounded-xl border border-border-strong bg-panel shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted hover:bg-raised hover:text-foreground"
          onClick={onClose}
          aria-label="Chiudi"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="border-b border-border px-5 py-4">
      <h2 className="font-display text-lg tracking-wide">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
    </div>
  );
}
