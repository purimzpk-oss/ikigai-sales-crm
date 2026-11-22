import Nav from "@/components/Nav";
import { requireSession } from "@/lib/session";
import { todayISO } from "@/lib/crm";
import { signOut } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireSession();
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("done", false)
    .lte("due_date", todayISO());
  return (
    <div className="app">
      <nav className="rail" aria-label="เมนูหลัก">
        <div className="brand"><i />Ikigai Sales</div>
        <Nav dueCount={count ?? 0} isLead={profile.role === "lead"} />
        <div className="me">
          <span>{profile.full_name} · {profile.role === "lead" ? "หัวหน้าทีม" : "เซลล์"}</span>
          <form action={signOut}><button type="submit">ออกจากระบบ</button></form>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
