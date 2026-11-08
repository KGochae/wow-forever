"use client";

import { useEffect, useState } from "react";

/** 마운트 직후 true → 바 width 0 → 값 트랜지션용 (WEB_PROJECT stat-bar-fill 효과) */
export function useMounted(dep?: unknown) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, [dep]);
  return on;
}
