import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Badge, Card, EmptyState, ErrorState, Loading } from "../components/ui";
import { colors, radius, shadow, spacing } from "../theme";

export default function BitableScreen({ navigation }) {
  const api = useApi();
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); const r = await api.listBases(); setBases(r?.bases || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createBase = async () => {
    try { const r = await api.createBase("新建多维表格"); load(); const t = r?.base?.tables?.[0] || r?.table; if (t) navigation.navigate("Table", { id: t.id, name: t.name }); }
    catch (e) { Alert.alert("创建失败", e.message); }
  };

  const addTable = async (base) => {
    try { const r = await api.createTable(base.id, "数据表"); load(); if (r?.table) navigation.navigate("Table", { id: r.table.id, name: r.table.name }); }
    catch (e) { Alert.alert("创建失败", e.message); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={bases}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 90, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12 }}>
            <View style={styles.baseHead}>
              <Text style={{ fontSize: 22 }}>{item.icon || "🗂️"}</Text>
              <Text style={styles.baseName}>{item.name}</Text>
              <Badge label={`${item.tables?.length || 0} 表`} />
            </View>
            <View style={styles.tables}>
              {(item.tables || []).map((t) => (
                <Pressable key={t.id} onPress={() => navigation.navigate("Table", { id: t.id, name: t.name })} style={styles.tableChip}>
                  <Text style={{ fontSize: 15 }}>{t.icon || "📋"}</Text>
                  <Text style={styles.tableName}>{t.name}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => addTable(item)} style={[styles.tableChip, styles.addTable]}>
                <Ionicons name="add" size={16} color={colors.accent} />
                <Text style={[styles.tableName, { color: colors.accent }]}>新表</Text>
              </Pressable>
            </View>
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="grid-outline" title="还没有多维表格" subtitle="点右下角创建一个 Base" />}
      />
      <Pressable onPress={createBase} style={({ pressed }) => [styles.fab, shadow, pressed && { opacity: 0.85 }]}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  baseHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  baseName: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text },
  tables: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  tableChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  addTable: { backgroundColor: colors.accentSoft },
  tableName: { fontSize: 13, fontWeight: "600", color: colors.text },
  fab: { position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
