"use client";
import Link from "next/link";
import { useOptimistic, useTransition, useState } from "react";
import { STAGES, baht, type Customer, type Profile, type Stage } from "@/lib/crm";
import { setStage } from "@/app/actions";
import { Rep, Due } from "@/components/ui";

type Row = Customer & { next_due: string | null };

export default function Board({ customers, team }: { customers: Row[]; team: Profile[] }) {
  const [, start] = useTransition();
  const [items, move] = useOptimistic(customers, (state, { id, stage }: { id: number; stage: Stage }) =>
    state.map((c) => (c.id === id ? { ...c, stage } : c))
  );
  const [over, setOver] = useState<string | null>(null);
  const change = (id: number, stage: Stage) =>
    start(async () => {
      move({ id, stage });
      await setStage(id, stage);
    });

  return (
    <div className="board">
      {STAGES.filter((s) => s.key !== "lost").map((s) => {
        const list = items.filter((c) => c.stage === s.key);
        return (
          <div key={s.key} className={`col ${over === s.key ? "over" : ""}`} style={{ ["--c" as string]: s.color }}
            onDragOver={(e) => { e.preventDefault(); setOver(s.key); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); const id = Number(e.dataTransfer.getData("text/plain")); if (id) change(id, s.key); }}>
            <h3>{s.label} <span className="sub" style={{ fontWeight: 400 }}>{list.length}</span></h3>
            <div className="sum">{baht(list.reduce((a, c) => a + Number(c.deal_value), 0))}</div>
            {list.map((c) => (
              <div key={c.id} className="card" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(c.id))}>
                <Link href={`/customers/${c.id}`} className="t" style={{ textDecoration: "none" }}>{c.name}</Link>
                <div className="m"><span style={{ color: "var(--fg)" }}>{baht(c.deal_value)}</span><Rep id={c.owner_id} team={team} /></div>
                {c.next_due && <div className="due">ติดตาม: <Due date={c.next_due} /></div>}
                <select aria-label="เปลี่ยนสถานะ" value={c.stage} onChange={(e) => change(c.id, e.target.value as Stage)}>
                  {STAGES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
