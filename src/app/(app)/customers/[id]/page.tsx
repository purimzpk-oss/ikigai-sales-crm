import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { baht, thaiDate, todayISO, type Activity, type Customer, type Task } from "@/lib/crm";
import { addActivity, addTask } from "@/app/actions";
import { StagePill, Rep, Due } from "@/components/ui";
import StageSelect from "@/components/StageSelect";
import TaskCheck from "@/components/TaskCheck";
import DeleteButton from "@/components/DeleteButton";
import CopyText from "@/components/CopyText";
import { LeafletMap } from "@/components/MapClient";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = Number(id);
  const { supabase, team, profile } = await requireSession();
  const [{ data: c }, { data: acts }, { data: tasks }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", cid).maybeSingle<Customer>(),
    supabase.from("activities").select("*").eq("customer_id", cid).order("created_at", { ascending: false }).returns<Activity[]>(),
    supabase.from("tasks").select("*").eq("customer_id", cid).order("done").order("due_date").returns<Task[]>(),
  ]);
  if (!c) notFound();
  const tel = c.phone?.replace(/[^\d+]/g, "");

  return (
    <>
      <header className="top">
        <div>
          <div className="sub"><Link href="/customers">ลูกค้า</Link> /</div>
          <h1>{c.name}</h1>
          <div style={{ marginTop: 6 }}><StagePill stage={c.stage} /></div>
        </div>
        <div className="sp" />
        <StageSelect id={c.id} stage={c.stage} />
        <Link className="btn" href={`/customers/${c.id}/edit`}>แก้ไข</Link>
      </header>

      <div className="detail">
        <div className="stack">
          <div className="panel">
            <dl className="kv">
              <dt>มูลค่าดีล</dt><dd><b>{baht(c.deal_value)}</b></dd>
              <dt>ผู้ติดต่อ</dt><dd>{c.contact_name || "-"}</dd>
              <dt>เบอร์โทร</dt><dd>{c.phone ? <><a href={`tel:${tel}`}>{c.phone}</a> <CopyText text={c.phone} /></> : "-"}</dd>
              <dt>LINE</dt><dd>{c.line_id || "-"}</dd>
              <dt>อีเมล</dt><dd>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : "-"}</dd>
              <dt>ที่อยู่</dt><dd>{c.address || "-"}</dd>
              <dt>ที่มา</dt><dd>{c.source || "-"}</dd>
              <dt>ผู้ดูแล</dt><dd><Rep id={c.owner_id} team={team} /></dd>
              {c.closed_at && <><dt>ปิดการขายเมื่อ</dt><dd>{thaiDate(c.closed_at)}</dd></>}
              {c.stage === "lost" && <><dt>เหตุผลที่ไม่สำเร็จ</dt><dd>{c.lost_reason || "-"}</dd></>}
            </dl>
          </div>
          {c.lat != null && c.lng != null && (
            <div className="panel">
              <div className="mini-map">
                <LeafletMap height="240px" pins={[{ id: c.id, name: c.name, lat: c.lat, lng: c.lng, stage: c.stage, value: Number(c.deal_value), phone: c.phone }]} />
              </div>
              <a className="btn" style={{ marginTop: 10 }} target="_blank" rel="noopener"
                href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}>นำทางด้วย Google Maps</a>
            </div>
          )}
          {profile.role === "lead" && <div><DeleteButton id={c.id} /></div>}
        </div>

        <div className="stack">
          <div className="panel">
            <h2>งานติดตาม</h2>
            {(tasks ?? []).map((t) => (
              <div className={`task ${t.done ? "done" : ""}`} key={t.id}>
                <TaskCheck id={t.id} done={t.done} />
                <div className="tt">{t.title}</div>
                <div className="when">{t.done ? "เสร็จแล้ว" : <Due date={t.due_date} />}</div>
              </div>
            ))}
            <form className="row2" action={addTask.bind(null, c.id)} style={{ marginTop: 10, gridTemplateColumns: "1fr auto auto", gap: 8, display: "grid" }}>
              <input name="title" id="new-task" required placeholder="เช่น โทรติดตามใบเสนอราคา" className="btn" style={{ fontWeight: 400, cursor: "text" }} />
              <input name="due_date" id="new-task-due" type="date" required defaultValue={todayISO()} className="btn" style={{ fontWeight: 400 }} />
              <button className="btn pri">เพิ่ม</button>
            </form>
          </div>
          <div className="panel">
            <h2>บันทึกการติดต่อ</h2>
            <form className="form" action={addActivity.bind(null, c.id)} style={{ marginBottom: 16 }}>
              <textarea name="body" id="note" rows={2} required placeholder="เช่น โทรคุยแล้ว ลูกค้าขอส่วนลด 5% จะตอบภายในศุกร์นี้"
                style={{ border: "1px solid var(--line)", background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }} />
              <div><button className="btn">บันทึก</button></div>
            </form>
            <div className="timeline">
              {(acts ?? []).map((a) => (
                <div className="ev" key={a.id}>{a.body}
                  <small>{new Date(a.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" })} · {team.find((p) => p.id === a.author_id)?.full_name ?? ""}</small>
                </div>
              ))}
              <div className="ev">สร้างข้อมูลลูกค้า<small>{thaiDate(c.created_at)}</small></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
