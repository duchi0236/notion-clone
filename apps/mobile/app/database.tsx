import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";

type Collection = {
  id: string;
  name: string;
  description?: string;
  rows?: Array<{ id: string; data: Record<string, unknown> }>;
};

export default function DatabaseScreen() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>数据库</Text>
        <Text style={{ marginTop: 4, color: "#64748b" }}>移动端查看 Collection 和记录</Text>
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          contentContainerStyle={{ paddingTop: 18, paddingBottom: 90 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/database/${item.id}`)} style={{ marginBottom: 12, borderRadius: 22, backgroundColor: "white", padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ height: 42, width: 42, borderRadius: 16, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="grid-outline" size={20} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: "#0f172a" }}>{item.name}</Text>
                  <Text style={{ marginTop: 4, color: "#64748b" }}>{item.rows?.length ?? 0} 条记录</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{ marginTop: 30, textAlign: "center", color: "#94a3b8" }}>暂无数据库</Text>}
        />
      </View>
    </SafeAreaView>
  );
}
