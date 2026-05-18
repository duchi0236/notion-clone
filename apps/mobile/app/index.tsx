import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { FlatList, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";

type DocumentItem = {
  id: string;
  title: string;
  summary?: string;
  updatedAt?: string;
};

export default function HomeScreen() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState("");

  async function load() {
    const res = await fetch("http://localhost:3000/api/documents");
    const data = await res.json().catch(() => ({ documents: [] }));
    setDocuments(data.documents ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = documents.filter((item) => `${item.title} ${item.summary ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ padding: 20, paddingTop: 16 }}>
        <Text style={{ fontSize: 32, fontWeight: "700", color: "#0f172a" }}>ClawNote</Text>
        <Text style={{ marginTop: 4, color: "#64748b" }}>移动文档工作台</Text>

        <View style={{ marginTop: 18, flexDirection: "row", alignItems: "center", borderRadius: 16, backgroundColor: "white", paddingHorizontal: 14, paddingVertical: 12 }}>
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput value={query} onChangeText={setQuery} placeholder="搜索文档" style={{ marginLeft: 8, flex: 1 }} />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 18, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={{ marginBottom: 12, borderRadius: 22, backgroundColor: "white", padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#0f172a" }}>{item.title}</Text>
                <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
              </View>
              <Text style={{ marginTop: 8, color: "#64748b", lineHeight: 22 }}>{item.summary ?? "暂无摘要"}</Text>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity style={{ position: "absolute", right: 24, bottom: 34, height: 58, width: 58, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#2563eb" }}>
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
