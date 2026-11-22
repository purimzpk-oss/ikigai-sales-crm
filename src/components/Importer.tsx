"use client";
import { useState } from "react";
import Papa from "papaparse";
import { STAGES, type Profile } from "@/lib/crm";
import { importCustomers, type ImportRow } from "@/app/actions";

const FIELDS: { key: keyof ImportRow; label: string; guess: RegExp }[] = [
  { key: "name", label: "ชื่อร้าน / บริษัท *", guess: /ชื่อร้าน|บริษัท|ลูกค้า|customer|company|name/i },
  { key: "contact_name", label: "ผู้ติดต่อ", guess: /ผู้ติดต่อ|contact|คุณ/i },
  { key: "phone", label: "เบอร์โทร", guess: /เบอร์|โทร|phone|tel|mobile/i },
  { key: "line_id", label: "LINE ID", guess: /line|ไลน์/i },
  { key: "email", label: "อีเมล", guess: /อีเมล|e-?mail/i },
  { key: "address", label: "ที่อยู่", guess: /ที่อยู่|address|ที่ตั้ง/i },
  { key: "lat", label: "ละติจูด หรือ พิกัด \"lat, lng\"", guess: /lat|ละติจูด|พิกัด|location|โลเคชั่น/i },
  { key: "lng", label: "ลองจิจูด", guess: /lng|lon|ลองจิจูด/i },
  { key: "stage", label: "สถานะ", guess: /สถานะ|status|stage/i },
  { key: "deal_value", label: "มูลค่า / ยอดขาย", guess: /มูลค่า|ยอด|ราคา|value|amount|price/i },
  { key: "source", label: "ที่มา", guess: /ที่มา|source|ช่องทาง/i },
  { key: "owner_id", label: "เซลล์ผู้ดูแล (ชื่อ)", guess: /เซล|ผู้ดูแล|owner|sales|rep/i },
];

function toStage(v: string): string {
  const s = v.trim().toLowerCase();
  const hit = STAGES.find((x) => x.key === s || x.label === v.trim());
  if (hit) return hit.key;
  if (/ปิด|won|สำเร็จแล้ว|ซื้อแล้ว/.test(s)) return "won";
  if (/ไม่|lost|ยกเลิก/.test(s)) return "lost";
  if (/ต่อรอง|nego/.test(s)) return "nego";
  if (/เสนอ|quote|ใบเสนอ/.test(s)) return "quote";
  if (/ติดต่อ|contact|คุย/.test(s)) return "contact";
  return "lead";
}

export default function Importer({ team }: { team: Profile[] }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<Record<string, string>[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load(text: string) {
    const res = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true });
    const hs = res.meta.fields ?? [];
    setHeaders(hs);
    setData(res.data);
    const used = new Set<string>();
    const m: Record<string, string> = {};
    for (const f of FIELDS) {
      const h = hs.find((h) => !used.has(h) && f.guess.test(h));
      if (h) { m[f.key] = h; used.add(h); }
    }
    setMap(m);
    setMsg(`อ่านได้ ${res.data.length} แถว ตรวจการจับคู่คอลัมน์ด้านล่างแล้วกดนำเข้า`);
  }

  function rows(): ImportRow[] {
    const get = (r: Record<string, string>, k: string) => (map[k] ? (r[map[k]] ?? "").trim() : "");
    return data.map((r) => {
      let lat: number | null = null, lng: number | null = null;
      const latRaw = get(r, "lat");
      const pair = latRaw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
      if (pair) { lat = Number(pair[1]); lng = Number(pair[2]); }
      else {
        if (latRaw) lat = Number(latRaw) || null;
        if (get(r, "lng")) lng = Number(get(r, "lng")) || null;
      }
      const ownerName = get(r, "owner_id");
      const owner = ownerName ? team.find((p) => p.full_name.includes(ownerName) || ownerName.includes(p.full_name)) : undefined;
      const value = Number(get(r, "deal_value").replace(/[^\d.]/g, ""));
      return {
        name: get(r, "name"),
        contact_name: get(r, "contact_name") || null,
        phone: get(r, "phone") || null,
        line_id: get(r, "line_id") || null,
        email: get(r, "email") || null,
        address: get(r, "address") || null,
        lat, lng,
        stage: get(r, "stage") ? toStage(get(r, "stage")) : "lead",
        deal_value: Number.isFinite(value) ? value : 0,
        source: get(r, "source") || null,
        owner_id: owner?.id ?? null,
      };
    }).filter((r) => r.name);
  }

  async function run() {
    setBusy(true);
    const res = await importCustomers(rows());
    setBusy(false);
    setMsg(res.error ? `นำเข้าได้ ${res.inserted} แถว แล้วเกิดข้อผิดพลาด: ${res.error}` : `นำเข้าสำเร็จ ${res.inserted} ราย`);
    if (!res.error) { setData([]); setHeaders([]); }
  }

  const preview = headers.length ? rows().slice(0, 5) : [];

  return (
    <div className="form">
      <p className="sub" style={{ margin: 0 }}>
        ใน Google Sheet ไปที่ ไฟล์ → ดาวน์โหลด → CSV แล้วเลือกไฟล์ที่นี่ หรือคัดลอกทั้งตาราง (รวมหัวคอลัมน์) มาวางในช่องด้านล่าง
      </p>
      <input type="file" id="csv-file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()); }} />
      <textarea id="csv-paste" rows={3} placeholder="หรือวางข้อมูลจาก Google Sheet ที่นี่"
        onPaste={(e) => { const t = e.clipboardData.getData("text"); if (t) { e.preventDefault(); load(t.includes("\t") ? Papa.unparse(Papa.parse(t, { delimiter: "\t" }).data as string[][]) : t); } }} />
      {msg && <div className="sub">{msg}</div>}
      {headers.length > 0 && (
        <>
          <div className="row2">
            {FIELDS.map((f) => (
              <label key={f.key}>{f.label}
                <select id={`map-${f.key}`} value={map[f.key] ?? ""} onChange={(e) => setMap({ ...map, [f.key]: e.target.value })}>
                  <option value="">ไม่นำเข้า</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>ชื่อ</th><th>ผู้ติดต่อ</th><th>เบอร์</th><th>สถานะ</th><th className="num">มูลค่า</th><th>พิกัด</th><th>ผู้ดูแล</th></tr></thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}><td>{r.name}</td><td>{r.contact_name}</td><td>{r.phone}</td><td>{STAGES.find((s) => s.key === r.stage)?.label}</td>
                    <td className="num">{r.deal_value?.toLocaleString("th-TH")}</td><td>{r.lat ? `${r.lat.toFixed(4)}, ${r.lng?.toFixed(4)}` : "-"}</td>
                    <td>{team.find((p) => p.id === r.owner_id)?.full_name ?? "ฉัน"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div><button type="button" className="btn pri" disabled={busy || !map.name} onClick={run}>{busy ? "กำลังนำเข้า…" : `นำเข้า ${rows().length} ราย`}</button></div>
        </>
      )}
    </div>
  );
}
