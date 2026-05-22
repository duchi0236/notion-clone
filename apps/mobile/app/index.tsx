import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Modal, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";

type DocumentItem = {
  id: string;
  title: string;
  summary?: string;
  updatedAt?: string;
};

const templates = [
  { id: "blank", icon: "📄", title: "空白文档", html: "<h1>Untitled</h1><p>开始写作...</p>", text: "Untitled\n开始写作...", tags: [] },
  { id: "meeting", icon: "📝", title: "会议纪要", html: "<h1>会议纪要</h1><h2>讨论内容</h2><p></p><h2>结论</h2><p></p><h2>行动项</h2><ul><li>[ ] </li></ul>", text: "会议纪要\n讨论内容\n结论\n行动项", tags: ["会议"] },
  { id: "prd", icon: "🧩", title: "产品需求文档", html: "<h1>产品需求文档</h1><h2>背景</h2><p></p><h2>目标</h2><p></p><h2>功能范围</h2><p></p><h2>验收标准</h2><p></p>", text: "产品需求文档\n背景\n目标\n功能范围\n验收标准", tags: ["PRD"] },
  { id: "note", icon: "🔎", title: "研究笔记", html: "<h1>研究笔记</h1><h2>问题</h2><p></p><h2>资料</h2><p></p><h2>发现</h2><p></p><h2>结论</h2><p></p>", text: "研究笔记\n问题\n资料\n发现\n结论", tags: ["研究"] },
];

export default function HomeScreen() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ documents: DocumentItem[] }>("/api/documents");
      setDocuments(data.documents ?? []);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  async function createDocument(template = templates[0]) {
    const data = await api<{ document: DocumentItem }>("/api/documents", {
      method: "POST",
      body: JSON.stringify({ title: template.title, icon: template.icon, contentHtml: template.html, contentText: template.text, summary: template.text.slice(0, 120), tags: template.tags }),
    });
    setTemplateOpen(false);
    if (data.document?.id) router.push(`/document/${data.document.id}`);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = documents.filter((item) => `${item.title} ${item.summary ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ padding: 20, paddingTop: 16, flex: 1 }}>
        <Text style={{ fontSize: 32, fontWeight: "700", color: "#0f172a" }}>ClawNote</Text>
        <Text style={{ marginTop: 4, color: "#64748b" }}>{loading ? "正在同步文档..." : "移动文档工作台"}</Text>

        <View style={{ marginTop: 18, flexDirection: "row", alignItems: "center", borderRadius: 16, backgroundColor: "white", paddingHorizontal: 14, paddingVertical: 12 }}>
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput value={query} onChangeText={setQuery} placeholder="搜索文档" style={{ marginLeft: 8, flex: 1 }} />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 18, paddingBottom: 120 }}
          refreshing={loading}
          onRefresh={load}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/document/${item.id}`)} style={{ marginBottom: 12, borderRadius: 22, backgroundColor: "white", padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 18, fontWeight: "600", color: "#0f172a" }}>{item.title}</Text>
                <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
              </View>
              <Text numberOfLines={2} style={{ marginTop: 8, color: "#64748b", lineHeight: 22 }}>{item.summary ?? "暂无摘要"}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{ marginTop: 28, textAlign: "center", color: "#94a3b8" }}>暂无文档</Text>}
        />

        <TouchableOpacity onPress={() => setTemplateOpen(true)} style={{ position: "absolute", right: 24, bottom: 34, height: 58, width: 58, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#2563eb" }}>
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <Modal visible={templateOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <View style={{ padding: 20, flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>选择模板</Text>
              <TouchableOpacity onPress={() => setTemplateOpen(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: 18 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => void createDocument(item)} style={{ marginBottom: 12, borderRadius: 22, backgroundColor: "#f8fafc", padding: 18 }}>
                  <Text style={{ fontSize: 26 }}>{item.icon}</Text>
                  <Text style={{ marginTop: 8, fontSize: 17, fontWeight: "700", color: "#0f172a" }}>{item.title}</Text>
                  <Text style={{ marginTop: 6, color: "#64748b" }}>{item.tags.length ? item.tags.join(" · ") : "从空白页面开始"}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
