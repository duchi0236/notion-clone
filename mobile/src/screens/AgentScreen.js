import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { colors, radius, spacing } from "../theme";

const SUGGESTIONS = ["搜索 项目计划", "新建文档 周报", "总结最近的笔记"];

let seq = 0;
const uid = () => `m${++seq}-${Date.now()}`;

export default function AgentScreen({ navigation }) {
  const api = useApi();
  const [messages, setMessages] = useState([
    { id: uid(), role: "assistant", text: "你好，我是 ClawNote 工作区助手。可以让我搜索、新建文档或做摘要。" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  const send = useCallback(async (textArg) => {
    const text = (textArg ?? input).trim();
    if (!text || busy) return;
    setInput("");
    const userMsg = { id: uid(), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      const res = await api.chat(text);
      const reply = {
        id: uid(),
        role: "assistant",
        text: res?.reply || "（无回复）",
        results: res?.results || null,
        createdDoc: res?.createdDoc || null,
      };
      setMessages((m) => [...m, reply]);
    } catch (e) {
      setMessages((m) => [...m, { id: uid(), role: "assistant", text: `出错了：${e.message}`, error: true }]);
    } finally {
      setBusy(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [api, input, busy]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 20 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.role === "user" ? styles.rowRight : styles.rowLeft]}>
            <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.botBubble, item.error && styles.errBubble]}>
              <Text style={[styles.bubbleText, item.role === "user" && { color: "#fff" }]}>{item.text}</Text>
              {item.results?.length ? (
                <View style={styles.results}>
                  {item.results.map((r) => (
                    <Pressable key={r.id} onPress={() => navigation.navigate("DocumentEditor", { id: r.id })} style={styles.resultRow}>
                      <Ionicons name="document-text-outline" size={15} color={colors.accent} />
                      <Text style={styles.resultTitle} numberOfLines={1}>{r.title}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {item.createdDoc ? (
                <Pressable onPress={() => navigation.navigate("DocumentEditor", { id: item.createdDoc.id })} style={styles.openDoc}>
                  <Ionicons name="open-outline" size={15} color={colors.accent} />
                  <Text style={styles.resultTitle}>打开「{item.createdDoc.title}」</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
        ListFooterComponent={busy ? <View style={styles.typing}><ActivityIndicator size="small" color={colors.textMuted} /><Text style={styles.typingText}>思考中…</Text></View> : null}
      />

      {messages.length <= 1 && (
        <View style={styles.suggestRow}>
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} onPress={() => send(s)} style={styles.suggestChip}><Text style={styles.suggestText}>{s}</Text></Pressable>
          ))}
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput value={input} onChangeText={setInput} placeholder="问点什么…" placeholderTextColor={colors.textFaint} style={styles.input} onSubmitEditing={() => send()} returnKeyType="send" />
        <Pressable onPress={() => send()} disabled={busy || !input.trim()} style={({ pressed }) => [styles.sendBtn, (busy || !input.trim()) && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { marginBottom: 10, flexDirection: "row" },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: radius.lg, padding: 12 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  errBubble: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  bubbleText: { fontSize: 15, color: colors.text, lineHeight: 21 },
  results: { marginTop: 10, gap: 6 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.sm },
  resultTitle: { fontSize: 13, color: colors.accent, fontWeight: "600", flex: 1 },
  openDoc: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.sm },
  typing: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 4, marginBottom: 10 },
  typingText: { color: colors.textMuted, fontSize: 13 },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  suggestChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  suggestText: { fontSize: 13, color: colors.textMuted },
  inputBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
