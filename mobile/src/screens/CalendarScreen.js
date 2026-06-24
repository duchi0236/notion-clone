import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Button, Card, ErrorState, Field, Loading } from "../components/ui";
import { colors, radius, shadow, spacing } from "../theme";

const WD = ["日", "一", "二", "三", "四", "五", "六"];
const COLORS = ["blue", "red", "green", "orange", "purple", "teal"];
const REPEATS = [
  { v: "none", l: "不重复" }, { v: "daily", l: "每天" }, { v: "weekly", l: "每周" },
  { v: "monthly", l: "每月" }, { v: "yearly", l: "每年" },
];
const REMINDERS = [
  { v: null, l: "无" }, { v: 0, l: "准点" }, { v: 10, l: "10分钟前" }, { v: 30, l: "30分钟前" }, { v: 60, l: "1小时前" }, { v: 1440, l: "1天前" },
];

function monthRange(base) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function fmtTime(d) { return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function colorOf(name) {
  const m = { blue: "#4f6bed", red: "#dc2626", green: "#16a34a", orange: "#d97706", purple: "#7c3aed", teal: "#0ea5a5" };
  return m[name] || m.blue;
}

const EMPTY_FORM = { id: null, title: "", dayOffset: 0, hour: 9, allDay: false, color: "blue", location: "", repeat: "none", reminderMinutes: null };

export default function CalendarScreen() {
  const api = useApi();
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // ymd string or null = all
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { start, end } = monthRange(cursor);
      const res = await api.listEvents(start.toISOString(), end.toISOString());
      setEvents(res?.events || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api, cursor]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const byDay = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const key = ymd(new Date(ev.startsAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    return map;
  }, [events]);

  const agenda = useMemo(() => {
    let entries = [...byDay.entries()];
    if (selectedDay) entries = entries.filter(([k]) => k === selectedDay);
    return entries.sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, list]) => ({ key, list: list.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)) }));
  }, [byDay, selectedDay]);

  // 月历网格
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const lead = first.getDay();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return cells;
  }, [cursor]);

  const openCreate = () => {
    const base = selectedDay ? Math.round((new Date(selectedDay + "T00:00:00") - new Date(new Date().toDateString())) / 86400000) : 0;
    setForm({ ...EMPTY_FORM, dayOffset: base >= 0 ? base : 0 });
    setShowEditor(true);
  };

  const openEdit = (ev) => {
    const start = new Date(ev.startsAt);
    const dayOffset = Math.round((new Date(start.toDateString()) - new Date(new Date().toDateString())) / 86400000);
    setForm({ id: ev.id, title: ev.title, dayOffset, hour: start.getHours(), allDay: !!ev.allDay, color: ev.color || "blue", location: ev.location || "", repeat: ev.repeat || "none", reminderMinutes: ev.reminderMinutes ?? null });
    setShowEditor(true);
  };

  const submit = async () => {
    if (!form.title.trim()) { Alert.alert("请输入标题"); return; }
    const base = new Date();
    base.setDate(base.getDate() + form.dayOffset);
    base.setHours(form.allDay ? 0 : form.hour, 0, 0, 0);
    const endsAt = new Date(base.getTime() + (form.allDay ? 24 * 3600 * 1000 : 3600 * 1000));
    const payload = {
      title: form.title.trim(), startsAt: base.toISOString(), endsAt: endsAt.toISOString(),
      allDay: form.allDay, color: form.color, location: form.location.trim(),
      repeat: form.repeat, reminderMinutes: form.reminderMinutes,
    };
    try {
      if (form.id) await api.updateEvent(form.id, payload);
      else await api.createEvent(payload);
      setShowEditor(false); setForm(EMPTY_FORM); load();
    } catch (e) { Alert.alert("保存失败", e.message); }
  };

  const remove = () => {
    if (!form.id) return;
    Alert.alert("删除日程？", form.title, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => {
        try { await api.deleteEvent(form.id); setShowEditor(false); setForm(EMPTY_FORM); load(); }
        catch (e) { Alert.alert("删除失败", e.message); }
      } },
    ]);
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const todayKey = ymd(new Date());

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Pressable onPress={() => { setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)); setSelectedDay(null); }} hitSlop={10}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <Pressable onPress={() => { setCursor(new Date()); setSelectedDay(null); }}><Text style={styles.month}>{cursor.getFullYear()}年 {cursor.getMonth() + 1}月</Text></Pressable>
        <Pressable onPress={() => { setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)); setSelectedDay(null); }} hitSlop={10}><Ionicons name="chevron-forward" size={22} color={colors.text} /></Pressable>
      </View>

      {/* 月历网格 */}
      <View style={styles.gridWrap}>
        <View style={styles.weekRow}>{WD.map((w) => <Text key={w} style={styles.weekCell}>{w}</Text>)}</View>
        <View style={styles.grid}>
          {grid.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={styles.cell} />;
            const key = ymd(d);
            const has = byDay.has(key);
            const isToday = key === todayKey;
            const isSel = key === selectedDay;
            return (
              <Pressable key={key} onPress={() => setSelectedDay(isSel ? null : key)} style={styles.cell}>
                <View style={[styles.cellInner, isToday && styles.cellToday, isSel && styles.cellSel]}>
                  <Text style={[styles.cellNum, (isToday || isSel) && styles.cellNumOn]}>{d.getDate()}</Text>
                </View>
                {has ? <View style={[styles.dot, { backgroundColor: isSel ? "#fff" : colors.accent }]} /> : <View style={styles.dotPlaceholder} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={agenda}
        keyExtractor={(s) => s.key}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const d = new Date(item.key + "T00:00:00");
          return (
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={styles.dayHead}>{item.key.slice(5)} 周{WD[d.getDay()]}</Text>
              {item.list.map((ev) => (
                <Card key={ev.id} onPress={() => openEdit(ev)} style={styles.evCard}>
                  <View style={[styles.evBar, { backgroundColor: colorOf(ev.color) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.evTitle} numberOfLines={1}>{ev.title}</Text>
                    <Text style={styles.evTime}>
                      {ev.allDay ? "全天" : `${fmtTime(new Date(ev.startsAt))} - ${fmtTime(new Date(ev.endsAt))}`}
                      {ev.location ? ` · ${ev.location}` : ""}
                      {ev.repeat && ev.repeat !== "none" ? " · 🔁" : ""}
                      {ev.reminderMinutes != null ? " · 🔔" : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                </Card>
              ))}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>{selectedDay ? "这天没有日程。" : "本月暂无日程。点右下角 + 添加。"}</Text>}
      />

      <Pressable onPress={openCreate} style={({ pressed }) => [styles.fab, shadow, pressed && { opacity: 0.85 }]}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      <Modal visible={showEditor} transparent animationType="slide" onRequestClose={() => setShowEditor(false)}>
        <View style={styles.modalWrap}>
          <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: spacing.xl }}>
            <Text style={styles.sheetTitle}>{form.id ? "编辑日程" : "新建日程"}</Text>
            <Field value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} placeholder="日程标题" />
            <Field value={form.location} onChangeText={(t) => setForm({ ...form, location: t })} placeholder="地点（可选）" style={{ marginTop: spacing.sm }} />

            <Text style={styles.label}>日期</Text>
            <View style={styles.chipRow}>
              {[{ l: "今天", v: 0 }, { l: "明天", v: 1 }, { l: "后天", v: 2 }, { l: "+7天", v: 7 }].map((o) => (
                <Chip key={o.v} on={form.dayOffset === o.v} label={o.l} onPress={() => setForm({ ...form, dayOffset: o.v })} />
              ))}
            </View>

            <View style={styles.switchRow}><Text style={styles.label}>全天</Text><Switch value={form.allDay} onValueChange={(v) => setForm({ ...form, allDay: v })} /></View>
            {!form.allDay && (
              <>
                <Text style={styles.label}>开始时间</Text>
                <View style={styles.chipRow}>{[8, 9, 10, 12, 14, 16, 18, 20].map((h) => <Chip key={h} on={form.hour === h} label={`${h}:00`} onPress={() => setForm({ ...form, hour: h })} />)}</View>
              </>
            )}

            <Text style={styles.label}>颜色</Text>
            <View style={styles.chipRow}>
              {COLORS.map((c) => (
                <Pressable key={c} onPress={() => setForm({ ...form, color: c })} style={[styles.colorDot, { backgroundColor: colorOf(c) }, form.color === c && styles.colorOn]} />
              ))}
            </View>

            <Text style={styles.label}>重复</Text>
            <View style={styles.chipRow}>{REPEATS.map((o) => <Chip key={o.v} on={form.repeat === o.v} label={o.l} onPress={() => setForm({ ...form, repeat: o.v })} />)}</View>

            <Text style={styles.label}>提醒</Text>
            <View style={styles.chipRow}>{REMINDERS.map((o) => <Chip key={String(o.v)} on={form.reminderMinutes === o.v} label={o.l} onPress={() => setForm({ ...form, reminderMinutes: o.v })} />)}</View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: spacing.lg }}>
              {form.id ? <Button title="删除" icon="trash-outline" variant="ghost" onPress={remove} style={{ flex: 1 }} /> : <Button title="取消" variant="ghost" onPress={() => setShowEditor(false)} style={{ flex: 1 }} />}
              <Button title="保存" icon="checkmark" onPress={submit} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Chip({ on, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  month: { fontSize: 17, fontWeight: "800", color: colors.text },
  gridWrap: { backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  weekRow: { flexDirection: "row", paddingVertical: 6 },
  weekCell: { flex: 1, textAlign: "center", fontSize: 11, color: colors.textFaint, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 3 },
  cellInner: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cellToday: { borderWidth: 1.5, borderColor: colors.accent },
  cellSel: { backgroundColor: colors.primary },
  cellNum: { fontSize: 13, color: colors.text, fontWeight: "600" },
  cellNumOn: { color: colors.accent },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  dotPlaceholder: { height: 7 },
  dayHead: { fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  evCard: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, paddingVertical: 12 },
  evBar: { width: 4, height: 34, borderRadius: 2 },
  evTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  evTime: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 30 },
  fab: { position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  modalWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.35)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: "88%" },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.md, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "transparent" },
  colorOn: { borderColor: colors.text },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
});
