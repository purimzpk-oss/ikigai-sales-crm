export type Stage = "lead" | "contact" | "quote" | "nego" | "won" | "lost";

export const STAGES: { key: Stage; label: string; color: string; prob: number }[] = [
  { key: "lead", label: "ลีดใหม่", color: "var(--info)", prob: 0.1 },
  { key: "contact", label: "ติดต่อแล้ว", color: "var(--violet)", prob: 0.25 },
  { key: "quote", label: "เสนอราคา", color: "var(--warm)", prob: 0.5 },
  { key: "nego", label: "ต่อรอง", color: "var(--pink)", prob: 0.75 },
  { key: "won", label: "ปิดการขาย", color: "var(--good)", prob: 1 },
  { key: "lost", label: "ไม่สำเร็จ", color: "var(--bad)", prob: 0 },
];
export const OPEN_STAGES: Stage[] = ["lead", "contact", "quote", "nego"];
export const stageOf = (k: string) => STAGES.find((s) => s.key === k) ?? STAGES[0];

export type Profile = { id: string; full_name: string; role: "lead" | "sales" };
export type Customer = {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  line_id: string | null;
  email: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  stage: Stage;
  deal_value: number;
  source: string | null;
  lost_reason: string | null;
  owner_id: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Task = {
  id: number;
  customer_id: number;
  assignee_id: string | null;
  title: string;
  due_date: string;
  done: boolean;
};
export type Activity = {
  id: number;
  customer_id: number;
  author_id: string | null;
  body: string;
  created_at: string;
};

export const baht = (n: number | string | null | undefined) =>
  "฿" + Math.round(Number(n ?? 0)).toLocaleString("th-TH");

/** Today's date in Thailand as YYYY-MM-DD */
export const todayISO = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

export const thaiDate = (iso: string) =>
  new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Bangkok",
  });

export function dueLabel(due: string): { text: string; tone: "late" | "today" | "" } {
  const diff = Math.round(
    (new Date(due + "T00:00:00Z").getTime() - new Date(todayISO() + "T00:00:00Z").getTime()) / 864e5
  );
  if (diff < 0) return { text: `เลยกำหนด ${-diff} วัน`, tone: "late" };
  if (diff === 0) return { text: "วันนี้", tone: "today" };
  if (diff === 1) return { text: "พรุ่งนี้", tone: "" };
  return { text: thaiDate(due), tone: "" };
}
