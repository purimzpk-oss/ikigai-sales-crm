import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { saveTarget } from "@/app/actions";
import { baht, todayISO } from "@/lib/crm";
import Importer from "@/components/Importer";
import RoleSelect from "@/components/RoleSelect";

export default async function SettingsPage() {
  const { supabase, team, profile } = await requireSession();
  if (profile.role !== "lead") redirect("/");
  const { data: targets } = await supabase.from("targets").select("month, amount").order("month", { ascending: false }).limit(6);
  return (
    <>
      <header className="top"><h1>ตั้งค่า</h1></header>
      <div className="stack">
        <div className="grid2" style={{ marginBottom: 0 }}>
          <div className="panel">
            <h2>เป้ายอดขายรายเดือนของทีม</h2>
            <form className="form" action={saveTarget}>
              <div className="row2">
                <label>เดือน<input id="month" name="month" type="month" required defaultValue={todayISO().slice(0, 7)} /></label>
                <label>เป้า (บาท)<input id="amount" name="amount" inputMode="decimal" required /></label>
              </div>
              <div><button className="btn pri">บันทึกเป้า</button></div>
            </form>
            <table style={{ marginTop: 12 }}>
              <tbody>{(targets ?? []).map((t) => <tr key={t.month}><td>{t.month.slice(0, 7)}</td><td className="num">{baht(t.amount)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="panel">
            <h2>สมาชิกทีม</h2>
            <p className="sub" style={{ marginTop: 0 }}>เพิ่มคนใหม่ได้ที่ Supabase → Authentication → Users → Add user แล้วกลับมากำหนดบทบาทที่นี่</p>
            <table>
              <tbody>{team.map((p) => (
                <tr key={p.id}><td>{p.full_name}</td><td><RoleSelect id={p.id} role={p.role} disabled={p.id === profile.id} /></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <h2>นำเข้าลูกค้าจาก Google Sheet</h2>
          <Importer team={team} />
        </div>
      </div>
    </>
  );
}
