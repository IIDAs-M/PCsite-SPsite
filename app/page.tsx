"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [inputUrl, setInputUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPreviewUrl(null);

    let url = inputUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/convert?url=${encodeURIComponent(url)}`
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "変換に失敗しました");
        return;
      }
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html; charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4">
        <h1 className="text-xl font-bold text-gray-800 text-center">
          PC サイト → スマホ表示 変換ツール
        </h1>
        <p className="text-sm text-gray-500 text-center mt-1">
          URLを入力してスマートフォン向けに変換します
        </p>
      </header>

      {/* URL Input */}
      <div className="px-4 py-4 bg-white border-b">
        <form onSubmit={handleConvert} className="flex gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !inputUrl.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? "変換中…" : "変換"}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 rounded px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Preview */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {previewUrl ? (
          <div className="w-full max-w-sm">
            {/* Phone frame */}
            <div className="relative bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-10" />
              {/* Screen */}
              <div className="bg-white rounded-[2rem] overflow-hidden" style={{ height: "70vh" }}>
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Mobile Preview"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">
              スマートフォン プレビュー
            </p>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">📱</div>
            <p className="text-sm">URLを入力して変換ボタンを押してください</p>
          </div>
        )}
      </div>
    </div>
  );
}
