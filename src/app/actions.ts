"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGES, type Stage } from "@/lib/crm";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v === null) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const isStage = (s: unknown): s is Stage => STAGES.some((x) => x.key === s);

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function customerFields(f: FormData) {
  const stage = str(f, "stage");
  return {
    name: str(f, "name") ?? "",
    contact_name: str(f, "contact_name"),
    phone: str(f, "phone"),
    line_id: str(f, "line_id"),
    email: str(f, "email"),
    address: str(f, "address"),
    lat: num(f, "lat"),
    lng: num(f, "lng"),
    stage: isStage(stage) ? stage : "lead",
    deal_value: num(f, "deal_value") ?? 0,
    source: str(f, "source"),
    lost_reason: str(f, "lost_reason"),
  };
}

export async function createCustomer(f: FormData) {
  const { supabase, user } = await me();
  const fields = customerFields(f);
  if (!fields.name) throw new Error("กรุณากรอกชื่อลูกค้า");
  const owner_id = str(f, "owner_id") ?? user.id;
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...fields, owner_id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const taskTitle = str(f, "task_title");
  const taskDue = str(f, "task_due");
  if (taskTitle && taskDue) {
    await supabase
      .from("tasks")
      .insert({ customer_id: data.id, title: taskTitle, due_date: taskDue, assignee_id: owner_id });
  }
  revalidatePath("/", "layout");
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(id: number, f: FormData) {
  const { supabase } = await me();
  const fields = customerFields(f);
  const owner_id = str(f, "owner_id");
  const { error } = await supabase
    .from("customers")
    .update(owner_id ? { ...fields, owner_id } : fields)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect(`/customers/${id}`);
}

export async function setStage(id: number, stage: string) {
  if (!isStage(stage)) return;
  const { supabase } = await me();
  const { error } = await supabase.from("customers").update({ stage }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteCustomer(id: number) {
  const { supabase } = await me();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/customers");
}

export async function addActivity(customerId: number, f: FormData) {
  const body = str(f, "body");
  if (!body) return;
  const { supabase } = await me();
  const { error } = await supabase.from("activities").insert({ customer_id: customerId, body });
  if (error) throw new Error(error.message);
  revalidatePath(`/customers/${customerId}`);
}

export async function addTask(customerId: number, f: FormData) {
  const title = str(f, "title");
  const due = str(f, "due_date");
  if (!title || !due) return;
  const { supabase } = await me();
  const { error } = await supabase
    .from("tasks")
    .insert({ customer_id: customerId, title, due_date: due });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function toggleTask(id: number, done: boolean) {
  const { supabase } = await me();
  const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function saveTarget(f: FormData) {
  const { supabase } = await me();
  const month = str(f, "month");
  const amount = num(f, "amount");
  if (!month || amount === null) return;
  const { error } = await supabase
    .from("targets")
    .upsert({ month: `${month}-01`, amount });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function setRole(userId: string, role: "lead" | "sales") {
  const { supabase } = await me();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export type ImportRow = {
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  line_id?: string | null;
  email?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  stage?: string | null;
  deal_value?: number | null;
  source?: string | null;
  owner_id?: string | null;
};

export async function importCustomers(rows: ImportRow[]) {
  const { supabase, user } = await me();
  const clean = rows
    .filter((r) => r.name && r.name.trim())
    .map((r) => ({
      name: r.name.trim(),
      contact_name: r.contact_name ?? null,
      phone: r.phone ?? null,
      line_id: r.line_id ?? null,
      email: r.email ?? null,
      address: r.address ?? null,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      stage: isStage(r.stage) ? r.stage : "lead",
      deal_value: r.deal_value ?? 0,
      source: r.source ?? "Google Sheet",
      owner_id: r.owner_id ?? user.id,
    }));
  let inserted = 0;
  for (let i = 0; i < clean.length; i += 200) {
    const { error } = await supabase.from("customers").insert(clean.slice(i, i + 200));
    if (error) return { inserted, error: error.message };
    inserted += Math.min(200, clean.length - i);
  }
  revalidatePath("/", "layout");
  return { inserted, error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
