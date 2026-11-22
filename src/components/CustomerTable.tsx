"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES, baht, type Customer, type Profile } from "@/lib/crm";
import { StagePill, Rep, Due } from "@/components/ui";

type Row = Customer & { next_due: string | null };

export default function CustomerTable({ rows, team, showOwnerFilter }: { rows: Row[]; team: Profile[]; showOwnerFilter: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [owner, setOwner] = useState("");
  const list = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((c) =>
      (!stage || c.stage === stage) &&
      (!owner || c.owner_id === owner) &&
      (!s || [c.name, c.contact_name, c.phone, c.line_id, c.address].join(" ").toLowerCase().includes(s)));
  }, [rows, q, stage, owner]);
  const total = list.reduce((a, c) => a + Number(c.deal_value), 0);

  return (
    <>
      <div className="filters">
        <input id="q" placeholder="ค้นหาชื่อ ผู้ติดต่อ เบอร์ LINE ที่อยู่" value={q} onChange={(e) => setQ(e.target.value)} />
        <select id="stage" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {showOwnerFilter && (
          <select id="owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">ทุกคน</option>
            {team.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        )}
      </div>
      <div className="sub" style={{ marginBottom: 8 }}>{list.length} ราย · รวม {baht(total)}</div>
      <div className="panel tbl-wrap" style={{ padding: "4px 12px" }}>
        <table>
          <thead><tr><th>ลูกค้า</th><th className="hide-sm">ผู้ติดต่อ</th><th>สถานะ</th><th className="num">มูลค่า</th><th className="hide-sm">ผู้ดูแล</th><th className="hide-sm">ติดตามครั้งถัดไป</th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="click" onClick={() => router.push(`/customers/${c.id}`)}>
                <td><b>{c.name}</b><div className="sub" style={{ fontSize: 12 }}>{c.address}</div></td>
                <td className="hide-sm">{c.contact_name}<div className="sub" style={{ fontSize: 12 }}>{c.phone}</div></td>
                <td><StagePill stage={c.stage} /></td>
                <td className="num">{baht(c.deal_value)}</td>
                <td className="hide-sm"><Rep id={c.owner_id} team={team} /></td>
                <td className="hide-sm">{c.next_due ? <Due date={c.next_due} /> : "-"}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="sub">ไม่พบลูกค้าที่ตรงกับตัวกรอง</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
