"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">页面出现错误</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">你的内容不会因为页面错误自动删除。可以刷新重试，或者返回文档列表继续操作。</p>
        {error?.digest && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-400">错误编号：{error.digest}</p>}
        <button onClick={reset} className="mt-6 inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <RefreshCcw className="mr-2 h-4 w-4" />重试
        </button>
      </section>
    </main>
  );
}
