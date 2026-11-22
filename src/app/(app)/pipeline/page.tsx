import Link from "next/link";
import Board from "@/components/Board";
import { requireSession } from "@/lib/session";
import type { Customer, Task } from "@/lib/crm";

export default async function PipelinePage() {
  const { supabase, team } = await requireSession();
  const [{ data: customers }, { data: tasks }] = await Promise.all([
    supabase.from("customers").select("*").neq("stage", "lost").order("deal_value", { ascending: false }).returns<Customer[]>(),
    supabase.from("tasks").select("customer_id, due_date").eq("done", false).order("due_date").returns<Pick<Task, "customer_id" | "due_date">[]>(),
  ]);
  const next = new Map<number, string>();
  (tasks ?? []).forEach((t) => { if (!next.has(t.customer_id)) next.set(t.customer_id, t.due_date); });
  const rows = (customers ?? []).map((c) => ({ ...c, next_due: next.get(c.id) ?? null }));
  return (
    <>
      <header className="top">
        <div><h1>ไปป์ไลน์การขาย</h1><div className="sub">ลากการ์ดหรือเลือกสถานะเพื่อย้ายขั้น ดีลที่ไม่สำเร็จดูได้ในหน้าลูกค้า</div></div>
        <div className="sp" />
        <Link className="btn pri" href="/customers/new">+ เพิ่มดีล</Link>
      </header>
      <Board customers={rows} team={team} />
    </>
  );
}
