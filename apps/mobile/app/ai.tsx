import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";

export default function AiScreen() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("移动端 AI 能力用于检索知识库、总结文档和生成草稿。此页先提供知识搜索入口。");
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api<{ results?: Array<{ citation?: { title?: string }; document?: { title?: string } }> }>("/api/knowledge/search", {
        method: "POST",
        body: JSON.stringify({ query, limit: 5 }),
      });
      const text = data.results?.map((item, index) => `${index + 1}. ${item.citation?.title ?? item.document?.title ?? "相关内容"}`).join("\n") || "没有找到相关内容";
      setAnswer(text);
    } catch {
      setAnswer("搜索失败，请检查 API 地址和登录状态。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>AI</Text>
        <Text style={{ marginTop: 4, color: "#64748b" }}>移动知识检索助手</Text>
        <View style={{ marginTop: 22, borderRadius: 24, backgroundColor: "white", padding: 18 }}>
          <TextInput value={query} onChangeText={setQuery} placeholder="搜索知识库..." multiline style={{ minHeight: 90, fontSize: 16, color: "#0f172a", textAlignVertical: "top" }} />
          <TouchableOpacity onPress={() => void search()} style={{ marginTop: 14, borderRadius: 16, backgroundColor: "#2563eb", padding: 14, alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "700" }}>{loading ? "搜索中..." : "搜索"}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 16, borderRadius: 24, backgroundColor: "white", padding: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="sparkles-outline" size={18} color="#2563eb" />
            <Text style={{ fontWeight: "700", color: "#0f172a" }}>结果</Text>
          </View>
          <Text style={{ marginTop: 12, lineHeight: 24, color: "#334155" }}>{answer}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
