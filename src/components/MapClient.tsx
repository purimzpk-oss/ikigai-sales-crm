"use client";
import dynamic from "next/dynamic";
export const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => <div className="sub" style={{ padding: 16 }}>กำลังโหลดแผนที่…</div>,
});
