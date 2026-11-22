"use client";
import { useState } from "react";

export default function CopyText({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={() => navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); })}
      style={{ border: 0, background: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>
      {ok ? "คัดลอกแล้ว" : "คัดลอก"}
    </button>
  );
}
