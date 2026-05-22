import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { FlatList, Modal, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";

type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  status: string;
  source: string;
};

function dateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 16);
}

export default function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(dateInputValue());
  const [endsAt, setEndsAt] = useState(dateInputValue(new Date(Date.now() + 60 * 60 * 1000)));

  async function load() {
    setLoading(true);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      const data = await api<{ events: CalendarEvent[] }>(`/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`);
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setStartsAt(dateInputValue(new Date()));
    setEndsAt(dateInputValue(new Date(Date.now() + 60 * 60 * 1000)));
    setDialogOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setTitle(event.title);
    setDescription(event.description ?? "");
    setStartsAt(dateInputValue(new Date(event.startsAt)));
    setEndsAt(dateInputValue(new Date(event.endsAt)));
    setDialogOpen(true);
  }

  async function saveEvent() {
    const payload = {
      title: title || "Untitled Event",
      description,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      allDay: false,
    };
    if (editing && !editing.id.startsWith("task:")) {
      await api(`/api/calendar/events/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await api("/api/calendar/events", { method: "POST", body: JSON.stringify(payload) });
    }
    setDialogOpen(false);
    await load();
  }

  async function deleteEvent() {
    if (!editing || editing.id.startsWith("task:")) return;
    await api(`/api/calendar/events/${editing.id}`, { method: "DELETE" });
    setDialogOpen(false);
    await load();
  }

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  const sorted = [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ padding: 20, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>日历</Text>
            <Text style={{ marginTop: 4, color: "#64748b" }}>日程和待办任务</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={prevMonth} style={{ borderRadius: 14, backgroundColor: "white", padding: 10 }}><Ionicons name="chevron-back" size={18} color="#0f172a" /></TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={{ borderRadius: 14, backgroundColor: "white", padding: 10 }}><Ionicons name="chevron-forward" size={18} color="#0f172a" /></TouchableOpacity>
            <TouchableOpacity onPress={openCreate} style={{ borderRadius: 14, backgroundColor: "#2563eb", padding: 10 }}><Ionicons name="add" size={18} color="white" /></TouchableOpacity>
          </View>
        </View>

        <View style={{ marginTop: 18, borderRadius: 24, backgroundColor: "white", padding: 18 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>{currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月</Text>
          <Text style={{ marginTop: 6, color: "#64748b" }}>{events.length} 个日程 / 待办</Text>
        </View>

        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openEdit(item)} style={{ marginBottom: 12, borderRadius: 22, backgroundColor: "white", padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ height: 38, width: 38, borderRadius: 15, backgroundColor: item.source === "TASK" ? "#fef3c7" : "#eff6ff", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={item.source === "TASK" ? "checkbox-outline" : "calendar-outline"} size={19} color={item.source === "TASK" ? "#d97706" : "#2563eb"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>{item.title}</Text>
                  <Text style={{ marginTop: 4, color: "#64748b" }}>{new Date(item.startsAt).toLocaleString()} · {item.source === "TASK" ? "待办" : "日程"}</Text>
                </View>
              </View>
              {!!item.description && <Text style={{ marginTop: 10, color: "#64748b", lineHeight: 21 }}>{item.description}</Text>}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{ marginTop: 28, textAlign: "center", color: "#94a3b8" }}>暂无日程</Text>}
        />
      </View>

      <Modal visible={dialogOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <View style={{ padding: 20, flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>{editing ? "编辑日程" : "新建日程"}</Text>
              <TouchableOpacity onPress={() => setDialogOpen(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>
            {editing?.source === "TASK" && <Text style={{ marginTop: 16, borderRadius: 16, backgroundColor: "#fef3c7", padding: 12, color: "#92400e" }}>这是任务待办，来源于数据库。请在数据库中编辑。</Text>}
            <TextInput editable={editing?.source !== "TASK"} value={title} onChangeText={setTitle} placeholder="标题" style={{ marginTop: 22, borderRadius: 16, backgroundColor: "#f8fafc", padding: 14, fontSize: 16 }} />
            <TextInput editable={editing?.source !== "TASK"} value={description} onChangeText={setDescription} placeholder="说明" multiline style={{ marginTop: 12, minHeight: 90, borderRadius: 16, backgroundColor: "#f8fafc", padding: 14, fontSize: 16, textAlignVertical: "top" }} />
            <Text style={{ marginTop: 18, color: "#64748b" }}>开始时间 ISO</Text>
            <TextInput editable={editing?.source !== "TASK"} value={startsAt} onChangeText={setStartsAt} style={{ marginTop: 6, borderRadius: 16, backgroundColor: "#f8fafc", padding: 14 }} />
            <Text style={{ marginTop: 14, color: "#64748b" }}>结束时间 ISO</Text>
            <TextInput editable={editing?.source !== "TASK"} value={endsAt} onChangeText={setEndsAt} style={{ marginTop: 6, borderRadius: 16, backgroundColor: "#f8fafc", padding: 14 }} />
            <TouchableOpacity disabled={editing?.source === "TASK"} onPress={() => void saveEvent()} style={{ marginTop: 24, borderRadius: 16, backgroundColor: editing?.source === "TASK" ? "#cbd5e1" : "#2563eb", padding: 15, alignItems: "center" }}>
              <Text style={{ color: "white", fontWeight: "700" }}>保存</Text>
            </TouchableOpacity>
            {editing && !editing.id.startsWith("task:") && <TouchableOpacity onPress={() => void deleteEvent()} style={{ marginTop: 12, borderRadius: 16, backgroundColor: "#fee2e2", padding: 15, alignItems: "center" }}><Text style={{ color: "#dc2626", fontWeight: "700" }}>删除</Text></TouchableOpacity>}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
