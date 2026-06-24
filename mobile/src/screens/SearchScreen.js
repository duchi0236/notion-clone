import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Badge, Card, EmptyState, Field } from "../components/ui";
import { colors, radius, spacing } from "../theme";

const TYPE_META = {
  document: { label: "文档", icon: "document-text-outline", tint: colors.accent },
  memory: { label: "记忆", icon: "library-outline", tint: "#7c3aed" },
  inbox: { label: "收集箱", icon: "file-tray-outline", tint: "#d97706" },
};

export default function SearchScreen({ navigation }) {
  const api = useApi();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("keyword"); // keyword | semantic
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [touched, setTouched] = useState(false);
  const timer = useRef(null);

  const run = useCallback(async (text, searchMode) => {
    if (!text.trim()) { setResults([]); setTouched(false); return; }
    setSearching(true); setTouched(true);
    try {
      if (searchMode === "semantic") {
        const r = await api.semanticSearch(text.trim());
        setResults((r?.results || []).filter((x) => x.document).map((x) => ({ type: "document", item: x.document })));
      } else {
        const r = await api.search(text.trim());
        setResults(r?.results || []);
      }
    } catch { setResults([]); } finally { setSearching(false); }
  }, [api]);

  const onChange = (text) => {
    setQ(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(text, mode), 350);
  };

  const switchMode = (m) => { setMode(m); if (q.trim()) run(q, m); };

  const open = (row) => {
    if (row.type === "document") navigation.navigate("DocumentEditor", { id: row.item.id });
    else if (row.type === "inbox") navigation.navigate("Inbox");
    else navigation.navigate("Memory");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <Field value={q} onChangeText={onChange} placeholder="搜索文档 / 记忆 / 收集箱…" autoFocus style={styles.field} returnKeyType="search" onSubmitEditing={() => run(q, mode)} />
        {searching ? <ActivityIndicator size="small" color={colors.primary} /> : q ? <Pressable onPress={() => onChange("")}><Ionicons name="close-circle" size={18} color={colors.textFaint} /></Pressable> : null}
      </View>

      <View style={styles.modeRow}>
        {[{ k: "keyword", l: "关键词" }, { k: "semantic", l: "语义" }].map((m) => (
          <Pressable key={m.k} onPress={() => switchMode(m.k)} style={[styles.modeChip, mode === m.k && styles.modeChipOn]}>
            <Text style={[styles.modeText, mode === m.k && styles.modeTextOn]}>{m.l}</Text>
          </Pressable>
        ))}
        {mode === "semantic" ? <Text style={styles.modeHint}>按语义相关度排序（token-overlap fallback）</Text> : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(r, i) => `${r.type}-${r.item.id}-${i}`}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: row }) => {
          const meta = TYPE_META[row.type] || TYPE_META.document;
          const title = row.item.title || row.item.content?.slice(0, 30) || "无标题";
          const snippet = row.item.summary || row.item.contentText?.slice(0, 80) || row.item.content?.slice(0, 80);
          return (
            <Card onPress={() => open(row)} style={styles.card}>
              <View style={[styles.icon, { backgroundColor: meta.tint + "1a" }]}><Ionicons name={meta.icon} size={18} color={meta.tint} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                {snippet ? <Text style={styles.snippet} numberOfLines={2}>{snippet}</Text> : null}
              </View>
              <Badge label={meta.label} bg={meta.tint + "1a"} fg={meta.tint} />
            </Card>
          );
        }}
        ListEmptyComponent={
          touched && !searching
            ? <EmptyState icon="search-outline" title="没有结果" subtitle={`未找到与「${q}」相关的内容`} />
            : <EmptyState icon="search-outline" title="搜索你的知识库" subtitle="输入关键词，实时检索文档、记忆与收集箱" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, margin: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  modeChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  modeTextOn: { color: "#fff" },
  modeHint: { fontSize: 11, color: colors.textFaint, flex: 1 },
  field: { flex: 1, borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0, fontSize: 16 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  snippet: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
});
