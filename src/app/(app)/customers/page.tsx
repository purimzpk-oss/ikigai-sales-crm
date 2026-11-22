import Link from "next/link";
import CustomerTable from "@/components/CustomerTable";
import { requireSession } from "@/lib/session";
import type { Customer, Task } from "@/lib/crm";

export default async function CustomersPage() {
  const { supabase, team, profile } = await requireSession();
  const [{ data: customers }, { data: tasks }] = await Promise.all([
    supabase.from("customers").select("*").order("updated_at", { ascending: false }).returns<Customer[]>(),
    supabase.from("tasks").select("customer_id, due_date").eq("done", false).order("due_date").returns<Pick<Task, "customer_id" | "due_date">[]>(),
  ]);
  const next = new Map<number, string>();
  (tasks ?? []).forEach((t) => { if (!next.has(t.customer_id)) next.set(t.customer_id, t.due_date); });
  const rows = (customers ?? []).map((c) => ({ ...c, next_due: next.get(c.id) ?? null }));
  return (
    <>
      <header className="top">
        <div><h1>รายชื่อลูกค้า</h1></div>
        <div className="sp" />
        <Link className="btn pri" href="/customers/new">+ เพิ่มลูกค้า</Link>
      </header>
      {rows.length === 0 ? (
        <div className="panel"><p>ยังไม่มีลูกค้าในระบบ เริ่มจากกด &quot;เพิ่มลูกค้า&quot;{profile.role === "lead" && <> หรือ<Link href="/settings" style={{ color: "var(--accent)" }}>นำเข้าจาก Google Sheet</Link></>}</p></div>
      ) : (
        <CustomerTable rows={rows} team={team} showOwnerFilter={profile.role === "lead"} />
      )}
    </>
  );
}
