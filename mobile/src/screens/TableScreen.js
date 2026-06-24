import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Badge, Button, ErrorState, Field, Loading } from "../components/ui";
import { colors, radius, spacing } from "../theme";

const OPTION_COLORS = { gray: "#94a3b8", blue: "#4f6bed", green: "#16a34a", red: "#dc2626", yellow: "#d97706", purple: "#7c3aed" };

export default function TableScreen({ navigation, route }) {
  const api = useApi();
  const { id } = route.params;
  const [collection, setCollection] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("grid"); // grid | kanban
  const [editing, setEditing] = useState(null); // { rowId|null, data }

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await api.getTable(id);
      setCollection(r.collection);
      setRows(r.collection.rows || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const fields = useMemo(() => (Array.isArray(collection?.schema) ? collection.schema : []), [collection]);
  const primary = fields.find((f) => f.primary) || fields[0];
  const groupField = fields.find((f) => f.type === "select");

  useLayoutEffect(() => {
    navigation.setOptions({
      title: route.params?.name || "数据表",
      headerRight: () => (
        <Pressable onPress={() => setView((v) => (v === "grid" ? "kanban" : "grid"))} hitSlop={8}>
          <Ionicons name={view === "grid" ? "albums-outline" : "grid-outline"} size={20} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, view, route.params]);

  const optionName = (field, value) => {
    const opt = (field.options || []).find((o) => o.id === value || o.name === value);
    return opt ? opt.name : value || "";
  };
  const optionColor = (field, value) => {
    const opt = (field.options || []).find((o) => o.id === value || o.name === value);
    return opt ? (OPTION_COLORS[opt.color] || colors.textMuted) : colors.textMuted;
  };
  const cellText = (field, value) => {
    if (field.type === "checkbox") return value ? "✓" : "—";
    if (field.type === "select") return optionName(field, value);
    return value == null || value === "" ? "—" : String(value);
  };

  const openNew = () => setEditing({ rowId: null, data: {} });
  const openEdit = (row) => setEditing({ rowId: row.id, data: { ...row.data } });

  const saveRecord = async () => {
    const data = editing.data;
    try {
      if (editing.rowId) { await api.updateRow(editing.rowId, data); }
      else { await api.createRow(id, data); }
      setEditing(null); load();
    } catch (e) { Alert.alert("保存失败", e.message); }
  };

  const deleteRecord = () => {
    if (!editing.rowId) { setEditing(null); return; }
    Alert.alert("删除记录？", "", [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => {
        try { await api.deleteRow(editing.rowId); setEditing(null); load(); }
        catch (e) { Alert.alert("删除失败", e.message); }
      } },
    ]);
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {view === "grid" ? (
        <ScrollView horizontal>
          <ScrollView>
            {/* 表头 */}
            <View style={styles.headerRow}>
              {fields.map((f) => (
                <View key={f.id} style={[styles.headCell, { width: f.width || 140 }]}>
                  <Text style={styles.headText} numberOfLines={1}>{f.name}</Text>
                </View>
              ))}
            </View>
            {rows.map((row) => (
              <Pressable key={row.id} onPress={() => openEdit(row)} style={styles.bodyRow}>
                {fields.map((f) => (
                  <View key={f.id} style={[styles.bodyCell, { width: f.width || 140 }]}>
                    {f.type === "select" && row.data?.[f.id] ? (
                      <Badge label={optionName(f, row.data[f.id])} bg={optionColor(f, row.data[f.id]) + "22"} fg={optionColor(f, row.data[f.id])} />
                    ) : (
                      <Text style={[styles.cellText, f.primary && styles.cellPrimary]} numberOfLines={1}>{cellText(f, row.data?.[f.id])}</Text>
                    )}
                  </View>
                ))}
              </Pressable>
            ))}
          </ScrollView>
        </ScrollView>
      ) : (
        <ScrollView horizontal contentContainerStyle={{ padding: spacing.md, gap: 12 }}>
          {(groupField?.options || [{ id: "__none", name: "未分组" }]).map((opt) => {
            const colRows = rows.filter((r) => groupField ? (r.data?.[groupField.id] === opt.id || r.data?.[groupField.id] === opt.name) : true);
            return (
              <View key={opt.id} style={styles.kanbanCol}>
                <View style={styles.kanbanHead}>
                  <Text style={styles.kanbanTitle}>{opt.name}</Text>
                  <Badge label={String(colRows.length)} />
                </View>
                {colRows.map((row) => (
                  <Pressable key={row.id} onPress={() => openEdit(row)} style={styles.kanbanCard}>
                    <Text style={styles.kanbanCardTitle} numberOfLines={2}>{cellText(primary, row.data?.[primary?.id]) || "未命名"}</Text>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Pressable onPress={openNew} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalWrap}>
          <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: spacing.xl }}>
            <Text style={styles.sheetTitle}>{editing?.rowId ? "编辑记录" : "新建记录"}</Text>
            {fields.map((f) => (
              <View key={f.id} style={{ marginTop: spacing.md }}>
                <Text style={styles.label}>{f.name}</Text>
                {f.type === "checkbox" ? (
                  <Switch value={!!editing?.data?.[f.id]} onValueChange={(v) => setEditing((e) => ({ ...e, data: { ...e.data, [f.id]: v } }))} />
                ) : f.type === "select" ? (
                  <View style={styles.chipRow}>
                    {(f.options || []).map((o) => {
                      const on = editing?.data?.[f.id] === o.id || editing?.data?.[f.id] === o.name;
                      return (
                        <Pressable key={o.id} onPress={() => setEditing((e) => ({ ...e, data: { ...e.data, [f.id]: o.id } }))} style={[styles.chip, on && { backgroundColor: OPTION_COLORS[o.color] || colors.primary, borderColor: OPTION_COLORS[o.color] || colors.primary }]}>
                          <Text style={[styles.chipText, on && { color: "#fff" }]}>{o.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Field
                    value={editing?.data?.[f.id] != null ? String(editing.data[f.id]) : ""}
                    onChangeText={(t) => setEditing((e) => ({ ...e, data: { ...e.data, [f.id]: t } }))}
                    placeholder={f.type === "date" ? "YYYY-MM-DD" : f.name}
                    keyboardType={f.type === "number" ? "numeric" : "default"}
                  />
                )}
              </View>
            ))}
            <View style={{ flexDirection: "row", gap: 10, marginTop: spacing.lg }}>
              <Button title={editing?.rowId ? "删除" : "取消"} icon={editing?.rowId ? "trash-outline" : undefined} variant="ghost" onPress={deleteRecord} style={{ flex: 1 }} />
              <Button title="保存" icon="checkmark" onPress={saveRecord} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: colors.borderStrong },
  headCell: { paddingVertical: 10, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: colors.border },
  headText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  bodyRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  bodyCell: { paddingVertical: 12, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: "center" },
  cellText: { fontSize: 13, color: colors.text },
  cellPrimary: { fontWeight: "700" },
  kanbanCol: { width: 220, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: 10 },
  kanbanHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  kanbanTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  kanbanCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  kanbanCardTitle: { fontSize: 14, color: colors.text, fontWeight: "600" },
  fab: { position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  modalWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.35)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: "88%" },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
});
