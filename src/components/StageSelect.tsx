"use client";
import { useTransition } from "react";
import { STAGES } from "@/lib/crm";
import { setStage } from "@/app/actions";

export default function StageSelect({ id, stage }: { id: number; stage: string }) {
  const [pending, start] = useTransition();
  return (
    <select id="stage-select" aria-label="เปลี่ยนสถานะ" defaultValue={stage} disabled={pending}
      onChange={(e) => { const v = e.target.value; start(() => setStage(id, v)); }}
      style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", background: "var(--bg)" }}>
      {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
    </select>
  );
}
