"use client";
import { useState } from "react";
import { STAGES } from "@/lib/crm";
import { LeafletMap } from "@/components/MapClient";
import type { Pin } from "@/components/LeafletMap";

export default function MapView({ pins, missing }: { pins: Pin[]; missing: number }) {
  const [hidden, setHidden] = useState<string[]>(["lost"]);
  const shown = pins.filter((p) => !hidden.includes(p.stage));
  return (
    <>
      <div className="filters" style={{ alignItems: "center" }}>
        {STAGES.map((s) => {
          const on = !hidden.includes(s.key);
          return (
            <button key={s.key} type="button" className="pill" aria-pressed={on}
              style={{ ["--c" as string]: s.color, border: 0, cursor: "pointer", opacity: on ? 1 : 0.4 }}
              onClick={() => setHidden((h) => (on ? [...h, s.key] : h.filter((x) => x !== s.key)))}>
              {s.label}
            </button>
          );
        })}
        <span className="sub">{missing > 0 && `${missing} รายยังไม่ได้ปักหมุด`}</span>
      </div>
      <div className="map-box"><LeafletMap key={hidden.join()} pins={shown} /></div>
    </>
  );
}
