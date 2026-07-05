import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { API_BASE_URL, getToken } from "@/lib/api";

export default function FilesScreen() {
  async function upload() {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const token = await getToken();
    const form = new FormData();
    form.append("file", {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? "application/octet-stream",
    } as unknown as Blob);

    await fetch(`${API_BASE_URL}/api/files`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7fb" }}>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>附件</Text>
        <Text style={{ marginTop: 4, color: "#64748b" }}>保存图片、PDF 和常用资料</Text>
        <View style={{ marginTop: 22, borderRadius: 28, backgroundColor: "white", padding: 24, alignItems: "center" }}>
          <View style={{ height: 72, width: 72, borderRadius: 24, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="attach-outline" size={34} color="#2563eb" />
          </View>
          <Text style={{ marginTop: 16, fontSize: 18, fontWeight: "700", color: "#0f172a" }}>添加附件</Text>
          <Text style={{ marginTop: 8, textAlign: "center", color: "#64748b", lineHeight: 22 }}>上传后可以在文档里引用，也可以作为资料长期保存。</Text>
          <TouchableOpacity onPress={() => void upload()} style={{ marginTop: 18, borderRadius: 16, backgroundColor: "#2563eb", paddingHorizontal: 22, paddingVertical: 14 }}>
            <Text style={{ color: "white", fontWeight: "700" }}>选择附件</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
