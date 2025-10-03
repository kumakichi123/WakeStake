"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

const DISMISS_KEY = "wake-pwa-install-dismissed";
const INSTALLED_KEY = "wake-pwa-installed";

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    ("standalone" in window.navigator && (window.navigator as any).standalone === true)
  );
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor;
  return /iphone|ipad|ipod/i.test(ua || "");
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadyDismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    const alreadyInstalled = isStandalone() || window.localStorage.getItem(INSTALLED_KEY) === "1";
    setDismissed(alreadyDismissed);

    if (alreadyInstalled || alreadyDismissed) {
      if (alreadyInstalled) {
        window.localStorage.setItem(INSTALLED_KEY, "1");
      }
      return;
    }

    let promptEvent: BeforeInstallPromptEvent | null = null;

    const handleBeforeInstallPrompt = (event: Event) => {
      if (isStandalone() || isIos()) return;
      event.preventDefault();
      promptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      window.localStorage.setItem(INSTALLED_KEY, "1");
      setVisible(false);
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    const handleDisplayModeChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const matches = "matches" in event ? event.matches : mediaQuery?.matches;
      if (matches) {
        window.localStorage.setItem(INSTALLED_KEY, "1");
        setVisible(false);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    mediaQuery?.addEventListener?.("change", handleDisplayModeChange as EventListener);
    mediaQuery?.addListener?.(handleDisplayModeChange as (this: MediaQueryList, ev: MediaQueryListEvent) => void);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery?.removeEventListener?.("change", handleDisplayModeChange as EventListener);
      mediaQuery?.removeListener?.(handleDisplayModeChange as (this: MediaQueryList, ev: MediaQueryListEvent) => void);
    };
  }, []);

  useEffect(() => {
    if (dismissed) setVisible(false);
  }, [dismissed]);

  if (!visible || !deferredPrompt || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    try {
      await deferredPrompt.prompt();
      const outcome = await deferredPrompt.userChoice;
      if (outcome.outcome === "accepted") {
        window.localStorage.setItem(INSTALLED_KEY, "1");
        setVisible(false);
        setDeferredPrompt(null);
        return;
      }
    } catch (error) {
      console.debug("[pwa-install]", error);
    }
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: "auto 0 16px 0",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      <div
        className="card"
        style={{
          pointerEvents: "auto",
          maxWidth: 420,
          width: "calc(100% - 32px)",
          padding: 20,
          display: "grid",
          gap: 12,
          boxShadow: "0 25px 45px -20px rgba(79,70,229,0.3)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <strong style={{ fontSize: 16 }}>Install WakeStake</strong>
          <span style={{ fontSize: 13, color: "#4b5563" }}>
            Get instant check-in access from your home screen. Offline ready, fast, and distraction-free.
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn" style={{ flex: 1, minWidth: 140 }} onClick={handleInstall}>
            Install app
          </button>
          <button
            type="button"
            className="btn link"
            style={{ flex: 1, minWidth: 120, textAlign: "center" }}
            onClick={handleDismiss}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

