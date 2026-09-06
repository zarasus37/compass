/**
 * PWA install prompt.
 *
 * Cluster 7.16. Two surfaces:
 *   - iOS Safari: detects the `navigator.standalone !== true` case and
 *     surfaces a 1-line floating tip at the bottom: "tap share → Add to
 *     Home Screen". Dismissable with ×. Dismissal stored in localStorage
 *     so it doesn't re-show.
 *   - Android Chrome: listens for `beforeinstallprompt`, surfaces a soft
 *     "Install Compass" button in the bottom-right. Same dismiss logic.
 *
 * Desktop: no prompt.
 *
 * Renders nothing when the app is already installed, dismissed, or
 * running in a non-PWA-capable context.
 */
"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "compass:pwa-install-dismissed";

type IosState = "show" | "installed" | "dismissed" | "other";
type AndroidState = "show" | "installed" | "dismissed" | "other";

function detectIos(): IosState {
  if (typeof window === "undefined") return "other";
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
  if (!isIos) return "other";
  // navigator.standalone is the iOS Safari "added to home screen" flag.
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
    return "installed";
  }
  if (window.localStorage.getItem(DISMISS_KEY) === "1") return "dismissed";
  return "show";
}

export function InstallPrompt() {
  const [ios, setIos] = useState<IosState>("other");
  const [androidEvent, setAndroidEvent] = useState<null | Event>(null);
  const [androidDismissed, setAndroidDismissed] = useState(false);

  useEffect(() => {
    setIos(detectIos());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (window.localStorage.getItem(DISMISS_KEY) === "1") {
        setAndroidDismissed(true);
        return;
      }
      setAndroidEvent(e);
    };
    const onAppInstalled = () => {
      setAndroidEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setIos("dismissed");
    setAndroidDismissed(true);
  };

  const installAndroid = async () => {
    if (!androidEvent) return;
    // The event is a BeforeInstallPromptEvent; cast for the prompt() call.
    const promptEvent = androidEvent as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      setAndroidEvent(null);
    } else {
      dismiss();
    }
  };

  // iOS Safari tip — small floating bar at the bottom.
  if (ios === "show") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--ink-2)] shadow-[0_4px_20px_rgba(0,0,0,0.4)] md:hidden"
      >
        <span className="flex-1">
          // install: tap <span aria-hidden="true">⎋</span> share →{" "}
          <strong className="text-[var(--ink)]">Add to Home Screen</strong>
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install tip"
          className="rounded p-1 text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          ×
        </button>
      </div>
    );
  }

  // Android Chrome — soft install button.
  if (androidEvent && !androidDismissed) {
    return (
      <div className="fixed bottom-3 right-3 z-50">
        <button
          type="button"
          onClick={installAndroid}
          className="rounded border border-[var(--terminal-cyan)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--terminal-cyan)] hover:bg-[var(--surface-2)]"
        >
          ⤓ Install Compass
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install"
          className="ml-2 rounded p-1 text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          ×
        </button>
      </div>
    );
  }

  return null;
}
