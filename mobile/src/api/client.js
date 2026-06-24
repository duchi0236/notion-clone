// 轻量 fetch 封装：基于当前 ServerContext 的 baseUrl + 可选 Bearer Token。
// 通过 createApi(server) 生成绑定实例，供各 screen 调用。
export function createApi(server) {
  const { baseUrl, token } = server;

  async function request(path, options = {}) {
    const url = `${baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    let res;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (e) {
      throw new ApiError(`无法连接服务器（${baseUrl}）。请在「设置」中检查地址。`, 0);
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { raw: text };
    }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `请求失败 (${res.status})`;
      throw new ApiError(msg, res.status, data);
    }
    return data;
  }

  // 上传 multipart/form-data（不设 Content-Type，交给 fetch 自动加 boundary）。
  async function upload(path, formData) {
    const url = `${baseUrl}${path}`;
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    let res;
    try {
      res = await fetch(url, { method: "POST", headers, body: formData });
    } catch (e) {
      throw new ApiError(`无法连接服务器（${baseUrl}）。请在「设置」中检查地址。`, 0);
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `上传失败 (${res.status})`;
      throw new ApiError(msg, res.status, data);
    }
    return data;
  }

  return {
    get: (path) => request(path, { method: "GET" }),
    post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
    put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
    patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
    del: (path) => request(path, { method: "DELETE" }),
    upload,
    baseUrl,
  };
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}
