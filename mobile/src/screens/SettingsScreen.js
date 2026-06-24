import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useServer } from "../config/ServerContext";
import { createApi } from "../api/client";
import { Button, Card, Field, SectionTitle } from "../components/ui";
import { colors, radius, spacing } from "../theme";

export default function SettingsScreen() {
  const { baseUrl, token, save } = useServer();
  const [url, setUrl] = useState(baseUrl);
  const [tok, setTok] = useState(token);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null); // null | "ok" | "fail"

  const onSave = async () => {
    await save({ baseUrl: url, token: tok });
    Alert.alert("已保存", "服务器配置已更新。");
  };

  const onTest = async () => {
    setTesting(true); setStatus(null);
    try {
      const api = createApi({ baseUrl: url.trim().replace(/\/+$/, ""), token: tok.trim() });
      await api.get("/api/health");
      setStatus("ok");
    } catch {
      setStatus("fail");
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <SectionTitle>服务器</SectionTitle>
      <Card>
        <Text style={styles.label}>API 地址</Text>
        <Field value={url} onChangeText={setUrl} placeholder="http://192.168.x.x:3001" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Text style={styles.hint}>开发时通常是「开发机局域网 IP + :3001」。生产环境填部署域名。</Text>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>访问 Token（可选）</Text>
        <Field value={tok} onChangeText={setTok} placeholder="Bearer Token，开发可留空" autoCapitalize="none" autoCorrect={false} secureTextEntry />
        <Text style={styles.hint}>可在 web 端 /tokens 生成。开发环境留空即可读写默认工作区。</Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: spacing.lg }}>
          <Button title={testing ? "测试中…" : "测试连接"} icon="pulse-outline" variant="ghost" onPress={onTest} disabled={testing} style={{ flex: 1 }} />
          <Button title="保存" icon="checkmark" onPress={onSave} style={{ flex: 1 }} />
        </View>

        {status === "ok" && <View style={[styles.result, { backgroundColor: colors.successSoft }]}><Ionicons name="checkmark-circle" size={16} color={colors.success} /><Text style={[styles.resultText, { color: colors.success }]}>连接成功</Text></View>}
        {status === "fail" && <View style={[styles.result, { backgroundColor: colors.dangerSoft }]}><Ionicons name="close-circle" size={16} color={colors.danger} /><Text style={[styles.resultText, { color: colors.danger }]}>连接失败，请检查地址与网络</Text></View>}
      </Card>

      <View style={{ marginTop: spacing.xl }}>
        <SectionTitle>关于</SectionTitle>
        <Card>
          <Text style={styles.about}>ClawNote 原生移动客户端</Text>
          <Text style={styles.aboutMeta}>与 web 共用 PostgreSQL 工作区，通过 REST API 实时同步文档、任务、日历、Inbox 与 Agent Memory。</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 },
  hint: { fontSize: 11, color: colors.textFaint, marginTop: 6, lineHeight: 16 },
  result: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  resultText: { fontSize: 13, fontWeight: "600" },
  about: { fontSize: 15, fontWeight: "700", color: colors.text },
  aboutMeta: { fontSize: 13, color: colors.textMuted, marginTop: 6, lineHeight: 20 },
});
