// 选择本地 .html 文件并读出文本。依赖 expo-document-picker + expo-file-system。
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { ensureSentinel } from "./htmlDoc";

export async function pickHtmlFile() {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["text/html", "application/xhtml+xml", "*/*"],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  const content = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
  const name = (asset.name || "imported.html").replace(/\.[a-z]+$/i, "");
  return { html: ensureSentinel(content), title: name };
}
