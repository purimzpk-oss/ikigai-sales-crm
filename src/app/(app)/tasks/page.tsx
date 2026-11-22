import Link from "next/link";
import { requireSession } from "@/lib/session";
import { todayISO, type Task } from "@/lib/crm";
import TaskCheck from "@/components/TaskCheck";
import { Due, Rep } from "@/components/ui";

type Row = Task & { customers: { name: string; contact_name: string | null; phone: string | null } | null };

export default async function TasksPage() {
  const { supabase, team } = await requireSession();
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ data: open }, { data: done }] = await Promise.all([
    supabase.from("tasks").select("*, customers(name, contact_name, phone)").eq("done", false).order("due_date").returns<Row[]>(),
    supabase.from("tasks").select("*, customers(name, contact_name, phone)").eq("done", true).gte("created_at", since).order("due_date", { ascending: false }).limit(20).returns<Row[]>(),
  ]);
  const today = todayISO();
  const groups = [
    { label: "เลยกำหนดและวันนี้", items: (open ?? []).filter((t) => t.due_date <= today) },
    { label: "กำลังจะถึง", items: (open ?? []).filter((t) => t.due_date > today) },
    { label: "เสร็จแล้วล่าสุด", items: done ?? [] },
  ];
  return (
    <>
      <header className="top"><div><h1>งานติดตามลูกค้า</h1><div className="sub">เพิ่มงานได้จากหน้ารายละเอียดลูกค้า</div></div></header>
      <div className="stack">
        {groups.map((g) => (
          <div className="panel" key={g.label}>
            <h2>{g.label} <span className="sub">({g.items.length})</span></h2>
            {g.items.length === 0 && <p className="sub" style={{ margin: 0 }}>ไม่มีรายการ</p>}
            {g.items.map((t) => (
              <div className={`task ${t.done ? "done" : ""}`} key={t.id}>
                <TaskCheck id={t.id} done={t.done} />
                <div style={{ minWidth: 0 }}>
                  <div className="tt">{t.title}</div>
                  <div className="tm"><Link href={`/customers/${t.customer_id}`}>{t.customers?.name}</Link> · {t.customers?.contact_name} · {t.customers?.phone} · <Rep id={t.assignee_id} team={team} /></div>
                </div>
                <div className="when">{t.done ? "เสร็จแล้ว" : <Due date={t.due_date} />}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
