"use client";
import { useOptimistic, useTransition } from "react";
import { toggleTask } from "@/app/actions";

export default function TaskCheck({ id, done }: { id: number; done: boolean }) {
  const [, start] = useTransition();
  const [val, set] = useOptimistic(done);
  return (
    <input type="checkbox" id={`task-${id}`} aria-label="ทำเสร็จแล้ว" checked={val}
      onChange={(e) => { const v = e.target.checked; start(async () => { set(v); await toggleTask(id, v); }); }} />
  );
}
