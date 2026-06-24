import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { htmlToText, textToHtml, useApi } from "../api/clawnote";
import { Badge, Button, ErrorState, Field, Loading } from "../components/ui";
import { pickAndUploadImage } from "../lib/attachments";
import { ensureSentinel, isFullHtmlDoc, starterFullHtml, stripSentinel } from "../lib/htmlDoc";
import { colors, radius, spacing } from "../theme";

const EMOJIS = ["📄", "📝", "📌", "💡", "🧠", "🚀", "📊", "✅", "📚", "🔖"];

export default function DocumentEditorScreen({ navigation, route }) {
  const api = useApi();
  const isCreate = route.params?.mode === "create" || !route.params?.id;
  const [id, setId] = useState(route.params?.id || null);

  const [loading, setLoading] = useState(!isCreate);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [icon, setIcon] = useState("📄");
  const [tags, setTags] = useState([]);
  const [favorite, setFavorite] = useState(false);
  const [published, setPublished] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [allDocs, setAllDocs] = useState([]);
  // 整页 HTML 模式
  const [htmlMode, setHtmlMode] = useState(false);
  const [rawHtml, setRawHtml] = useState("");
  const [htmlView, setHtmlView] = useState("preview"); // preview | source
  const dirty = useRef(false);
  const autoTimer = useRef(null);

  // ---- 载入 ----
  const load = useCallback(async () => {
    if (isCreate) {
      // 创建时可携带 HTML 初始内容（来自「新建 HTML / 导入 / 网址 / AI」）
      const initHtml = route.params?.html;
      if (route.params?.kind === "html" || initHtml) {
        setHtmlMode(true);
        setRawHtml(initHtml || starterFullHtml());
        if (route.params?.title) setTitle(route.params.title);
        setIcon("🎨");
        dirty.current = true;
      }
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const res = await api.getDocument(id);
      const d = res.document;
      setTitle(d.title || "");
      setIcon(d.icon || "📄");
      setTags(Array.isArray(d.tags) ? d.tags : []);
      setFavorite(!!d.isFavorite);
      setPublished(!!d.isPublished);
      if (isFullHtmlDoc(d.contentHtml)) {
        setHtmlMode(true);
        setRawHtml(d.contentHtml);
      } else {
        setBody(htmlToText(d.contentHtml));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, id, isCreate, route.params]);

  useEffect(() => { load(); }, [load]);

  // ---- 保存 ----
  const save = useCallback(async (reason = "update") => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        title: title || "无标题",
        icon,
        tags,
        isFavorite: favorite,
        isPublished: published,
        contentHtml: htmlMode ? ensureSentinel(rawHtml) : textToHtml(body),
        contentText: htmlMode ? "（HTML 页面）" : body,
        reason,
      };
      if (!id) {
        const res = await api.createDocument(payload);
        setId(res.document.id);
        navigation.setParams({ id: res.document.id, mode: undefined });
      } else {
        await api.updateDocument(id, payload);
      }
      dirty.current = false;
      setSavedAt(new Date());
    } catch (e) {
      Alert.alert("保存失败", e.message);
    } finally {
      setSaving(false);
    }
  }, [api, id, title, body, icon, tags, favorite, published, htmlMode, rawHtml, saving, navigation]);

  // ---- 自动保存（停止输入 1.5s 后）----
  const markDirty = useCallback(() => {
    dirty.current = true;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => { if (dirty.current) save("autosave"); }, 1500);
  }, [save]);

  useEffect(() => () => { if (autoTimer.current) clearTimeout(autoTimer.current); }, []);

  const onDelete = () => {
    if (!id) { navigation.goBack(); return; }
    Alert.alert("移到回收站？", "文档将被归档，可在「更多 → 回收站」恢复。", [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => {
        try { await api.deleteDocument(id); navigation.goBack(); }
        catch (e) { Alert.alert("删除失败", e.message); }
      } },
    ]);
  };

  const togglePublish = async () => {
    if (!id) { Alert.alert("请先保存文档"); return; }
    const nextVal = !published;
    setPublished(nextVal);
    try {
      await api.updateDocument(id, { isPublished: nextVal });
      Alert.alert(nextVal ? "已发布" : "已取消发布", nextVal ? `分享链接：\n${api.baseUrl}/share/${id}` : "文档已转为私有。");
    } catch (e) { setPublished(!nextVal); Alert.alert("操作失败", e.message); }
  };

  const onInsertImage = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      const res = await pickAndUploadImage(api);
      if (res?.url) {
        const md = `\n![${res.filename || "image"}](${api.baseUrl}${res.url})\n`;
        setBody((b) => b + md);
        markDirty();
      }
    } catch (e) {
      if (e.message) Alert.alert("插入失败", e.message);
    } finally {
      setUploading(false);
    }
  };

  const openMove = async () => {
    if (!id) { Alert.alert("请先保存文档"); return; }
    try {
      const res = await api.listDocuments();
      setAllDocs((res?.documents || []).filter((d) => !d.isArchived && d.id !== id));
      setShowMove(true);
    } catch (e) { Alert.alert("加载失败", e.message); }
  };

  const doMove = async (parentId) => {
    setShowMove(false);
    try { await api.moveDocument(id, parentId); Alert.alert("已移动"); }
    catch (e) { Alert.alert("移动失败", e.message); }
  };

  const onMore = () => {
    Alert.alert("更多操作", title || "文档", [
      { text: "版本历史", onPress: () => id ? navigation.navigate("DocumentVersions", { id }) : Alert.alert("请先保存文档") },
      { text: "评论", onPress: () => id ? navigation.navigate("DocumentComments", { id }) : Alert.alert("请先保存文档") },
      { text: "移动到…", onPress: openMove },
      { text: published ? "取消发布" : "发布并分享", onPress: togglePublish },
      { text: "移到回收站", style: "destructive", onPress: onDelete },
      { text: "取消", style: "cancel" },
    ]);
  };

  // ---- 顶栏按钮 ----
  useLayoutEffect(() => {
    navigation.setOptions({
      title: icon + " " + (title ? (title.length > 12 ? title.slice(0, 12) + "…" : title) : "新文档"),
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <Pressable onPress={() => setFavorite((v) => { dirty.current = true; return !v; })} hitSlop={8}>
            <Ionicons name={favorite ? "star" : "star-outline"} size={20} color={favorite ? "#f5b301" : colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => save("update")} hitSlop={8}>
            <Ionicons name="save-outline" size={20} color={colors.accent} />
          </Pressable>
          <Pressable onPress={onMore} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, title, icon, favorite, published, save]);

  const addTag = () => {
    const t = tagDraft.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); markDirty(); }
    setTagDraft("");
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {htmlMode ? (
        <View style={{ flex: 1 }}>
          <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
            <TextInput
              value={title}
              onChangeText={(t) => { setTitle(t); markDirty(); }}
              placeholder="无标题"
              placeholderTextColor={colors.textFaint}
              style={styles.titleInput}
              multiline
            />
            <View style={styles.htmlBar}>
              <Pressable onPress={() => setHtmlView("preview")} style={[styles.segBtn, htmlView === "preview" && styles.segOn]}>
                <Ionicons name="eye-outline" size={15} color={htmlView === "preview" ? colors.text : colors.textMuted} />
                <Text style={[styles.segText, htmlView === "preview" && styles.segTextOn]}>预览</Text>
              </Pressable>
              <Pressable onPress={() => setHtmlView("source")} style={[styles.segBtn, htmlView === "source" && styles.segOn]}>
                <Ionicons name="code-slash-outline" size={15} color={htmlView === "source" ? colors.text : colors.textMuted} />
                <Text style={[styles.segText, htmlView === "source" && styles.segTextOn]}>源码</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Badge label="HTML 渲染" bg={colors.accentSoft} fg={colors.accent} />
            </View>
          </View>
          {htmlView === "preview" ? (
            <WebView
              originWhitelist={["*"]}
              source={{ html: stripSentinel(rawHtml) }}
              style={{ flex: 1, backgroundColor: "#fff" }}
              javaScriptEnabled
              domStorageEnabled
            />
          ) : (
            <TextInput
              value={rawHtml}
              onChangeText={(t) => { setRawHtml(t); markDirty(); }}
              placeholder="粘贴 / 编写完整 HTML（含 <style> 与 <script>）…"
              placeholderTextColor={colors.textFaint}
              style={styles.sourceInput}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              textAlignVertical="top"
            />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {/* emoji 选择 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
          {EMOJIS.map((e) => (
            <Pressable key={e} onPress={() => { setIcon(e); markDirty(); }} style={[styles.emoji, icon === e && styles.emojiOn]}>
              <Text style={{ fontSize: 20 }}>{e}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextInput
          value={title}
          onChangeText={(t) => { setTitle(t); markDirty(); }}
          placeholder="无标题"
          placeholderTextColor={colors.textFaint}
          style={styles.titleInput}
          multiline
        />

        {/* 标签 + 发布状态 */}
        <View style={styles.tagRow}>
          {published ? <Badge label="🌐 已发布" bg={colors.successSoft} fg={colors.success} /> : null}
          {tags.map((t) => (
            <Pressable key={t} onPress={() => { setTags(tags.filter((x) => x !== t)); markDirty(); }}>
              <Badge label={`#${t} ✕`} bg={colors.accentSoft} fg={colors.accent} />
            </Pressable>
          ))}
          <Field
            value={tagDraft}
            onChangeText={setTagDraft}
            onSubmitEditing={addTag}
            placeholder="+ 标签"
            style={styles.tagInput}
            returnKeyType="done"
          />
        </View>

        {/* 工具栏：插入图片 */}
        <View style={styles.toolbar}>
          <Pressable onPress={onInsertImage} disabled={uploading} style={({ pressed }) => [styles.toolBtn, pressed && { opacity: 0.6 }]}>
            {uploading ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="image-outline" size={18} color={colors.accent} />}
            <Text style={styles.toolText}>{uploading ? "上传中…" : "插入图片"}</Text>
          </Pressable>
        </View>

        <TextInput
          value={body}
          onChangeText={(t) => { setBody(t); markDirty(); }}
          placeholder="开始书写…（支持纯文本 / Markdown，与 web 富文本同步）"
          placeholderTextColor={colors.textFaint}
          style={styles.bodyInput}
          multiline
          scrollEnabled={false}
        />
        </ScrollView>
      )}

      {/* 移动到… */}
      <Modal visible={showMove} transparent animationType="slide" onRequestClose={() => setShowMove(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>移动到</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <Pressable onPress={() => doMove(null)} style={styles.moveRow}>
                <Ionicons name="home-outline" size={18} color={colors.text} />
                <Text style={styles.moveText}>根目录（顶层）</Text>
              </Pressable>
              {allDocs.map((d) => (
                <Pressable key={d.id} onPress={() => doMove(d.id)} style={styles.moveRow}>
                  <Text style={{ fontSize: 18 }}>{d.icon || "📄"}</Text>
                  <Text style={styles.moveText} numberOfLines={1}>{d.title || "无标题"}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button title="取消" variant="ghost" onPress={() => setShowMove(false)} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </Modal>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {saving ? "保存中…" : savedAt ? `已保存 ${savedAt.toLocaleTimeString()}` : isCreate ? "新文档（自动保存）" : "已同步"}
        </Text>
        <Text style={styles.statusText}>{htmlMode ? `HTML · ${rawHtml.length} 字符` : `${body.length} 字`}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  emojiRow: { marginBottom: spacing.md },
  emoji: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginRight: 8, borderWidth: 1, borderColor: "transparent" },
  emojiOn: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  titleInput: { fontSize: 26, fontWeight: "800", color: colors.text, paddingVertical: 4 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: spacing.md, marginBottom: spacing.md },
  tagInput: { borderWidth: 0, backgroundColor: colors.surfaceAlt, paddingVertical: 4, paddingHorizontal: 10, fontSize: 13, minWidth: 80 },
  bodyInput: { fontSize: 16, lineHeight: 26, color: colors.text, minHeight: 320, textAlignVertical: "top", marginTop: spacing.sm },
  statusBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  statusText: { fontSize: 11, color: colors.textFaint },
  toolbar: { flexDirection: "row", gap: 8, marginBottom: spacing.sm },
  toolBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  toolText: { fontSize: 13, fontWeight: "600", color: colors.accent },
  htmlBar: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  segBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  segOn: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  segText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  segTextOn: { color: colors.text },
  sourceInput: { flex: 1, backgroundColor: "#0f172a", color: "#e2e8f0", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12.5, lineHeight: 19, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  modalWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.35)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
  moveRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  moveText: { fontSize: 15, color: colors.text, flex: 1 },
});
