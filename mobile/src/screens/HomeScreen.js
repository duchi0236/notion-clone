import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Card, ErrorState, Loading, SectionTitle } from "../components/ui";
import { colors, radius, shadow, spacing } from "../theme";

const QUICK = [
  { key: "newDoc", label: "新建文档", icon: "create-outline", tint: colors.accent },
  { key: "search", label: "搜索", icon: "search-outline", tint: "#0ea5a5" },
  { key: "inbox", label: "收集箱", icon: "file-tray-outline", tint: "#d97706" },
  { key: "agent", label: "AI 助手", icon: "sparkles-outline", tint: "#7c3aed" },
];

export default function HomeScreen({ navigation }) {
  const api = useApi();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.listDocuments();
      const list = (res?.documents || []).filter((d) => !d.isArchived);
      list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setDocs(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onQuick = (key) => {
    if (key === "newDoc") navigation.navigate("DocumentEditor", { mode: "create" });
    else if (key === "search") navigation.navigate("Search");
    else if (key === "inbox") navigation.navigate("Inbox");
    else if (key === "agent") navigation.navigate("Agent");
  };

  const favorites = docs.filter((d) => d.isFavorite).slice(0, 5);
  const recent = docs.slice(0, 12);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      data={recent}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          <Text style={styles.hello}>你好 👋</Text>
          <Text style={styles.sub}>{docs.length} 篇文档 · 个人知识工作台</Text>

          <View style={styles.quickGrid}>
            {QUICK.map((q) => (
              <Pressable key={q.key} onPress={() => onQuick(q.key)} style={({ pressed }) => [styles.quick, shadow, pressed && { opacity: 0.7 }]}>
                <View style={[styles.quickIcon, { backgroundColor: q.tint + "1a" }]}>
                  <Ionicons name={q.icon} size={20} color={q.tint} />
                </View>
                <Text style={styles.quickLabel}>{q.label}</Text>
              </Pressable>
            ))}
          </View>

          {favorites.length > 0 && (
            <View style={{ marginTop: spacing.xl }}>
              <SectionTitle>收藏</SectionTitle>
              {favorites.map((d) => (
                <DocRow key={d.id} doc={d} onPress={() => navigation.navigate("DocumentEditor", { id: d.id })} />
              ))}
            </View>
          )}

          <View style={{ marginTop: spacing.xl }}>
            <SectionTitle>最近更新</SectionTitle>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <DocRow doc={item} onPress={() => navigation.navigate("DocumentEditor", { id: item.id })} />
      )}
      ListEmptyComponent={<Text style={styles.empty}>还没有文档，点上面「新建文档」开始吧。</Text>}
    />
  );
}

function DocRow({ doc, onPress }) {
  return (
    <Card onPress={onPress} style={styles.docCard}>
      <Text style={styles.docIcon}>{doc.icon || "📄"}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.docTitle} numberOfLines={1}>{doc.title || "无标题"}</Text>
        <Text style={styles.docMeta} numberOfLines={1}>
          {doc.summary || doc.contentText?.slice(0, 60) || "空文档"}
        </Text>
      </View>
      {doc.isFavorite ? <Ionicons name="star" size={16} color="#f5b301" /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hello: { fontSize: 24, fontWeight: "800", color: colors.text },
  sub: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg },
  quick: { width: "47%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, flexGrow: 1 },
  quickIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  quickLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
  docCard: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  docIcon: { fontSize: 22 },
  docTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  docMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 20 },
});
