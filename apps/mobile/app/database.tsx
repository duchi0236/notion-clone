import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";

type Collection = {
  id: string;
  name: string;
  description?: string;
  rows?: Array<{ id: string; data: Record<string, unknown> }>;
};

type ListCategory = "all" | "task" | "project" | "customer" | "travel";

const categories: Array<{ id: ListCategory; title: string; icon: keyof typeof Ionicons.glyphMap; hint: string }> = [
  { id: "all", title: "全部", icon: "albums-outline", hint: "所有清单" },
  { id: "task", title: "任务", icon: "checkbox-outline", hint: "待办和行动项" },
  { id: "project", title: "项目", icon: "rocket-outline", hint: "项目进度" },
  { id: "customer", title: "客户", icon: "people-outline", hint: "联系人和客户" },
  { id: "travel", title: "旅行", icon: "airplane-outline", hint: "行程计划" },
];

export default function DatabaseScreen() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<ListCategory>("all");

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ collections: Collection[] }>("/api/collections");
      setCollections(data.collections ?? []);
    } catch {
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredCollections = useMemo(() => {
    if (category === "all") return collections;
    const keywordMap: Record<ListCategory, string[]> = {
      all: [],
      task: ["任务", "待办", "todo", "task"],
      project: ["项目", "project"],
      customer: ["客户", "联系人", "customer", "client"],
      travel: ["旅行", "行程", "travel", "trip"],
    };
    const keywords = keywordMap[category];
    return collections.filter((item) => keywords.some((word) => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(word.toLowerCase())));
  }, [collections, category]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>清单</Text>
        <Text style={{ marginTop: 4, color: "#64748b" }}>管理任务、项目、客户和旅行计划</Text>

        <View style={{ marginTop: 18 }}>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setCategory(item.id)} style={{ marginRight: 10, width: 108, borderRadius: 20, backgroundColor: category === item.id ? "#2563eb" : "white", padding: 14 }}>
                <Ionicons name={item.icon} size={22} color={category === item.id ? "white" : "#2563eb"} />
                <Text style={{ marginTop: 10, fontWeight: "700", color: category === item.id ? "white" : "#0f172a" }}>{item.title}</Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: category === item.id ? "#dbeafe" : "#94a3b8" }}>{item.hint}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <FlatList
          data={filteredCollections}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          contentContainerStyle={{ paddingTop: 18, paddingBottom: 90 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/database/${item.id}`)} style={{ marginBottom: 12, borderRadius: 22, backgroundColor: "white", padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ height: 42, width: 42, borderRadius: 16, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="list-outline" size={20} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: "#0f172a" }}>{item.name}</Text>
                  <Text style={{ marginTop: 4, color: "#64748b" }}>{item.rows?.length ?? 0} 个条目</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{ marginTop: 30, textAlign: "center", color: "#94a3b8" }}>暂无清单</Text>}
        />
      </View>
    </SafeAreaView>
  );
}
