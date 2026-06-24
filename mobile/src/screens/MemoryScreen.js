import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Badge, Card, EmptyState, ErrorState, Loading } from "../components/ui";
import { colors, spacing } from "../theme";

const STATUS_META = {
  PENDING: { label: "待审核", bg: colors.warningSoft, fg: colors.warning },
  ACCEPTED: { label: "已接受", bg: colors.successSoft, fg: colors.success },
  REJECTED: { label: "已拒绝", bg: colors.dangerSoft, fg: colors.danger },
  ARCHIVED: { label: "已归档", bg: colors.surfaceAlt, fg: colors.textMuted },
};
const FILTERS = ["PENDING", "ACCEPTED", "ALL"];
const FILTER_LABEL = { PENDING: "待审核", ACCEPTED: "已接受", ALL: "全部" };

export default function MemoryScreen() {
  const api = useApi();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("PENDING");

  const load = useCallback(async () => {
    try { setError(null); const r = await api.listMemory(); setMemories(r?.memories || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const review = async (m, status) => {
    setMemories((x) => x.map((i) => (i.id === m.id ? { ...i, status } : i)));
    try { await api.reviewMemory(m.id, status); } catch (e) { Alert.alert("失败", e.message); load(); }
  };

  const shown = memories.filter((m) => (filter === "ALL" ? true : m.status === filter));

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.tab, filter === f && styles.tabOn]}>
            <Text style={[styles.tabText, filter === f && styles.tabTextOn]}>{FILTER_LABEL[f]}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={shown}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status] || STATUS_META.PENDING;
          return (
            <Card style={styles.card}>
              <View style={styles.metaRow}>
                <Badge label={meta.label} bg={meta.bg} fg={meta.fg} />
                <Badge label={`置信度 ${Math.round((item.confidence ?? 1) * 100)}%`} />
                {(item.tags || []).slice(0, 2).map((t) => <Badge key={t} label={`#${t}`} bg={colors.accentSoft} fg={colors.accent} />)}
              </View>
              <Text style={styles.content}>{item.content}</Text>
              {item.status === "PENDING" && (
                <View style={styles.actions}>
                  <Pressable onPress={() => review(item, "ACCEPTED")} style={[styles.action, { backgroundColor: colors.successSoft }]}><Ionicons name="checkmark" size={16} color={colors.success} /><Text style={[styles.actionText, { color: colors.success }]}>接受</Text></Pressable>
                  <Pressable onPress={() => review(item, "REJECTED")} style={[styles.action, { backgroundColor: colors.dangerSoft }]}><Ionicons name="close" size={16} color={colors.danger} /><Text style={[styles.actionText, { color: colors.danger }]}>拒绝</Text></Pressable>
                  <Pressable onPress={() => review(item, "ARCHIVED")} style={[styles.action, { backgroundColor: colors.surfaceAlt }]}><Ionicons name="archive-outline" size={16} color={colors.textMuted} /><Text style={[styles.actionText, { color: colors.textMuted }]}>归档</Text></Pressable>
                </View>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={<EmptyState icon="library-outline" title="没有记忆" subtitle="Agent 写入的长期记忆会出现在这里待审核" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", gap: 8, padding: spacing.lg, paddingBottom: spacing.sm },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  tabTextOn: { color: "#fff" },
  card: { marginBottom: 10 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  content: { fontSize: 14, color: colors.text, lineHeight: 21 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  action: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  actionText: { fontSize: 13, fontWeight: "700" },
});
