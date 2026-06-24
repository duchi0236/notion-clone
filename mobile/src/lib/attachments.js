// 选图并上传到 /api/files，返回 { url, filename }。
// 依赖 expo-image-picker（首次需 `npx expo install expo-image-picker`）。
import * as ImagePicker from "expo-image-picker";

export async function pickAndUploadImage(api) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    const err = new Error("需要相册访问权限才能插入图片。");
    throw err;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const name = asset.fileName || asset.uri.split("/").pop() || `image-${Date.now()}.jpg`;
  const type = asset.mimeType || guessMime(name);

  const form = new FormData();
  // React Native 的 FormData 文件字段：{ uri, name, type }
  form.append("file", { uri: asset.uri, name, type });

  const res = await api.uploadFile(form);
  return { url: res.url, filename: res.filename || name };
}

function guessMime(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const map = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", heic: "image/heic" };
  return map[ext] || "application/octet-stream";
}
