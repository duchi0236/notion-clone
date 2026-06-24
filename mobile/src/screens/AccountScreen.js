import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { useServer } from "../config/ServerContext";
import { Button, Card, Field, SectionTitle } from "../components/ui";
import { colors, radius, spacing } from "../theme";

const ACCOUNT_KEY = "clawnote.account";

// NextAuth credentials 登录：先取 CSRF，再 POST callback。RN fetch 自带 cookie jar，
// 登录成功后的 session cookie 会自动附加到同源后续请求。
function formEncode(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

async function signIn(baseUrl, email, password) {
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const body = formEncode({ csrfToken, email, password, json: "true", callbackUrl: `${baseUrl}/clawnote` });
  const res = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  // NextAuth 在凭证错误时重定向回带 ?error= 的 URL
  const finalUrl = res.url || "";
  if (finalUrl.includes("error")) throw new Error("邮箱或密码不正确");
  return true;
}

export default function AccountScreen() {
  const api = useApi();
  const { baseUrl } = useServer();
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => { const raw = await AsyncStorage.getItem(ACCOUNT_KEY); if (raw) setAccount(JSON.parse(raw)); })();
  }, []));

  const persist = async (acc) => { setAccount(acc); await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(acc)); };

  const submit = async () => {
    if (!email.trim() || !password) { Alert.alert("请填写邮箱和密码"); return; }
    setBusy(true);
    try {
      if (mode === "register") {
        if (password.length < 6) throw new Error("密码至少 6 位");
        await api.register({ email: email.trim(), password, name: name.trim() || undefined });
        await signIn(baseUrl, email.trim().toLowerCase(), password);
        await persist({ email: email.trim().toLowerCase(), name: name.trim() || email.split("@")[0] });
        Alert.alert("注册成功", "已为你创建账号与专属工作区。");
      } else {
        await signIn(baseUrl, email.trim().toLowerCase(), password);
        await persist({ email: email.trim().toLowerCase(), name: email.split("@")[0] });
        Alert.alert("登录成功");
      }
      setPassword("");
    } catch (e) { Alert.alert(mode === "register" ? "注册失败" : "登录失败", e.message); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    try { await fetch(`${baseUrl}/api/auth/signout`, { method: "POST" }); } catch {}
    await AsyncStorage.removeItem(ACCOUNT_KEY);
    setAccount(null);
  };

  if (account) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
        <Card style={styles.profile}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(account.name || account.email).slice(0, 1).toUpperCase()}</Text></View>
          <Text style={styles.name}>{account.name}</Text>
          <Text style={styles.email}>{account.email}</Text>
        </Card>
        <Button title="退出登录" icon="log-out-outline" variant="ghost" onPress={signOut} style={{ marginTop: spacing.xl }} />
        <Text style={styles.hint}>提示：开发环境后端默认使用本地工作区；登录主要用于生产环境的账号隔离。</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.tabs}>
        {["login", "register"].map((m) => (
          <Text key={m} onPress={() => setMode(m)} style={[styles.tab, mode === m && styles.tabOn]}>{m === "login" ? "登录" : "注册"}</Text>
        ))}
      </View>
      <Card>
        {mode === "register" && (
          <>
            <Text style={styles.label}>昵称</Text>
            <Field value={name} onChangeText={setName} placeholder="你的名字（可选）" />
          </>
        )}
        <Text style={styles.label}>邮箱</Text>
        <Field value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
        <Text style={styles.label}>密码</Text>
        <Field value={password} onChangeText={setPassword} placeholder={mode === "register" ? "至少 6 位" : "密码"} secureTextEntry />
        <Button title={busy ? "请稍候…" : mode === "login" ? "登录" : "注册并登录"} icon="arrow-forward" onPress={submit} disabled={busy} style={{ marginTop: spacing.lg }} />
      </Card>
      <Text style={styles.hint}>{mode === "login" ? "首次使用请先注册一个账号。" : "注册会自动创建你的专属知识库工作区。"}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 20, marginBottom: spacing.lg, paddingHorizontal: 4 },
  tab: { fontSize: 18, fontWeight: "700", color: colors.textFaint, paddingBottom: 4 },
  tabOn: { color: colors.text, borderBottomWidth: 2, borderBottomColor: colors.primary },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.md, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.textFaint, marginTop: spacing.lg, lineHeight: 18, textAlign: "center" },
  profile: { alignItems: "center", paddingVertical: spacing.xl },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 26 },
  name: { fontSize: 18, fontWeight: "800", color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
