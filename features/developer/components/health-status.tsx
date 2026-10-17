"use client";

import { useCallback, useEffect, useState } from "react";
import { BASE_PATH } from "../lib/site";
type HealthResult = { ok: boolean; message: string };

export function HealthStatus() {
  const [state, setState] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const check = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_PATH}/api/health`, { cache: "no-store", signal });
      const data: HealthResult = await response.json();
      if (!signal?.aborted) setState(data);
    } catch {
      if (!signal?.aborted) setState({ ok: false, message: "Không thể kiểm tra kết nối. Hãy thử lại." });
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void check(controller.signal);
    return () => controller.abort();
  }, [check]);
  return <div className="health" aria-busy={loading}>
    <p role="status"><span aria-hidden="true" className={`status-dot ${state?.ok ? "connected" : ""}`} />
      {loading ? "Đang kiểm tra kết nối API…" : state?.message}</p>
    <button className="text-button" onClick={() => void check()} disabled={loading}>Kiểm tra lại</button>
  </div>;
}
