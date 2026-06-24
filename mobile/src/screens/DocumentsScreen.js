import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Button, Card, ErrorState, Field, Loading } from "../components/ui";
import { urlToFullHtml } from "../lib/htmlDoc";
import { pickHtmlFile } from "../lib/htmlImport";
import { colors, radius, shadow, spacing } from "../theme";

// 把扁平文档列表按 parentId 组织为带缩进的层级列表。
function buildTree(docs) {
  const byParent = new Map();
  for (const d of docs) {
    const key = d.parentId || "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(d);
  }
  for (const list of byParent.values()) list.sort((a, b) => (a.sortIndex - b.sortIndex) || (a.title || "").localeCompare(b.title || ""));
  const out = [];
  const walk = (parentKey, depth) => {
    const children = byParent.get(parentKey) || [];
    for (const child of children) {
      out.push({ doc: child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk("__root__", 0);
  return out;
}

export default function DocumentsScreen({ navigation }) {
  const api = useApi();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [inputMode, setInputMode] = useState(null); // null | "url" | "ai"
  const [inputValue, setInputValue] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.listDocuments();
      setDocs((res?.documents || []).filter((d) => !d.isArchived));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const rows = useMemo(() => {
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return docs
        .filter((d) => (d.title || "").toLowerCase().includes(q) || (d.contentText || "").toLowerCase().includes(q))
        .map((doc) => ({ doc, depth: 0 }));
    }
    return buildTree(docs);
  }, [docs, query]);

  const importHtml = async () => {
    try {
      const r = await pickHtmlFile();
      if (r) navigation.navigate("DocumentEditor", { mode: "create", html: r.html, title: r.title });
    } catch (e) { Alert.alert("导入失败", e.message); }
  };

  const submitInput = async () => {
    const v = inputValue.trim();
    if (!v) return;
    if (inputMode === "url") {
      if (!/^https?:\/\//i.test(v)) { Alert.alert("请输入合法网址（http/https）"); return; }
      setInputMode(null); setInputValue("");
      navigation.navigate("DocumentEditor", { mode: "create", kind: "html", html: urlToFullHtml(v), title: v.replace(/^https?:\/\//, "").slice(0, 30) });
    } else if (inputMode === "ai") {
      setGenerating(true);
      try {
        const res = await api.generateHtml(v);
        setInputMode(null); setInputValue("");
        if (res?.warning) Alert.alert("已用占位模板", `模型调用失败：${res.warning}`);
        navigation.navigate("DocumentEditor", { mode: "create", kind: "html", html: res.html, title: v.slice(0, 30) });
      } catch (e) { Alert.alert("生成失败", e.message); }
      finally { setGenerating(false); }
    }
  };

  const onCreate = () => {
    Alert.alert("新建", "选择文档类型", [
      { text: "普通文档", onPress: () => navigation.navigate("DocumentEditor", { mode: "create" }) },
      { text: "HTML 页面", onPress: () => navigation.navigate("DocumentEditor", { mode: "create", kind: "html" }) },
      { text: "导入 .html 文件", onPress: importHtml },
      { text: "嵌入网址", onPress: () => { setInputMode("url"); setInputValue("https://"); } },
      { text: "AI 生成页面", onPress: () => { setInputMode("ai"); setInputValue(""); } },
      { text: "取消", style: "cancel" },
    ]);
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textFaint} />
        <Field value={query} onChangeText={setQuery} placeholder="筛选文档…" style={styles.searchField} />
        {query ? <Pressable onPress={() => setQuery("")}><Ionicons name="close-circle" size={18} color={colors.textFaint} /></Pressable> : null}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.doc.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate("DocumentEditor", { id: item.doc.id })} style={[styles.row, { marginLeft: item.depth * 16 }]}>
            {item.depth > 0 ? <Ionicons name="return-down-forward" size={14} color={colors.textFaint} style={{ marginRight: 2 }} /> : null}
            <Text style={styles.icon}>{item.doc.icon || "📄"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{item.doc.title || "无标题"}</Text>
              {item.doc.summary ? <Text style={styles.meta} numberOfLines={1}>{item.doc.summary}</Text> : null}
            </View>
            {item.doc.isFavorite ? <Ionicons name="star" size={15} color="#f5b301" /> : null}
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>没有匹配的文档。</Text>}
      />

      <Pressable onPress={onCreate} style={({ pressed }) => [styles.fab, shadow, pressed && { opacity: 0.85 }]}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      <Modal visible={!!inputMode} transparent animationType="fade" onRequestClose={() => setInputMode(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{inputMode === "url" ? "嵌入网址" : "AI 生成页面"}</Text>
            <Field
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={inputMode === "url" ? "https://example.com" : "描述你想要的页面，例如：一个介绍艺术设计流派的图文页"}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={inputMode === "ai"}
              style={inputMode === "ai" ? { minHeight: 90 } : null}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: spacing.lg }}>
              <Button title="取消" variant="ghost" onPress={() => { setInputMode(null); setInputValue(""); }} style={{ flex: 1 }} />
              <Button title={generating ? "生成中…" : inputMode === "url" ? "嵌入" : "生成"} icon={inputMode === "url" ? "link" : "sparkles"} onPress={submitInput} disabled={generating} style={{ flex: 1 }} />
            </View>
            {generating ? <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} /> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, marginHorizontal: spacing.lg, marginTop: spacing.md, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  searchField: { flex: 1, borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  icon: { fontSize: 20 },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 30 },
  fab: { position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  modalWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.35)", padding: spacing.xl },
  dialog: { width: "100%", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
  dialogTitle: { fontSize: 17, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
});
