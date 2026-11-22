# Ikigai Sales CRM

เว็บสำหรับทีมเซลล์: บันทึกลูกค้า ไปป์ไลน์การขาย ยอดขายเทียบเป้า แผนที่ลูกค้า และงานติดตาม

- **Next.js 15** (App Router) โฮสต์บน **Vercel**
- **Supabase** เก็บข้อมูลและจัดการล็อกอิน
- แผนที่ใช้ **OpenStreetMap** (ไม่ต้องมี API key) และลิงก์นำทางไป Google Maps

## สิทธิ์ผู้ใช้
| บทบาท | เห็นอะไร |
|---|---|
| หัวหน้าทีม (`lead`) | ลูกค้าทุกคน ตั้งเป้ายอดขาย กำหนดบทบาท นำเข้าข้อมูล ลบลูกค้า |
| เซลล์ (`sales`) | เฉพาะลูกค้าที่ตัวเองดูแล |

สิทธิ์บังคับที่ฐานข้อมูล (Row Level Security) ใน `supabase/schema.sql` ไม่ใช่แค่ซ่อนในหน้าเว็บ

## ขั้นตอนขึ้นระบบ

### 1. Supabase
1. สมัครที่ https://supabase.com แล้วสร้างโปรเจกต์ใหม่ (Region: Southeast Asia (Singapore))
2. ไปที่ **SQL Editor** วางเนื้อหาไฟล์ `supabase/schema.sql` แล้วกด Run
3. **Authentication → Sign In / Providers**: ปิด "Allow new users to sign up" เพื่อไม่ให้คนนอกสมัครเองได้
4. **Authentication → Users → Add user → Create new user**: เพิ่มอีเมลและรหัสผ่านให้ทั้ง 3 คน (ติ๊ก Auto Confirm)
5. ตั้งหัวหน้าทีม: ใน SQL Editor รัน
   ```sql
   update profiles set role = 'lead', full_name = 'ชื่อหัวหน้า' where id = (select id from auth.users where email = 'อีเมลหัวหน้า');
   update profiles set full_name = 'ชื่อเซลล์' where id = (select id from auth.users where email = 'อีเมลเซลล์');
   ```
6. **Project Settings → API**: จด `Project URL` และ `anon public` key

### 2. Vercel
1. สมัครที่ https://vercel.com ด้วยบัญชี GitHub
2. Add New → Project → เลือก repo นี้
3. Environment Variables ใส่ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. กด Deploy จะได้ลิงก์เว็บ เช่น `ikigai-sales-crm.vercel.app`

### 3. นำเข้าลูกค้าจาก Google Sheet
หัวหน้าทีมล็อกอิน → ตั้งค่า → นำเข้าลูกค้าจาก Google Sheet → เลือกไฟล์ CSV (Google Sheet: ไฟล์ → ดาวน์โหลด → CSV) หรือคัดลอกตารางมาวาง ระบบจะเดาคอลัมน์ให้ ตรวจแล้วกดนำเข้า

## รันบนเครื่อง
```bash
cp .env.example .env.local   # ใส่ค่าจาก Supabase
npm install
npm run dev
```
