import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Badge, Button, Card, EmptyState, ErrorState, Loading } from "../components/ui";
import { colors, spacing } from "../theme";

export default function DocumentVersionsScreen({ navigation, route }) {
  const api = useApi();
  const { id } = route.params;
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); const r = await api.listVersions(id); setVersions(r?.versions || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const snapshot = async () => {
    try { await api.snapshotVersion(id); load(); Alert.alert("已创建快照"); }
    catch (e) { Alert.alert("失败", e.message); }
  };

  const restore = (v) => {
    Alert.alert("恢复到此版本？", `将把文档内容恢复为 v${v.version}（恢复前会自动留存当前版本）。`, [
      { text: "取消", style: "cancel" },
      { text: "恢复", style: "destructive", onPress: async () => {
        try { await api.restoreVersion(id, v.version); Alert.alert("已恢复", "返回编辑器查看。", [{ text: "好", onPress: () => navigation.goBack() }]); }
        catch (e) { Alert.alert("恢复失败", e.message); }
      } },
    ]);
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.bar}>
        <Button title="创建快照" icon="camera-outline" variant="ghost" onPress={snapshot} />
      </View>
      <FlatList
        data={versions}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={styles.vNum}><Text style={styles.vNumText}>v{item.version}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reason}>{item.reason || "更新"}</Text>
              <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()} · {item.changedBy}</Text>
            </View>
            <Pressable onPress={() => restore(item)} style={styles.restoreBtn}>
              <Ionicons name="arrow-undo-outline" size={16} color={colors.accent} />
              <Text style={styles.restoreText}>恢复</Text>
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="time-outline" title="暂无版本" subtitle="编辑保存后会自动留存历史版本" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { padding: spacing.lg, paddingBottom: 0, alignItems: "flex-start" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  vNum: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  vNumText: { fontWeight: "800", color: colors.text, fontSize: 13 },
  reason: { fontSize: 14, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  restoreBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.accentSoft, borderRadius: 999 },
  restoreText: { fontSize: 13, fontWeight: "600", color: colors.accent },
});
