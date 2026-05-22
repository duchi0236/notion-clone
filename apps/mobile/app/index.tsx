import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";

type DocumentItem = {
  id: string;
  title: string;
  summary?: string;
  updatedAt?: string;
};

export default function HomeScreen() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function createDocument() {
    const html = "<h1>Untitled</h1><p>开始写作...</p>";
    const data = await api<{ document: DocumentItem }>("/api/documents", {
      method: "POST",
      body: JSON.stringify({ title: "Untitled", icon: "📄", contentHtml: html, contentText: "Untitled\n开始写作...", tags: [] }),
    });
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
        />

        <TouchableOpacity onPress={() => void createDocument()} style={{ position: "absolute", right: 24, bottom: 34, height: 58, width: 58, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#2563eb" }}>
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
