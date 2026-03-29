"use client";

import { useSyncExternalStore, useCallback, useRef } from "react";

const AUTH_KEY = "ai-practice:authed";

function getSnapshot(): boolean {
  try {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const authed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const prompted = useRef(false);

  const tryAuth = useCallback(() => {
    const username = prompt("Tài khoản:");
    if (username !== "admin") {
      alert("Sai tài khoản!");
      return;
    }

    const password = prompt("Mật khẩu:");
    if (password !== "1234568") {
      alert("Sai mật khẩu!");
      return;
    }

    sessionStorage.setItem(AUTH_KEY, "1");
    window.dispatchEvent(new Event("storage"));
  }, []);

  // Auto-prompt once on first render if not authed
  if (!authed && !prompted.current) {
    prompted.current = true;
    // Use setTimeout to avoid blocking render
    if (typeof window !== "undefined") {
      setTimeout(tryAuth, 0);
    }
  }

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            Truy cập bị từ chối
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Nhập tài khoản và mật khẩu để tiếp tục.
          </p>
          <button
            onClick={tryAuth}
            className="px-4 py-2 bg-zinc-900 text-white! rounded-lg text-sm hover:bg-zinc-800 transition-colors"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
