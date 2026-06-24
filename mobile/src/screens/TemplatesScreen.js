import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, SectionList, StyleSheet, Text, View } from "react-native";
import { useApi, htmlToText } from "../api/clawnote";
import { Card, EmptyState, ErrorState, Loading } from "../components/ui";
import { colors, spacing } from "../theme";

export default function TemplatesScreen({ navigation }) {
  const api = useApi();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); const r = await api.listTemplates(); setTemplates(r?.templates || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sections = useMemo(() => {
    const byCat = new Map();
    for (const t of templates) {
      const c = t.category || "其他";
      if (!byCat.has(c)) byCat.set(c, []);
      byCat.get(c).push(t);
    }
    return [...byCat.entries()].map(([title, data]) => ({ title, data }));
  }, [templates]);

  const useTemplate = (t) => {
    Alert.alert("用此模板新建文档？", t.title, [
      { text: "取消", style: "cancel" },
      { text: "新建", onPress: async () => {
        try {
          const res = await api.createDocument({
            title: t.title,
            icon: t.icon || "📄",
            tags: t.tags || [],
            contentHtml: t.contentHtml || "<p></p>",
            contentText: htmlToText(t.contentHtml || ""),
            contentJson: t.contentJson,
          });
          navigation.navigate("DocumentEditor", { id: res.document.id });
        } catch (e) { Alert.alert("创建失败", e.message); }
      } },
    ]);
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <SectionList
      style={{ flex: 1, backgroundColor: colors.bg }}
      sections={sections}
      keyExtractor={(t) => t.id}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      renderSectionHeader={({ section }) => <Text style={styles.cat}>{section.title}</Text>}
      renderItem={({ item }) => (
        <Card onPress={() => useTemplate(item)} style={styles.row}>
          <Text style={{ fontSize: 24 }}>{item.icon || "📄"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
          </View>
        </Card>
      )}
      ListEmptyComponent={<EmptyState icon="documents-outline" title="暂无模板" />}
    />
  );
}

const styles = StyleSheet.create({
  cat: { fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  desc: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
});
