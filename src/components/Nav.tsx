"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "ภาพรวม" },
  { href: "/pipeline", label: "ไปป์ไลน์" },
  { href: "/customers", label: "ลูกค้า" },
  { href: "/map", label: "แผนที่" },
  { href: "/tasks", label: "งานติดตาม" },
];

export default function Nav({ dueCount, isLead }: { dueCount: number; isLead: boolean }) {
  const path = usePathname();
  const on = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  const links = isLead ? [...LINKS, { href: "/settings", label: "ตั้งค่า" }] : LINKS;
  return (
    <>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={on(l.href) ? "on" : ""}>
          {l.label}
          {l.href === "/tasks" && dueCount > 0 && <span className="n">{dueCount}</span>}
        </Link>
      ))}
    </>
  );
}
