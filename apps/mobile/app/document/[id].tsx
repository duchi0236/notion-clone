import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";

type DocumentDetail = {
  id: string;
  title: string;
  contentText?: string;
  contentHtml?: string;
  summary?: string;
  tags?: string[];
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api<{ document: DocumentDetail }>(`/api/documents/${id}`);
    setDoc(data.document);
    setTitle(data.document.title ?? "Untitled");
    setText(data.document.contentText ?? "");
  }

  async function save() {
    if (!doc) return;
    setSaving(true);
    try {
      const contentHtml = textToHtml(text);
      await api(`/api/documents/${doc.id}`, {
        method: "PUT",
        body: JSON.stringify({ title, contentText: text, contentHtml, summary: text.slice(0, 160), tags: doc.tags ?? [] }),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
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
          <TouchableOpacity onPress={() => editing ? void save() : setEditing(true)} style={{ borderRadius: 999, backgroundColor: editing ? "#2563eb" : "#f1f5f9", paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: editing ? "white" : "#334155", fontWeight: "600" }}>{saving ? "保存中" : editing ? "保存" : "编辑"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 80 }}>
          {editing ? (
            <>
              <TextInput value={title} onChangeText={setTitle} style={{ fontSize: 30, fontWeight: "700", color: "#0f172a", marginBottom: 18 }} multiline placeholder="Untitled" />
              <TextInput value={text} onChangeText={setText} style={{ minHeight: 420, fontSize: 17, lineHeight: 28, color: "#334155", textAlignVertical: "top" }} multiline placeholder="开始写作..." />
            </>
          ) : (
            <>
              <Text style={{ fontSize: 32, fontWeight: "700", color: "#0f172a", lineHeight: 40 }}>{title}</Text>
              <Text style={{ marginTop: 14, color: "#94a3b8" }}>{text.length} 字符</Text>
              <Text style={{ marginTop: 28, fontSize: 17, lineHeight: 30, color: "#334155" }}>{text || "暂无内容"}</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
