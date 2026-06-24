// ClawNote 业务 API 封装。useApi() 返回一组与 ServerContext 绑定的函数。
import { useMemo } from "react";
import { useServer } from "../config/ServerContext";
import { createApi } from "./client";

// 纯文本 → 极简 HTML（保留换行/段落），与后端 contentHtml/contentText 模型对齐。
export function textToHtml(text) {
  const safe = String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = safe.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`);
  return paragraphs.join("") || "<p></p>";
}

// HTML → 纯文本（移动端编辑器读取后端文档时用）。
export function htmlToText(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function useApi() {
  const server = useServer();
  return useMemo(() => {
    const api = createApi(server);
    return {
      baseUrl: api.baseUrl,

      // ---- 文档 ----
      listDocuments: () => api.get("/api/documents"),
      listArchived: () => api.get("/api/documents?archived=true"),
      getDocument: (id) => api.get(`/api/documents/${id}`),
      createDocument: (payload) => api.post("/api/documents", payload),
      updateDocument: (id, payload) => api.put(`/api/documents/${id}`, payload),
      deleteDocument: (id) => api.del(`/api/documents/${id}`),
      deleteDocumentForever: (id) => api.del(`/api/documents/${id}?permanent=true`),
      moveDocument: (id, parentId) => api.post(`/api/pages/${id}/move`, { parentId }),

      // ---- 版本 / 评论 ----
      listVersions: (id) => api.get(`/api/documents/${id}/versions`),
      snapshotVersion: (id) => api.post(`/api/documents/${id}/versions`, { reason: "manual-snapshot" }),
      restoreVersion: (id, version) => api.post(`/api/documents/${id}/versions/${version}/restore`, {}),
      listComments: (id) => api.get(`/api/documents/${id}/comments`),
      addComment: (id, content, parentId) => api.post(`/api/documents/${id}/comments`, { content, parentId }),

      // ---- 模板 ----
      listTemplates: () => api.get("/api/templates"),

      // ---- 任务 ----
      listTasks: () => api.get("/api/collections/tasks"),
      createTask: (payload) => api.post("/api/collections/tasks", payload),
      updateTask: (rowId, payload) => api.put(`/api/collections/tasks/${rowId}`, payload),
      deleteTask: (rowId) => api.del(`/api/collections/tasks/${rowId}`),

      // ---- 日历 ----
      listEvents: (start, end) =>
        api.get(`/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
      createEvent: (payload) => api.post("/api/calendar/events", payload),
      updateEvent: (id, payload) => api.patch(`/api/calendar/events/${id}`, payload),
      deleteEvent: (id) => api.del(`/api/calendar/events/${id}`),

      // ---- 多维表格 Bitable ----
      listBases: () => api.get("/api/bitable/bases"),
      createBase: (name) => api.post("/api/bitable/bases", { name }),
      getTable: (id) => api.get(`/api/collections/${id}`),
      createTable: (baseId, name) => api.post("/api/bitable/tables", { baseId, name }),
      createRow: (tableId, data) => api.post("/api/bitable/rows", { tableId, data }),
      updateRow: (id, data) => api.patch(`/api/bitable/rows/${id}`, { data }),
      deleteRow: (id) => api.del(`/api/bitable/rows/${id}`),

      // ---- 文件 ----
      listFiles: () => api.get("/api/files"),
      uploadFile: (formData) => api.upload("/api/files", formData),
      deleteFile: (filename) => api.del(`/api/files?filename=${encodeURIComponent(filename)}`),

      // ---- AI 配置 / 工作区成员 ----
      getAiConfig: () => api.get("/api/ai/config"),
      updateAiConfig: (payload) => api.put("/api/ai/config", payload),
      listMembers: () => api.get("/api/workspace/members"),

      // ---- 账号 ----
      register: (payload) => api.post("/api/auth/register", payload),

      // ---- 语义搜索 ----
      semanticSearch: (query) => api.post("/api/search/semantic", { query, limit: 15 }),

      // ---- Inbox ----
      listInbox: () => api.get("/api/inbox"),
      createInbox: (payload) => api.post("/api/inbox", payload),
      updateInbox: (id, payload) => api.put(`/api/inbox/${id}`, payload),
      deleteInbox: (id) => api.del(`/api/inbox/${id}`),

      // ---- Memory ----
      listMemory: () => api.get("/api/memory"),
      createMemory: (payload) => api.post("/api/memory", payload),
      reviewMemory: (id, status) => api.put(`/api/memory/${id}`, { status }),

      // ---- 搜索 / AI ----
      search: (q) => api.get(`/api/search?q=${encodeURIComponent(q)}`),
      chat: (message) => api.post("/api/ai/chat", { message }),
      generateHtml: (prompt) => api.post("/api/ai/generate-html", { prompt }),

      // ---- 工作区 ----
      getWorkspace: () => api.get("/api/workspace"),
      health: () => api.get("/api/health"),
    };
  }, [server]);
}
