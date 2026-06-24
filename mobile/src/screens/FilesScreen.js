import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../api/clawnote";
import { Card, EmptyState, ErrorState, Loading } from "../components/ui";
import { pickAndUploadImage } from "../lib/attachments";
import { colors, radius, shadow, spacing } from "../theme";

const IMG_EXT = /\.(png|jpe?g|gif|webp|heic)$/i;
function fmtSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function FilesScreen() {
  const api = useApi();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try { setError(null); const r = await api.listFiles(); setFiles(r?.files || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const upload = async () => {
    if (uploading) return;
    setUploading(true);
    try { const r = await pickAndUploadImage(api); if (r) load(); }
    catch (e) { if (e.message) Alert.alert("上传失败", e.message); }
    finally { setUploading(false); }
  };

  const remove = (f) => {
    Alert.alert("删除文件？", f.filename, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => {
        setFiles((x) => x.filter((i) => i.filename !== f.filename));
        try { await api.deleteFile(f.filename); } catch (e) { Alert.alert("删除失败", e.message); load(); }
      } },
    ]);
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={files}
        keyExtractor={(f) => f.filename}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 90, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            {IMG_EXT.test(item.filename) ? (
              <Image source={{ uri: `${api.baseUrl}${item.url}` }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.fileIcon]}><Ionicons name="document-outline" size={22} color={colors.textMuted} /></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.filename}</Text>
              <Text style={styles.meta}>{fmtSize(item.size)} · {new Date(item.updatedAt).toLocaleDateString()}</Text>
            </View>
            <Pressable onPress={() => remove(item)} hitSlop={8}><Ionicons name="trash-outline" size={18} color={colors.textFaint} /></Pressable>
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="folder-open-outline" title="还没有文件" subtitle="点右下角上传图片" />}
      />
      <Pressable onPress={upload} disabled={uploading} style={({ pressed }) => [styles.fab, shadow, (pressed || uploading) && { opacity: 0.85 }]}>
        <Ionicons name={uploading ? "hourglass-outline" : "cloud-upload-outline"} size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  thumb: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  fileIcon: { alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14, fontWeight: "600", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  fab: { position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
