"use client";

import { useEffect, useState } from "react";

const endpoint = "/api/auth/wechat/qrconnect";
type WechatMode = "website" | "mock";

export function useWechatLoginMode() {
  const [mode, setMode] = useState<WechatMode | null>(null);
  useEffect(() => {
    const request = new AbortController();
    void fetch(endpoint, { cache: "no-store", signal: request.signal })
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        if (!request.signal.aborted && (result?.mode === "website" || result?.mode === "mock")) setMode(result.mode);
      })
      .catch(() => {});
    return () => request.abort();
  }, []);
  return mode;
}

export async function beginWechatLogin(input: { bind?: boolean; next?: string }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.authUrl !== "string") {
    throw new Error(typeof result.error === "string" ? result.error : "无法打开微信授权，请重试");
  }
  window.location.assign(result.authUrl);
}
