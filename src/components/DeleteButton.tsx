"use client";
import { useState } from "react";
import { deleteCustomer } from "@/app/actions";

export default function DeleteButton({ id }: { id: number }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className="btn danger" onClick={() => setAsk(true)}>ลบลูกค้า</button>;
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <span className="sub">ลบทั้งประวัติและงานติดตามด้วย ยืนยันไหม</span>
      <button type="button" className="btn danger" onClick={() => deleteCustomer(id)}>ยืนยันลบ</button>
      <button type="button" className="btn" onClick={() => setAsk(false)}>ยกเลิก</button>
    </span>
  );
}
