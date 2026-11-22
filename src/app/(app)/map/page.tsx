import MapView from "@/components/MapView";
import { requireSession } from "@/lib/session";
import type { Customer } from "@/lib/crm";

export default async function MapPage() {
  const { supabase } = await requireSession();
  const { data } = await supabase.from("customers").select("id, name, lat, lng, stage, deal_value, phone").returns<Customer[]>();
  const all = data ?? [];
  const pins = all.filter((c) => c.lat != null && c.lng != null)
    .map((c) => ({ id: c.id, name: c.name, lat: c.lat!, lng: c.lng!, stage: c.stage, value: Number(c.deal_value), phone: c.phone }));
  return (
    <>
      <header className="top"><div><h1>แผนที่ลูกค้า</h1><div className="sub">สีบอกสถานะ ขนาดวงบอกมูลค่าดีล กดหมุดเพื่อดูข้อมูลหรือนำทาง</div></div></header>
      <MapView pins={pins} missing={all.length - pins.length} />
    </>
  );
}
