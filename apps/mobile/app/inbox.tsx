import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { FlatList, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";

type InboxItem = {
  id: string;
  title?: string;
  content?: string;
  status?: string;
  createdAt?: string;
};

export default function InboxScreen() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ items?: InboxItem[]; memories?: InboxItem[] }>("/api/memory");
      setItems(data.items ?? data.memories ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function capture() {
    if (!draft.trim()) return;
    await api("/api/memory", {
      method: "POST",
      body: JSON.stringify({ content: draft, sourceType: "mobile-inbox", tags: ["Inbox"], status: "PENDING" }),
    });
    setDraft("");
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>Inbox</Text>
        <Text style={{ marginTop: 4, color: "#64748b" }}>快速收集想法、资料和待整理内容</Text>

        <View style={{ marginTop: 18, borderRadius: 24, backgroundColor: "white", padding: 16 }}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="快速记录..." multiline style={{ minHeight: 80, fontSize: 16, color: "#0f172a", textAlignVertical: "top" }} />
          <TouchableOpacity onPress={() => void capture()} style={{ marginTop: 12, borderRadius: 16, backgroundColor: "#2563eb", padding: 13, alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "700" }}>保存到 Inbox</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 90 }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 12, borderRadius: 20, backgroundColor: "white", padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="mail-outline" size={16} color="#2563eb" />
                <Text style={{ color: "#64748b", fontSize: 12 }}>{item.status ?? "PENDING"}</Text>
              </View>
              <Text style={{ marginTop: 8, color: "#0f172a", lineHeight: 22 }}>{item.title ?? item.content ?? "未命名内容"}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={{ marginTop: 28, textAlign: "center", color: "#94a3b8" }}>暂无 Inbox 内容</Text>}
        />
      </View>
    </SafeAreaView>
  );
}
