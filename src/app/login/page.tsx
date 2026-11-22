"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="login">
      <div className="panel">
        <div className="brand" style={{ padding: "0 0 16px" }}><i />Ikigai Sales</div>
        <form className="form" onSubmit={onSubmit}>
          <label>อีเมล
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label>รหัสผ่าน
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error && <div className="err">{error}</div>}
          <button className="btn pri" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
          <p className="sub" style={{ margin: 0 }}>ยังไม่มีบัญชี ให้หัวหน้าทีมเพิ่มให้ในระบบ</p>
        </form>
      </div>
    </div>
  );
}
