// ClawNote 手机客户端（Expo + WebView 壳）。
// 复用整套 web 产品：开发时通过 Expo 的 hostUri 自动推导出开发机的局域网 IP，
// 直接加载同一台机器上跑着的 Next 服务（:3001）；发布时在 app.json 的
// expo.extra.serverUrl 配置正式环境地址即可。
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import { WebView } from "react-native-webview";

function resolveServerUrl() {
  const configured = Constants.expoConfig?.extra?.serverUrl;
  if (configured) return configured;
  // hostUri 形如 "192.168.1.23:8081"（Expo Go 开发模式）→ 同一台机器的 :3001
  const hostUri = Constants.expoConfig?.hostUri || "";
  const host = hostUri.split(":")[0];
  if (host) return `http://${host}:3001/clawnote`;
  return "http://localhost:3001/clawnote";
}

export default function App() {
  const webRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const url = resolveServerUrl();

  // 安卓物理返回键：优先 WebView 内后退
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
      {error ? (
        <View style={styles.center}>
          <Text style={styles.logo}>C</Text>
          <Text style={styles.title}>连不上 ClawNote 服务</Text>
          <Text style={styles.desc}>
            请确认电脑上已运行 npm run dev（:3001），且手机和电脑在同一 Wi-Fi。
          </Text>
          <Text style={styles.url}>{url}</Text>
          <TouchableOpacity style={styles.btn} onPress={reload}>
            <Text style={styles.btnText}>重试</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: url }}
          style={styles.web}
          onLoadEnd={() => setLoading(false)}
          onError={() => setError(true)}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode >= 500) setError(true);
          }}
          onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          domStorageEnabled
          javaScriptEnabled
          setSupportMultipleWindows={false}
        />
      )}
        {loading && !error && (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator size="large" color="#0f172a" />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },
  web: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffffcc",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#0f172a",
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 64,
    overflow: "hidden",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: "600", color: "#0f172a", marginBottom: 8 },
  desc: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 20, marginBottom: 8 },
  url: { fontSize: 12, color: "#94a3b8", marginBottom: 20 },
  btn: { backgroundColor: "#0f172a", borderRadius: 10, paddingHorizontal: 28, paddingVertical: 10 },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
