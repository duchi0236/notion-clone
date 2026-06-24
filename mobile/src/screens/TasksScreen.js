import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Badge, Card, ErrorState, Field, Loading } from "../components/ui";
import { colors, priorityColors, radius, shadow, spacing, statusColors } from "../theme";

const STATUSES = ["未开始", "进行中", "已完成", "搁置"];
const PRIORITIES = ["低", "中", "高"];

function next(arr, cur) {
  const i = arr.indexOf(cur);
  return arr[(i + 1) % arr.length];
}

export default function TasksScreen() {
  const api = useApi();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState("");
  const [group, setGroup] = useState(true); // true=看板分组 false=列表

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.listTasks();
      setRows(res?.rows || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    try {
      const res = await api.createTask({ name });
      setRows((r) => [...r, res.row]);
    } catch (e) {
      Alert.alert("添加失败", e.message);
    }
  };

  const patch = async (row, partial) => {
    const data = { ...row.data, ...partial };
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, data } : x)));
    try { await api.updateTask(row.id, partial); }
    catch (e) { Alert.alert("更新失败", e.message); load(); }
  };

  const remove = (row) => {
    Alert.alert("删除任务？", row.data?.name || "", [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => {
        setRows((r) => r.filter((x) => x.id !== row.id));
        try { await api.deleteTask(row.id); } catch (e) { Alert.alert("删除失败", e.message); load(); }
      } },
    ]);
  };

  const sections = useMemo(() => {
    if (!group) return [{ key: "all", title: "全部任务", data: rows }];
    return STATUSES.map((s) => ({ key: s, title: s, data: rows.filter((r) => (r.data?.status || "未开始") === s) }));
  }, [rows, group]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.toolbar}>
        <Field value={draft} onChangeText={setDraft} placeholder="快速添加任务…" onSubmitEditing={add} returnKeyType="done" style={{ flex: 1 }} />
        <Pressable onPress={add} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
        <Pressable onPress={() => setGroup((g) => !g)} style={styles.viewBtn}>
          <Ionicons name={group ? "albums-outline" : "list-outline"} size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(s) => s.key}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item: section }) => (
          <View style={{ marginBottom: spacing.lg }}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{section.title}</Text>
              <Badge label={String(section.data.length)} />
            </View>
            {section.data.length === 0 ? (
              <Text style={styles.emptyGroup}>无</Text>
            ) : (
              section.data.map((row) => (
                <TaskCard key={row.id} row={row} onToggleStatus={() => patch(row, { status: next(STATUSES, row.data?.status || "未开始") })} onTogglePriority={() => patch(row, { priority: next(PRIORITIES, row.data?.priority || "中") })} onDelete={() => remove(row)} />
              ))
            )}
          </View>
        )}
      />
    </View>
  );
}

function TaskCard({ row, onToggleStatus, onTogglePriority, onDelete }) {
  const d = row.data || {};
  const status = d.status || "未开始";
  const priority = d.priority || "中";
  const done = status === "已完成";
  const sc = statusColors[status] || statusColors["未开始"];
  const pc = priorityColors[priority] || priorityColors["中"];
  return (
    <Card style={styles.taskCard}>
      <Pressable onPress={onToggleStatus} hitSlop={8}>
        <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={24} color={done ? colors.success : colors.borderStrong} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskName, done && styles.taskDone]} numberOfLines={2}>{d.name || "未命名任务"}</Text>
        <View style={styles.taskMeta}>
          <Pressable onPress={onToggleStatus}><Badge label={status} bg={sc.bg} fg={sc.fg} /></Pressable>
          <Pressable onPress={onTogglePriority}><Badge label={`优先级 ${priority}`} bg={pc.bg} fg={pc.fg} /></Pressable>
          {d.dueDate ? <Badge label={`📅 ${String(d.dueDate).slice(5, 10)}`} /> : null}
          {d.owner ? <Badge label={`@${d.owner}`} /> : null}
        </View>
      </View>
      <Pressable onPress={onDelete} hitSlop={8}><Ionicons name="trash-outline" size={18} color={colors.textFaint} /></Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.lg, paddingBottom: spacing.sm },
  addBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  viewBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  groupTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  emptyGroup: { color: colors.textFaint, fontSize: 12, paddingVertical: 4 },
  taskCard: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10, ...shadow },
  taskName: { fontSize: 15, fontWeight: "600", color: colors.text },
  taskDone: { textDecorationLine: "line-through", color: colors.textFaint },
  taskMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
});
