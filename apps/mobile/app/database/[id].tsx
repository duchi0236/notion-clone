import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, Modal, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";

type Field = { id: string; name: string; type: string };
type Row = { id: string; data: Record<string, unknown> };
type Collection = { id: string; name: string; description?: string; schema: Field[]; rows: Row[] };

export default function DatabaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ collection: Collection }>(`/api/collections/${id}`);
      setCollection(data.collection);
    } finally {
      setLoading(false);
    }
  }

  async function createRow() {
    if (!collection) return;
    const data: Record<string, unknown> = {};
    collection.schema.forEach((field) => {
      data[field.id] = draft[field.id] ?? "";
    });
    await api(`/api/collections/${collection.id}/rows`, { method: "POST", body: JSON.stringify({ data }) });
    setDraft({});
    setCreating(false);
    await load();
  }

  function openEdit(row: Row) {
    setEditingRow(row);
    const next: Record<string, string> = {};
    collection?.schema.forEach((field) => {
      next[field.id] = String(row.data?.[field.id] ?? "");
    });
    setEditDraft(next);
  }

  async function saveRow() {
    if (!editingRow) return;
    await api(`/api/collection-rows/${editingRow.id}`, { method: "PUT", body: JSON.stringify({ data: editDraft }) });
    setEditingRow(null);
    await load();
  }

  async function deleteRow() {
    if (!editingRow) return;
    Alert.alert("删除记录", "确定要删除这条记录吗？", [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => { await api(`/api/collection-rows/${editingRow.id}`, { method: "DELETE" }); setEditingRow(null); await load(); } },
    ]);
  }

  useEffect(() => {
    void load();
  }, [id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "white" }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#0f172a" /></TouchableOpacity>
        <Text style={{ fontWeight: "700", color: "#0f172a" }}>{collection?.name ?? "数据库"}</Text>
        <TouchableOpacity onPress={() => setCreating((value) => !value)}><Ionicons name="add-circle-outline" size={24} color="#2563eb" /></TouchableOpacity>
      </View>

      <FlatList
        data={collection?.rows ?? []}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={{ padding: 18, paddingBottom: 90 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#0f172a" }}>{collection?.name ?? "加载中..."}</Text>
            <Text style={{ marginTop: 6, color: "#64748b" }}>{collection?.rows?.length ?? 0} 条记录</Text>
            {creating && collection && (
              <View style={{ marginTop: 16, borderRadius: 22, backgroundColor: "white", padding: 16 }}>
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#0f172a" }}>新增记录</Text>
                {collection.schema.slice(0, 8).map((field) => (
                  <View key={field.id} style={{ marginTop: 12 }}>
                    <Text style={{ marginBottom: 6, color: "#64748b" }}>{field.name}</Text>
                    <TextInput value={draft[field.id] ?? ""} onChangeText={(value) => setDraft((prev) => ({ ...prev, [field.id]: value }))} placeholder={field.name} style={{ borderRadius: 14, backgroundColor: "#f8fafc", padding: 12, color: "#0f172a" }} />
                  </View>
                ))}
                <TouchableOpacity onPress={() => void createRow()} style={{ marginTop: 16, borderRadius: 16, backgroundColor: "#2563eb", padding: 14, alignItems: "center" }}>
                  <Text style={{ color: "white", fontWeight: "700" }}>保存记录</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openEdit(item)} style={{ marginBottom: 12, borderRadius: 22, backgroundColor: "white", padding: 16 }}>
            {(collection?.schema ?? []).slice(0, 6).map((field) => (
              <View key={field.id} style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingVertical: 9 }}>
                <Text style={{ color: "#64748b" }}>{field.name}</Text>
                <Text numberOfLines={1} style={{ maxWidth: 180, color: "#0f172a", fontWeight: "600" }}>{String(item.data?.[field.id] ?? "-")}</Text>
              </View>
            ))}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ marginTop: 30, textAlign: "center", color: "#94a3b8" }}>暂无记录</Text>}
      />

      <Modal visible={Boolean(editingRow)} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 90 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>编辑记录</Text>
              <TouchableOpacity onPress={() => setEditingRow(null)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>
            {(collection?.schema ?? []).slice(0, 12).map((field) => (
              <View key={field.id} style={{ marginTop: 14 }}>
                <Text style={{ marginBottom: 6, color: "#64748b" }}>{field.name}</Text>
                <TextInput value={editDraft[field.id] ?? ""} onChangeText={(value) => setEditDraft((prev) => ({ ...prev, [field.id]: value }))} placeholder={field.name} style={{ borderRadius: 14, backgroundColor: "#f8fafc", padding: 12, color: "#0f172a" }} />
              </View>
            ))}
            <TouchableOpacity onPress={() => void saveRow()} style={{ marginTop: 22, borderRadius: 16, backgroundColor: "#2563eb", padding: 15, alignItems: "center" }}>
              <Text style={{ color: "white", fontWeight: "700" }}>保存记录</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void deleteRow()} style={{ marginTop: 12, borderRadius: 16, backgroundColor: "#fee2e2", padding: 15, alignItems: "center" }}>
              <Text style={{ color: "#dc2626", fontWeight: "700" }}>删除记录</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
