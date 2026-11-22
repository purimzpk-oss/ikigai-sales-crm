import { stageOf, dueLabel, type Profile } from "@/lib/crm";

export function StagePill({ stage }: { stage: string }) {
  const s = stageOf(stage);
  return <span className="pill" style={{ ["--c" as string]: s.color }}>{s.label}</span>;
}

export function Rep({ id, team }: { id: string | null; team: Profile[] }) {
  const p = team.find((t) => t.id === id);
  if (!p) return <span className="sub">-</span>;
  return (
    <span className="who">
      <span className="av">{p.full_name.slice(0, 1)}</span>
      {p.full_name}
    </span>
  );
}

export function Due({ date }: { date: string }) {
  const d = dueLabel(date);
  return <span className={d.tone}>{d.text}</span>;
}
