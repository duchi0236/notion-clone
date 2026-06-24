import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Button, Card, ErrorState, Field, Loading, SectionTitle } from "../components/ui";
import { colors, radius, spacing } from "../theme";

const PROVIDERS = [
  { id: "none", name: "内置规则助手", models: [] },
  { id: "claude", name: "Anthropic Claude", models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"] },
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "o3-mini"] },
  { id: "custom", name: "自定义(兼容 OpenAI)", models: [] },
];

export default function AiConfigScreen() {
  const api = useApi();
  const [cfg, setCfg] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await api.getAiConfig();
      setCfg(r.config); setSkills(r.skills || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const toggleSkill = (id) => {
    const has = cfg.enabledSkills?.includes(id);
    set({ enabledSkills: has ? cfg.enabledSkills.filter((s) => s !== id) : [...(cfg.enabledSkills || []), id] });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        provider: cfg.provider, model: cfg.model, baseUrl: cfg.baseUrl,
        temperature: Number(cfg.temperature), maxTokens: Number(cfg.maxTokens),
        enabledSkills: cfg.enabledSkills,
      };
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      const r = await api.updateAiConfig(payload);
      setCfg(r.config); setApiKey("");
      Alert.alert("已保存", "AI 配置已更新。");
    } catch (e) { Alert.alert("保存失败", e.message); } finally { setSaving(false); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const provider = PROVIDERS.find((p) => p.id === cfg.provider) || PROVIDERS[0];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <SectionTitle>模型提供方</SectionTitle>
      <Card>
        <View style={styles.chipRow}>
          {PROVIDERS.map((p) => (
            <Pressable key={p.id} onPress={() => set({ provider: p.id, model: p.models[0] || cfg.model })} style={[styles.chip, cfg.provider === p.id && styles.chipOn]}>
              <Text style={[styles.chipText, cfg.provider === p.id && styles.chipTextOn]}>{p.name}</Text>
            </Pressable>
          ))}
        </View>

        {provider.models.length > 0 && (
          <>
            <Text style={styles.label}>模型</Text>
            <View style={styles.chipRow}>
              {provider.models.map((m) => (
                <Pressable key={m} onPress={() => set({ model: m })} style={[styles.chip, cfg.model === m && styles.chipOn]}>
                  <Text style={[styles.chipText, cfg.model === m && styles.chipTextOn]}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {(provider.id === "custom") && (
          <>
            <Text style={styles.label}>模型名</Text>
            <Field value={cfg.model} onChangeText={(t) => set({ model: t })} placeholder="model name" autoCapitalize="none" />
            <Text style={styles.label}>Base URL</Text>
            <Field value={cfg.baseUrl} onChangeText={(t) => set({ baseUrl: t })} placeholder="https://api.example.com/v1" autoCapitalize="none" />
          </>
        )}

        {provider.id !== "none" && (
          <>
            <Text style={styles.label}>API Key {cfg.hasApiKey ? "（已设置，留空则不变）" : ""}</Text>
            <Field value={apiKey} onChangeText={setApiKey} placeholder={cfg.hasApiKey ? "••••••••" : "粘贴密钥"} autoCapitalize="none" secureTextEntry />
            <View style={styles.sliderRow}>
              <Text style={styles.label}>温度 {Number(cfg.temperature).toFixed(1)}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Stepper onPress={() => set({ temperature: Math.max(0, Number(cfg.temperature) - 0.1) })} icon="remove" />
                <Stepper onPress={() => set({ temperature: Math.min(2, Number(cfg.temperature) + 0.1) })} icon="add" />
              </View>
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.label}>最大 Tokens {cfg.maxTokens}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Stepper onPress={() => set({ maxTokens: Math.max(256, Number(cfg.maxTokens) - 512) })} icon="remove" />
                <Stepper onPress={() => set({ maxTokens: Math.min(32000, Number(cfg.maxTokens) + 512) })} icon="add" />
              </View>
            </View>
          </>
        )}
      </Card>

      <View style={{ marginTop: spacing.xl }}>
        <SectionTitle>技能</SectionTitle>
        <Card>
          {skills.map((s) => (
            <View key={s.id} style={styles.skillRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.skillName}>{s.name}{s.implemented ? "" : "（开发中）"}</Text>
                <Text style={styles.skillDesc}>{s.desc}</Text>
              </View>
              <Switch value={cfg.enabledSkills?.includes(s.id)} onValueChange={() => toggleSkill(s.id)} disabled={!s.implemented} />
            </View>
          ))}
        </Card>
      </View>

      <Button title={saving ? "保存中…" : "保存配置"} icon="checkmark" onPress={save} disabled={saving} style={{ marginTop: spacing.xl }} />
    </ScrollView>
  );
}

function Stepper({ onPress, icon }) {
  return (
    <Pressable onPress={onPress} style={styles.stepper}><Ionicons name={icon} size={16} color={colors.text} /></Pressable>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.md, marginBottom: 6 },
  sliderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  stepper: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  skillRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  skillName: { fontSize: 14, fontWeight: "700", color: colors.text },
  skillDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
