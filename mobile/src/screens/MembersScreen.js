import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useApi } from "../api/clawnote";
import { Badge, Card, EmptyState, ErrorState, Loading } from "../components/ui";
import { colors, spacing } from "../theme";

const ROLE_META = {
  OWNER: { label: "拥有者", bg: colors.accentSoft, fg: colors.accent },
  ADMIN: { label: "管理员", bg: colors.warningSoft, fg: colors.warning },
  MEMBER: { label: "成员", bg: colors.surfaceAlt, fg: colors.textMuted },
  GUEST: { label: "访客", bg: colors.surfaceAlt, fg: colors.textFaint },
};

export default function MembersScreen() {
  const api = useApi();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); const r = await api.listMembers(); setMembers(r?.members || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      data={members}
      keyExtractor={(m) => m.id}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      renderItem={({ item }) => {
        const meta = ROLE_META[item.role] || ROLE_META.MEMBER;
        const name = item.user?.name || item.user?.email || "成员";
        return (
          <Card style={styles.row}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.email}>{item.user?.email}</Text>
            </View>
            <Badge label={meta.label} bg={meta.bg} fg={meta.fg} />
          </Card>
        );
      }}
      ListEmptyComponent={<EmptyState icon="people-outline" title="暂无成员" />}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
