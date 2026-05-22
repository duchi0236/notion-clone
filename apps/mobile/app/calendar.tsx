import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { FlatList, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
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

export default function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

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
            <View style={{ marginBottom: 12, borderRadius: 22, backgroundColor: "white", padding: 16 }}>
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
            </View>
          )}
          ListEmptyComponent={<Text style={{ marginTop: 28, textAlign: "center", color: "#94a3b8" }}>暂无日程</Text>}
        />
      </View>
    </SafeAreaView>
  );
}
