import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Card, EmptyState, ErrorState, Loading } from "../components/ui";
import { colors, radius, spacing } from "../theme";

export default function DocumentCommentsScreen({ route }) {
  const api = useApi();
  const { id } = route.params;
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try { setError(null); const r = await api.listComments(id); setComments(r?.comments || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try { await api.addComment(id, content); setDraft(""); load(); }
    catch (e) { Alert.alert("发送失败", e.message); } finally { setSending(false); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.head}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{(item.author?.name || item.author?.email || "?").slice(0, 1).toUpperCase()}</Text></View>
              <Text style={styles.author}>{item.author?.name || item.author?.email || "匿名"}</Text>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            <Text style={styles.content}>{item.content}</Text>
            {(item.replies || []).map((r) => (
              <View key={r.id} style={styles.reply}>
                <Text style={styles.replyAuthor}>{r.author?.name || "回复"}</Text>
                <Text style={styles.content}>{r.content}</Text>
              </View>
            ))}
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="还没有评论" subtitle="在下方写下第一条评论" />}
      />
      <View style={styles.inputBar}>
        <TextInput value={draft} onChangeText={setDraft} placeholder="写评论…" placeholderTextColor={colors.textFaint} style={styles.input} multiline />
        <Pressable onPress={send} disabled={sending || !draft.trim()} style={({ pressed }) => [styles.sendBtn, (sending || !draft.trim()) && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  head: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  author: { fontSize: 13, fontWeight: "700", color: colors.text },
  time: { fontSize: 11, color: colors.textFaint, marginLeft: "auto" },
  content: { fontSize: 14, color: colors.text, lineHeight: 20 },
  reply: { marginTop: 8, marginLeft: 12, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.border },
  replyAuthor: { fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 2 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
