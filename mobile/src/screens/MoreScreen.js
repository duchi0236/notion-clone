import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { useServer } from "../config/ServerContext";
import { Card, SectionTitle } from "../components/ui";
import { colors, radius, spacing } from "../theme";

const SECTIONS = [
  {
    title: "工作区",
    items: [
      { route: "Bitable", label: "多维表格", desc: "Base / 表格 / 看板", icon: "grid-outline", tint: "#0ea5a5" },
      { route: "Templates", label: "模板中心", desc: "从模板快速新建", icon: "documents-outline", tint: "#4f6bed" },
      { route: "Files", label: "文件", desc: "上传 / 管理附件", icon: "folder-open-outline", tint: "#d97706" },
      { route: "Trash", label: "回收站", desc: "恢复 / 永久删除", icon: "trash-outline", tint: "#dc2626" },
    ],
  },
  {
    title: "知识 & AI",
    items: [
      { route: "Search", label: "全局搜索", desc: "关键词 / 语义", icon: "search", tint: "#0ea5a5" },
      { route: "Inbox", label: "收集箱", desc: "OpenClaw / 网页 / 文件", icon: "file-tray-full-outline", tint: "#d97706" },
      { route: "Memory", label: "Agent Memory", desc: "审核长期记忆", icon: "library-outline", tint: "#7c3aed" },
      { route: "Agent", label: "AI 助手", desc: "搜索 / 新建 / 摘要", icon: "sparkles-outline", tint: "#4f6bed" },
    ],
  },
  {
    title: "账户 & 设置",
    items: [
      { route: "Account", label: "账号", desc: "登录 / 注册", icon: "person-circle-outline", tint: "#16a34a" },
      { route: "Members", label: "成员", desc: "工作区成员与角色", icon: "people-outline", tint: "#7c3aed" },
      { route: "AiConfig", label: "AI 配置", desc: "模型 / 技能开关", icon: "color-wand-outline", tint: "#4f6bed" },
      { route: "Settings", label: "设置", desc: "服务器地址 / Token", icon: "settings-outline", tint: colors.textMuted },
    ],
  },
];

export default function MoreScreen({ navigation }) {
  const api = useApi();
  const { baseUrl } = useServer();
  const [ws, setWs] = useState(null);
  const [online, setOnline] = useState(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      try { const r = await api.getWorkspace(); if (alive) { setWs(r?.workspace || null); setOnline(true); } }
      catch { if (alive) setOnline(false); }
    })();
    return () => { alive = false; };
  }, [api]));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <Card style={styles.wsCard}>
        <Text style={styles.wsIcon}>{ws?.icon || "🧠"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.wsName}>{ws?.name || "个人知识库"}</Text>
          <Text style={styles.wsMeta} numberOfLines={1}>{baseUrl.replace(/^https?:\/\//, "")}</Text>
        </View>
        <View style={[styles.dot, { backgroundColor: online === false ? colors.danger : online ? colors.success : colors.textFaint }]} />
      </Card>

      {SECTIONS.map((section) => (
        <View key={section.title} style={{ marginTop: spacing.xl }}>
          <SectionTitle>{section.title}</SectionTitle>
          {section.items.map((it) => (
            <Card key={it.route} onPress={() => navigation.navigate(it.route)} style={styles.row}>
              <View style={[styles.icon, { backgroundColor: it.tint + "1a" }]}>
                <Ionicons name={it.icon} size={20} color={it.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{it.label}</Text>
                <Text style={styles.desc}>{it.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Card>
          ))}
        </View>
      ))}

      <Text style={styles.footer}>ClawNote · 原生移动客户端</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wsCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  wsIcon: { fontSize: 28 },
  wsName: { fontSize: 17, fontWeight: "800", color: colors.text },
  wsMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15, fontWeight: "700", color: colors.text },
  desc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  footer: { textAlign: "center", color: colors.textFaint, fontSize: 12, marginTop: spacing.xl },
});
