import Link from "next/link";
export default function NotFound() {
  return <div className="panel"><p>ไม่พบข้อมูลนี้ หรือคุณไม่มีสิทธิ์ดู</p><Link className="btn" href="/customers">กลับไปหน้าลูกค้า</Link></div>;
}
