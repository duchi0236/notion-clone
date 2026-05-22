import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_BASE_URL, getToken, setToken } from "@/lib/api";

export default function MeScreen() {
  const [token, setLocalToken] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const value = await getToken();
      setLocalToken(value ?? "");
    })();
  }, []);

  async function save() {
    await setToken(token);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>我的</Text>
        <Text style={{ marginTop: 4, color: "#64748b" }}>移动端连接和偏好设置</Text>

        <View style={{ marginTop: 22, borderRadius: 24, backgroundColor: "white", padding: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ height: 52, width: 52, borderRadius: 18, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>C</Text>
            </View>
            <View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>ClawNote Mobile</Text>
              <Text style={{ marginTop: 4, color: "#64748b" }}>{API_BASE_URL}</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16, borderRadius: 24, backgroundColor: "white", padding: 18 }}>
          <Text style={{ fontWeight: "700", color: "#0f172a" }}>访问 Token</Text>
          <Text style={{ marginTop: 6, color: "#64748b", lineHeight: 22 }}>用于连接你的 ClawNote Web 服务。生产环境建议使用短期访问密钥。</Text>
          <TextInput value={token} onChangeText={setLocalToken} placeholder="粘贴访问 Token" secureTextEntry style={{ marginTop: 14, borderRadius: 16, backgroundColor: "#f8fafc", padding: 14, color: "#0f172a" }} />
          <TouchableOpacity onPress={() => void save()} style={{ marginTop: 14, borderRadius: 16, backgroundColor: "#2563eb", padding: 14, alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "700" }}>{saved ? "已保存" : "保存设置"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 16, borderRadius: 24, backgroundColor: "white", padding: 18 }}>
          <SettingRow icon="cloud-done-outline" title="云端同步" subtitle="通过 Web API 同步文档、数据库和 Inbox" />
          <SettingRow icon="phone-portrait-outline" title="移动阅读" subtitle="文档详情页已支持移动阅读和基础编辑" />
          <SettingRow icon="file-tray-full-outline" title="离线缓存" subtitle="SQLite 依赖已准备，下一阶段接入本地缓存" />
        </View>
      </View>
    </SafeAreaView>
  );
}

function SettingRow({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 12 }}>
      <Ionicons name={icon} size={20} color="#2563eb" />
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#0f172a", fontWeight: "700" }}>{title}</Text>
        <Text style={{ marginTop: 4, color: "#64748b", lineHeight: 20 }}>{subtitle}</Text>
      </View>
    </View>
  );
}
