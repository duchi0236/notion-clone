import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Badge, Card, EmptyState, ErrorState, Field, Loading } from "../components/ui";
import { colors, radius, spacing } from "../theme";

const SOURCE_LABEL = { MANUAL: "手动", OPENCLAW: "OpenClaw", WEB_CLIP: "网页", GITHUB: "GitHub", FILE: "文件", CHAT: "聊天" };
const STATUS_LABEL = { UNPROCESSED: "待处理", CONVERTED: "已转换", ARCHIVED: "已归档" };

export default function InboxScreen({ navigation }) {
  const api = useApi();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    try { setError(null); const r = await api.listInbox(); setItems(r?.items || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    try { const r = await api.createInbox({ title, content: title, source: "MANUAL" }); setItems((x) => [r.item, ...x]); }
    catch (e) { Alert.alert("添加失败", e.message); }
  };

  const archive = async (item) => {
    setItems((x) => x.map((i) => (i.id === item.id ? { ...i, status: "ARCHIVED" } : i)));
    try { await api.updateInbox(item.id, { status: "ARCHIVED" }); } catch (e) { Alert.alert("失败", e.message); load(); }
  };

  const convert = async (item) => {
    try {
      const res = await api.createDocument({ title: item.title, contentText: item.content, contentHtml: `<p>${item.content || ""}</p>`, type: "NOTE" });
      await api.updateInbox(item.id, { status: "CONVERTED" });
      setItems((x) => x.map((i) => (i.id === item.id ? { ...i, status: "CONVERTED" } : i)));
      Alert.alert("已转为文档", "是否现在打开？", [
        { text: "稍后", style: "cancel" },
        { text: "打开", onPress: () => navigation.navigate("DocumentEditor", { id: res.document.id }) },
      ]);
    } catch (e) { Alert.alert("转换失败", e.message); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.toolbar}>
        <Field value={draft} onChangeText={setDraft} placeholder="快速记一条…" onSubmitEditing={add} returnKeyType="done" style={{ flex: 1 }} />
        <Pressable onPress={add} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}><Ionicons name="add" size={22} color="#fff" /></Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.metaRow}>
              <Badge label={SOURCE_LABEL[item.source] || item.source} bg={colors.accentSoft} fg={colors.accent} />
              <Badge label={STATUS_LABEL[item.status] || item.status} />
            </View>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            {item.content ? <Text style={styles.content} numberOfLines={3}>{item.content}</Text> : null}
            {item.status === "UNPROCESSED" && (
              <View style={styles.actions}>
                <Pressable onPress={() => convert(item)} style={styles.action}><Ionicons name="document-text-outline" size={16} color={colors.accent} /><Text style={[styles.actionText, { color: colors.accent }]}>转为文档</Text></Pressable>
                <Pressable onPress={() => archive(item)} style={styles.action}><Ionicons name="archive-outline" size={16} color={colors.textMuted} /><Text style={styles.actionText}>归档</Text></Pressable>
              </View>
            )}
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="file-tray-outline" title="收集箱是空的" subtitle="在上方快速记录，或由 OpenClaw 写入" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.lg, paddingBottom: spacing.sm },
  addBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  card: { marginBottom: 10 },
  metaRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  content: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
});
