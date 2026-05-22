import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";

type DocumentDetail = {
  id: string;
  title: string;
  icon?: string | null;
  contentText?: string;
  contentHtml?: string;
  summary?: string;
  tags?: string[];
  status?: string;
  isFavorite?: boolean;
};

function textToHtml(text: string) {
  return text
    .split("\n")
    .map((line) => line.startsWith("# ") ? `<h1>${line.slice(2)}</h1>` : line.startsWith("## ") ? `<h2>${line.slice(3)}</h2>` : `<p>${line}</p>`)
    .join("");
}

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [icon, setIcon] = useState("📄");
  const [summary, setSummary] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [editing, setEditing] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api<{ document: DocumentDetail }>(`/api/documents/${id}`);
    const next = data.document;
    setDoc(next);
    setTitle(next.title ?? "Untitled");
    setText(next.contentText ?? "");
    setIcon(next.icon ?? "📄");
    setSummary(next.summary ?? "");
    setTagsText((next.tags ?? []).join(", "));
    setStatus(next.status ?? "DRAFT");
  }

  async function save(patch?: Partial<DocumentDetail>) {
    if (!doc) return;
    setSaving(true);
    try {
      const contentHtml = textToHtml(text);
      const tags = tagsText.split(",").map((tag) => tag.trim()).filter(Boolean);
      const payload = {
        title,
        icon,
        contentText: text,
        contentHtml,
        summary: summary || text.slice(0, 160),
        tags,
        status,
        ...patch,
      };
      await api(`/api/documents/${doc.id}`, { method: "PUT", body: JSON.stringify(payload) });
      setDoc((prev) => prev ? { ...prev, ...payload } : prev);
      setEditing(false);
      setPropertiesOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite() {
    if (!doc) return;
    const next = !doc.isFavorite;
    await save({ isFavorite: next });
    setDoc((prev) => prev ? { ...prev, isFavorite: next } : prev);
  }

  async function deleteDocument() {
    if (!doc) return;
    Alert.alert("删除文档", "确定要删除这篇文档吗？", [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => { await api(`/api/documents/${doc.id}`, { method: "DELETE" }); router.back(); } },
    ]);
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (!doc) {
    return <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text>加载中...</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#0f172a" /></TouchableOpacity>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={() => void toggleFavorite()} style={{ borderRadius: 999, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 8 }}>
              <Ionicons name={doc.isFavorite ? "star" : "star-outline"} size={18} color={doc.isFavorite ? "#f59e0b" : "#64748b"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPropertiesOpen(true)} style={{ borderRadius: 999, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 8 }}>
              <Ionicons name="options-outline" size={18} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => editing ? void save() : setEditing(true)} style={{ borderRadius: 999, backgroundColor: editing ? "#2563eb" : "#f1f5f9", paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ color: editing ? "white" : "#334155", fontWeight: "600" }}>{saving ? "保存中" : editing ? "保存" : "编辑"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 80 }}>
          {editing ? (
            <>
              <TextInput value={title} onChangeText={setTitle} style={{ fontSize: 30, fontWeight: "700", color: "#0f172a", marginBottom: 18 }} multiline placeholder="Untitled" />
              <TextInput value={text} onChangeText={setText} style={{ minHeight: 420, fontSize: 17, lineHeight: 28, color: "#334155", textAlignVertical: "top" }} multiline placeholder="开始写作..." />
            </>
          ) : (
            <>
              <Text style={{ fontSize: 44 }}>{icon}</Text>
              <Text style={{ marginTop: 12, fontSize: 32, fontWeight: "700", color: "#0f172a", lineHeight: 40 }}>{title}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                {(doc.tags ?? []).map((tag) => <Text key={tag} style={{ borderRadius: 999, backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 5, color: "#2563eb" }}>{tag}</Text>)}
                <Text style={{ borderRadius: 999, backgroundColor: "#f8fafc", paddingHorizontal: 10, paddingVertical: 5, color: "#64748b" }}>{status}</Text>
              </View>
              <Text style={{ marginTop: 14, color: "#94a3b8" }}>{text.length} 字符</Text>
              {!!summary && <Text style={{ marginTop: 18, borderRadius: 18, backgroundColor: "#f8fafc", padding: 14, color: "#475569", lineHeight: 22 }}>{summary}</Text>}
              <Text style={{ marginTop: 28, fontSize: 17, lineHeight: 30, color: "#334155" }}>{text || "暂无内容"}</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={propertiesOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>文档属性</Text>
              <TouchableOpacity onPress={() => setPropertiesOpen(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <Text style={{ marginTop: 18, color: "#64748b" }}>图标</Text>
            <TextInput value={icon} onChangeText={setIcon} style={{ marginTop: 6, borderRadius: 16, backgroundColor: "#f8fafc", padding: 14, fontSize: 18 }} />
            <Text style={{ marginTop: 14, color: "#64748b" }}>状态</Text>
            <TextInput value={status} onChangeText={setStatus} style={{ marginTop: 6, borderRadius: 16, backgroundColor: "#f8fafc", padding: 14 }} />
            <Text style={{ marginTop: 14, color: "#64748b" }}>标签，逗号分隔</Text>
            <TextInput value={tagsText} onChangeText={setTagsText} style={{ marginTop: 6, borderRadius: 16, backgroundColor: "#f8fafc", padding: 14 }} />
            <Text style={{ marginTop: 14, color: "#64748b" }}>摘要</Text>
            <TextInput value={summary} onChangeText={setSummary} multiline style={{ marginTop: 6, minHeight: 90, borderRadius: 16, backgroundColor: "#f8fafc", padding: 14, textAlignVertical: "top" }} />
            <TouchableOpacity onPress={() => void save()} style={{ marginTop: 22, borderRadius: 16, backgroundColor: "#2563eb", padding: 15, alignItems: "center" }}>
              <Text style={{ color: "white", fontWeight: "700" }}>保存属性</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void deleteDocument()} style={{ marginTop: 12, borderRadius: 16, backgroundColor: "#fee2e2", padding: 15, alignItems: "center" }}>
              <Text style={{ color: "#dc2626", fontWeight: "700" }}>删除文档</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
