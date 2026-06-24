// 服务器地址 + 可选 Token 的全局配置（AsyncStorage 持久化）。
// 开发时自动从 Expo hostUri 推导出开发机局域网 IP（Next 跑在 :3001）。
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const STORE_KEY = "clawnote.server";

function inferDevBaseUrl() {
  const configured = Constants.expoConfig?.extra?.serverUrl;
  if (configured) return String(configured).replace(/\/clawnote\/?$/, "");
  const hostUri = Constants.expoConfig?.hostUri || "";
  const host = hostUri.split(":")[0];
  if (host) return `http://${host}:3001`;
  return "http://localhost:3001";
}

const ServerContext = createContext(null);

export function ServerProvider({ children }) {
  const [baseUrl, setBaseUrl] = useState(inferDevBaseUrl());
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.baseUrl) setBaseUrl(saved.baseUrl);
          if (saved.token) setToken(saved.token);
        }
      } catch (e) {
        // 忽略读取失败，使用默认
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const save = useCallback(async (next) => {
    const nextBase = (next.baseUrl ?? baseUrl).trim().replace(/\/+$/, "");
    const nextToken = (next.token ?? token).trim();
    setBaseUrl(nextBase);
    setToken(nextToken);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify({ baseUrl: nextBase, token: nextToken }));
  }, [baseUrl, token]);

  const value = useMemo(() => ({ baseUrl, token, ready, save }), [baseUrl, token, ready, save]);
  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}

export function useServer() {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error("useServer must be used within ServerProvider");
  return ctx;
}
