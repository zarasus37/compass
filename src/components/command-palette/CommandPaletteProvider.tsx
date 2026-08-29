"use client";

/**
 * Cluster 7.1 — Command palette provider.
 *
 * The provider owns the open/close state + the global keyboard
 * listener for ⌘K / Ctrl+K. Any component inside the provider
 * can call `useCommandPalette()` to get `{ open, close, toggle,
 * isOpen }`. The `<CommandPalette />` (the modal drawer) is
 * rendered by the provider itself, so consumers don't need to
 * remember to mount it.
 *
 * The provider takes the search index as a prop (from the
 * server component layout). The index is JSON-serializable, so
 * it crosses the server→client boundary cleanly. No fetch
 * round-trip on open.
 *
 * The keyboard listener is attached to `window` on mount and
 * removed on unmount. We do NOT preventDefault on the ⌘K
 * keystroke when no input is focused — we want the address
 * bar to NOT trigger this shortcut. We do preventDefault
 * when a form input IS focused (so the keystroke doesn't
 * insert into the form). Either way, the keystroke is
 * captured here.
 */

import * as React from "react";
import type { SearchIndex } from "@/lib/command-palette/types";
import { CommandPalette } from "./CommandPalette";

interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: boolean;
}

const CommandPaletteContext =
  React.createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = React.useContext(CommandPaletteContext);
  if (ctx === null) {
    throw new Error(
      "useCommandPalette must be called inside <CommandPaletteProvider>",
    );
  }
  return ctx;
}

export function CommandPaletteProvider({
  searchIndex,
  children,
}: {
  searchIndex: SearchIndex;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((v) => !v), []);

  // Global ⌘K / Ctrl+K shortcut.
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isK = e.key === "k" || e.key === "K";
      const isMod = e.metaKey || e.ctrlKey;
      if (isK && isMod && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setIsOpen((v) => !v);
        return;
      }
      // Escape closes if the palette is open and the user
      // hasn't focused the search input (the input has its
      // own Escape handler).
      if (e.key === "Escape" && isOpen) {
        const tag = (document.activeElement as HTMLElement | null)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          setIsOpen(false);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  // Body scroll lock while the palette is open.
  React.useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const value = React.useMemo<CommandPaletteContextValue>(
    () => ({ open, close, toggle, isOpen }),
    [open, close, toggle, isOpen],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette
        searchIndex={searchIndex}
        isOpen={isOpen}
        onClose={close}
      />
    </CommandPaletteContext.Provider>
  );
}
