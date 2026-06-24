import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Card, EmptyState, ErrorState, Loading } from "../components/ui";
import { colors, spacing } from "../theme";

export default function TrashScreen() {
  const api = useApi();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); const r = await api.listArchived(); setDocs(r?.documents || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const restore = async (d) => {
    setDocs((x) => x.filter((i) => i.id !== d.id));
    try { await api.updateDocument(d.id, { isArchived: false }); }
    catch (e) { Alert.alert("恢复失败", e.message); load(); }
  };

  const purge = (d) => {
    Alert.alert("彻底删除？", "此操作不可恢复。", [
      { text: "取消", style: "cancel" },
      { text: "永久删除", style: "destructive", onPress: async () => {
        setDocs((x) => x.filter((i) => i.id !== d.id));
        try { await api.deleteDocumentForever(d.id); } catch (e) { Alert.alert("删除失败", e.message); load(); }
      } },
    ]);
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      data={docs}
      keyExtractor={(d) => d.id}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <Card style={styles.row}>
          <Text style={{ fontSize: 20 }}>{item.icon || "📄"}</Text>
          <Text style={styles.title} numberOfLines={1}>{item.title || "无标题"}</Text>
          <Pressable onPress={() => restore(item)} hitSlop={8}><Ionicons name="arrow-undo-outline" size={20} color={colors.accent} /></Pressable>
          <Pressable onPress={() => purge(item)} hitSlop={8}><Ionicons name="trash-outline" size={20} color={colors.danger} /></Pressable>
        </Card>
      )}
      ListEmptyComponent={<EmptyState icon="trash-outline" title="回收站是空的" subtitle="被删除的文档会暂存在这里" />}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  title: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
});
