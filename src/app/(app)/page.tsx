import Link from "next/link";
import { requireSession } from "@/lib/session";
import { STAGES, OPEN_STAGES, stageOf, baht, todayISO, type Customer, type Task } from "@/lib/crm";
import { Rep, Due } from "@/components/ui";

const TH_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

export default async function Dashboard() {
  const { supabase, team, profile } = await requireSession();
  const today = todayISO();
  const [y, m] = today.split("-").map(Number);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (5 - i), 1));
    return d.toISOString().slice(0, 7);
  });

  const [{ data: customers }, { data: tasks }, { data: targets }] = await Promise.all([
    supabase.from("customers").select("*").returns<Customer[]>(),
    supabase.from("tasks").select("*").eq("done", false).lte("due_date", today).order("due_date").limit(10).returns<Task[]>(),
    supabase.from("targets").select("month, amount").gte("month", `${months[0]}-01`),
  ]);
  const cs = customers ?? [];
  const thisMonth = today.slice(0, 7);
  const wonIn = (mo: string) =>
    cs.filter((c) => c.stage === "won" && c.closed_at?.startsWith(mo)).reduce((a, c) => a + Number(c.deal_value), 0);
  const targetOf = (mo: string) => Number(targets?.find((t) => t.month.startsWith(mo))?.amount ?? 0);

  const open = cs.filter((c) => OPEN_STAGES.includes(c.stage));
  const wonV = wonIn(thisMonth);
  const target = targetOf(thisMonth);
  const pipeV = open.reduce((a, c) => a + Number(c.deal_value), 0);
  const forecast = open.reduce((a, c) => a + Number(c.deal_value) * stageOf(c.stage).prob, 0);
  const closed = cs.filter((c) => c.stage === "won" || c.stage === "lost");
  const winRate = closed.length ? Math.round((closed.filter((c) => c.stage === "won").length / closed.length) * 100) : 0;

  // chart
  const series = months.map((mo) => ({ mo, v: wonIn(mo), t: targetOf(mo) }));
  const max = Math.max(1, ...series.map((s) => Math.max(s.v, s.t))) * 1.1;
  const W = 560, H = 200, pad = 44, bw = (W - pad) / series.length;
  const yOf = (v: number) => H - 20 - (v / max) * (H - 40);
  const ticks = [0, max / 3, (2 * max) / 3].map((v) => Math.round(v / 1000) * 1000);

  const funnel = STAGES.filter((s) => s.key !== "lost").map((s) => {
    const list = cs.filter((c) => c.stage === s.key);
    return { s, n: list.length, v: list.reduce((a, c) => a + Number(c.deal_value), 0) };
  });
  const fmax = Math.max(1, ...funnel.map((f) => f.v));
  const byId = new Map(cs.map((c) => [c.id, c]));

  return (
    <>
      <header className="top">
        <div>
          <h1>ภาพรวมยอดขาย</h1>
          <div className="sub">{profile.role === "lead" ? "ทั้งทีม" : "ลูกค้าของฉัน"} · {TH_MONTHS[m - 1]} {y + 543}</div>
        </div>
        <div className="sp" />
        <Link className="btn pri" href="/customers/new">+ เพิ่มลูกค้า</Link>
      </header>

      <div className="kpis">
        <div className="panel kpi"><div className="l">ยอดปิดได้เดือนนี้</div><div className="v">{baht(wonV)}</div>
          <div className="d">{target ? `เป้า ${baht(target)} · ${Math.round((wonV / target) * 100)}%` : "ยังไม่ได้ตั้งเป้า"}</div></div>
        <div className="panel kpi"><div className="l">มูลค่าดีลที่กำลังเปิด</div><div className="v">{baht(pipeV)}</div><div className="d">{open.length} ดีล</div></div>
        <div className="panel kpi"><div className="l">คาดการณ์ (ถ่วงตามโอกาสปิด)</div><div className="v">{baht(forecast)}</div><div className="d">ลีด 10% · ติดต่อ 25% · เสนอราคา 50% · ต่อรอง 75%</div></div>
        <div className="panel kpi"><div className="l">อัตราปิดการขาย</div><div className="v">{winRate}%</div><div className="d">จากดีลที่จบแล้ว {closed.length} ดีล</div></div>
      </div>

      <div className="grid2">
        <div className="panel">
          <h2>ยอดปิดรายเดือน (เส้นประคือเป้า)</h2>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="กราฟยอดขายรายเดือน">
            {ticks.map((v) => (
              <g key={v}>
                <line x1={pad} x2={W} y1={yOf(v)} y2={yOf(v)} stroke="var(--line)" />
                <text x={pad - 6} y={yOf(v) + 4} textAnchor="end">{v >= 1000 ? `${Math.round(v / 1000)}k` : v}</text>
              </g>
            ))}
            {series.map((s, i) => {
              const x = pad + i * bw + bw * 0.2, w = bw * 0.6;
              return (
                <g key={s.mo}>
                  <rect x={x} y={yOf(s.v)} width={w} height={Math.max(0, H - 20 - yOf(s.v))} rx={3}
                    fill={s.mo === thisMonth ? "var(--warm)" : "var(--accent)"}><title>{baht(s.v)}</title></rect>
                  {s.t > 0 && <line x1={x - 4} x2={x + w + 4} y1={yOf(s.t)} y2={yOf(s.t)} stroke="var(--fg)" strokeWidth={2} strokeDasharray="4 3" />}
                  <text x={x + w / 2} y={H - 4} textAnchor="middle">{TH_MONTHS[Number(s.mo.slice(5)) - 1]}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="panel funnel">
          <h2>ดีลในแต่ละขั้น</h2>
          {funnel.map((f) => (
            <div className="row" key={f.s.key}>
              <span>{f.s.label} <span className="sub">({f.n})</span></span>
              <div className="track"><div className="fill" style={{ width: `${(f.v / fmax) * 100}%`, background: f.s.color }} /></div>
              <span className="num">{baht(f.v)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <h2>ต้องติดตามวันนี้และที่เลยกำหนด</h2>
          {(tasks ?? []).length === 0 && <p className="sub">ไม่มีงานค้าง</p>}
          {(tasks ?? []).map((t) => {
            const c = byId.get(t.customer_id);
            return (
              <div className="task" key={t.id}>
                <div><div className="tt">{t.title}</div>
                  <div className="tm"><Link href={`/customers/${t.customer_id}`}>{c?.name}</Link> · {c?.phone}</div></div>
                <div className="when"><Due date={t.due_date} /></div>
              </div>
            );
          })}
        </div>
        <div className="panel">
          <h2>ผลงานรายคน</h2>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>เซลล์</th><th className="num">ดีลเปิด</th><th className="num">มูลค่า</th><th className="num">ปิดได้เดือนนี้</th></tr></thead>
              <tbody>
                {team.filter((p) => profile.role === "lead" || p.id === profile.id).map((p) => {
                  const mine = cs.filter((c) => c.owner_id === p.id);
                  const o = mine.filter((c) => OPEN_STAGES.includes(c.stage));
                  const w = mine.filter((c) => c.stage === "won" && c.closed_at?.startsWith(thisMonth));
                  return (
                    <tr key={p.id}>
                      <td><Rep id={p.id} team={team} /></td>
                      <td className="num">{o.length}</td>
                      <td className="num">{baht(o.reduce((a, c) => a + Number(c.deal_value), 0))}</td>
                      <td className="num">{baht(w.reduce((a, c) => a + Number(c.deal_value), 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
