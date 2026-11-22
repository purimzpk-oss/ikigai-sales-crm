"use client";
import { useTransition } from "react";
import { setRole } from "@/app/actions";

export default function RoleSelect({ id, role, disabled }: { id: string; role: "lead" | "sales"; disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <select id={`role-${id}`} aria-label="บทบาท" defaultValue={role} disabled={disabled || pending}
      onChange={(e) => { const v = e.target.value as "lead" | "sales"; start(() => setRole(id, v)); }}
      style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "4px 8px", background: "var(--bg)" }}>
      <option value="sales">เซลล์</option>
      <option value="lead">หัวหน้าทีม</option>
    </select>
  );
}
