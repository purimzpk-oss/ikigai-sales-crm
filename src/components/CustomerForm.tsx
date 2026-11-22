"use client";
import { useState } from "react";
import { STAGES, todayISO, type Customer, type Profile } from "@/lib/crm";
import { LeafletMap } from "@/components/MapClient";

export default function CustomerForm({ action, customer, team, meId, isLead }: {
  action: (f: FormData) => Promise<void>;
  customer?: Customer;
  team: Profile[];
  meId: string;
  isLead: boolean;
}) {
  const [lat, setLat] = useState<number | null>(customer?.lat ?? null);
  const [lng, setLng] = useState<number | null>(customer?.lng ?? null);
  const [stage, setStage] = useState(customer?.stage ?? "lead");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const tomorrow = new Date(new Date(todayISO()).getTime() + 864e5).toISOString().slice(0, 10);

  function useHere() {
    if (!navigator.geolocation) return setGeoMsg("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง");
    setGeoMsg("กำลังหาตำแหน่ง…");
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude); setLng(p.coords.longitude); setGeoMsg("ได้ตำแหน่งแล้ว"); },
      () => setGeoMsg("หาตำแหน่งไม่ได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง หรือแตะบนแผนที่แทน"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <form className="form" action={async (f) => { setPending(true); try { await action(f); } finally { setPending(false); } }}>
      <div className="detail">
        <div className="panel form">
          <label>ชื่อร้าน / บริษัท *<input id="name" name="name" required defaultValue={customer?.name} /></label>
          <div className="row2">
            <label>ผู้ติดต่อ<input id="contact_name" name="contact_name" defaultValue={customer?.contact_name ?? ""} /></label>
            <label>เบอร์โทร<input id="phone" name="phone" type="tel" defaultValue={customer?.phone ?? ""} /></label>
          </div>
          <div className="row2">
            <label>LINE ID<input id="line_id" name="line_id" defaultValue={customer?.line_id ?? ""} /></label>
            <label>อีเมล<input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} /></label>
          </div>
          <label>ที่อยู่<textarea id="address" name="address" rows={2} defaultValue={customer?.address ?? ""} /></label>
          <div className="row2">
            <label>สถานะ
              <select id="stage" name="stage" value={stage} onChange={(e) => setStage(e.target.value as Customer["stage"])}>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <label>มูลค่าดีล (บาท)<input id="deal_value" name="deal_value" inputMode="decimal" defaultValue={customer?.deal_value ?? ""} /></label>
          </div>
          {stage === "lost" && <label>เหตุผลที่ไม่สำเร็จ<input id="lost_reason" name="lost_reason" defaultValue={customer?.lost_reason ?? ""} /></label>}
          <div className="row2">
            <label>ที่มาของลีด
              <input id="source" name="source" list="sources" defaultValue={customer?.source ?? ""} />
              <datalist id="sources">{["Facebook","LINE","แนะนำต่อ","เว็บไซต์","Google","Walk-in","งานแสดงสินค้า","โทรหาเอง"].map((s) => <option key={s} value={s} />)}</datalist>
            </label>
            {isLead ? (
              <label>ผู้ดูแล
                <select id="owner_id" name="owner_id" defaultValue={customer?.owner_id ?? meId}>
                  {team.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </label>
            ) : <div />}
          </div>
          {!customer && (
            <div className="row2">
              <label>นัดติดตามครั้งแรก<input id="task_title" name="task_title" placeholder="เช่น โทรแนะนำสินค้า" /></label>
              <label>วันที่<input id="task_due" name="task_due" type="date" defaultValue={tomorrow} /></label>
            </div>
          )}
        </div>
        <div className="panel form" style={{ alignContent: "start" }}>
          <h2 style={{ margin: 0 }}>ตำแหน่งบนแผนที่</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="btn" onClick={useHere}>ใช้ตำแหน่งปัจจุบัน</button>
            {lat != null && <button type="button" className="btn" onClick={() => { setLat(null); setLng(null); }}>ล้างหมุด</button>}
            <span className="sub">{geoMsg ?? "หรือแตะบนแผนที่เพื่อปักหมุด"}</span>
          </div>
          <div className="mini-map" style={{ height: 300 }}>
            <LeafletMap key={`${lat},${lng}`} height="300px"
              pins={lat != null && lng != null ? [{ id: 0, name: "", lat, lng, stage, value: 0, phone: null }] : []}
              onPick={(a, b) => { setLat(a); setLng(b); }} />
          </div>
          <input type="hidden" name="lat" value={lat ?? ""} />
          <input type="hidden" name="lng" value={lng ?? ""} />
          {lat != null && <span className="sub">{lat.toFixed(5)}, {lng?.toFixed(5)}</span>}
        </div>
      </div>
      <div><button className="btn pri" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึก"}</button></div>
    </form>
  );
}
