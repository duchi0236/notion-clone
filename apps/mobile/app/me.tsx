import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_BASE_URL, getToken, setToken } from "@/lib/api";

export default function MeScreen() {
  const [connectionCode, setConnectionCode] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const value = await getToken();
      setConnectionCode(value ?? "");
    })();
  }, []);

  async function save() {
    await setToken(connectionCode);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>我的</Text>
        <Text style={{ marginTop: 4, color: "#64748b" }}>账户、同步和偏好设置</Text>

        <View style={{ marginTop: 22, borderRadius: 24, backgroundColor: "white", padding: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ height: 52, width: 52, borderRadius: 18, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>C</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>ClawNote</Text>
              <Text numberOfLines={1} style={{ marginTop: 4, color: "#64748b" }}>已连接到 {API_BASE_URL.replace(/^https?:\/\//, "")}</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16, borderRadius: 24, backgroundColor: "white", padding: 18 }}>
          <Text style={{ fontWeight: "700", color: "#0f172a" }}>连接设置</Text>
          <Text style={{ marginTop: 6, color: "#64748b", lineHeight: 22 }}>把网页端生成的连接码粘贴到这里，手机就可以同步你的文档、清单和日历。</Text>
          <TextInput value={connectionCode} onChangeText={setConnectionCode} placeholder="粘贴连接码" secureTextEntry style={{ marginTop: 14, borderRadius: 16, backgroundColor: "#f8fafc", padding: 14, color: "#0f172a" }} />
          <TouchableOpacity onPress={() => void save()} style={{ marginTop: 14, borderRadius: 16, backgroundColor: "#2563eb", padding: 14, alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "700" }}>{saved ? "已保存" : "保存连接"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 16, borderRadius: 24, backgroundColor: "white", padding: 18 }}>
          <SettingRow icon="cloud-done-outline" title="云端同步" subtitle="自动同步文档、清单和日历" />
          <SettingRow icon="phone-portrait-outline" title="移动阅读" subtitle="随时阅读和编辑个人文档" />
          <SettingRow icon="file-tray-full-outline" title="附件管理" subtitle="上传图片、PDF 和常用资料" />
          <SettingRow icon="shield-checkmark-outline" title="隐私设置" subtitle="个人文档默认仅自己可见" />
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
