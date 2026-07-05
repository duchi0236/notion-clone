import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";

const suggestions = ["最近的会议纪要", "PRD 里提到的任务", "项目计划", "客户资料"];

export default function AiScreen() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("输入关键词，可以同时搜索文档、清单和知识内容。");
  const [loading, setLoading] = useState(false);

  async function search(value = query) {
    if (!value.trim()) return;
    setQuery(value);
    setLoading(true);
    try {
      const data = await api<{ results?: Array<{ citation?: { title?: string }; document?: { title?: string } }> }>("/api/knowledge/search", {
        method: "POST",
        body: JSON.stringify({ query: value, limit: 5 }),
      });
      const text = data.results?.map((item, index) => `${index + 1}. ${item.citation?.title ?? item.document?.title ?? "相关内容"}`).join("\n") || "没有找到相关内容";
      setAnswer(text);
    } catch {
      setAnswer("搜索失败，请检查网络或登录状态。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>搜索</Text>
        <Text style={{ marginTop: 4, color: "#64748b" }}>查找文档、清单和资料</Text>
        <View style={{ marginTop: 22, borderRadius: 24, backgroundColor: "white", padding: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="search-outline" size={18} color="#64748b" />
            <TextInput value={query} onChangeText={setQuery} placeholder="搜索任何内容..." style={{ flex: 1, fontSize: 16, color: "#0f172a" }} />
          </View>
          <TouchableOpacity onPress={() => void search()} style={{ marginTop: 14, borderRadius: 16, backgroundColor: "#2563eb", padding: 14, alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "700" }}>{loading ? "搜索中..." : "搜索"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {suggestions.map((item) => (
            <TouchableOpacity key={item} onPress={() => void search(item)} style={{ borderRadius: 999, backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: "#475569" }}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 16, borderRadius: 24, backgroundColor: "white", padding: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="document-text-outline" size={18} color="#2563eb" />
            <Text style={{ fontWeight: "700", color: "#0f172a" }}>搜索结果</Text>
          </View>
          <Text style={{ marginTop: 12, lineHeight: 24, color: "#334155" }}>{answer}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
