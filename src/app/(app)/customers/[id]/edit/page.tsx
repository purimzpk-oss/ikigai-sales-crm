import { notFound } from "next/navigation";
import CustomerForm from "@/components/CustomerForm";
import { requireSession } from "@/lib/session";
import { updateCustomer } from "@/app/actions";
import type { Customer } from "@/lib/crm";

export default async function EditCustomer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, team, profile } = await requireSession();
  const { data: c } = await supabase.from("customers").select("*").eq("id", Number(id)).maybeSingle<Customer>();
  if (!c) notFound();
  return (
    <>
      <header className="top"><h1>แก้ไข {c.name}</h1></header>
      <CustomerForm action={updateCustomer.bind(null, c.id)} customer={c} team={team} meId={profile.id} isLead={profile.role === "lead"} />
    </>
  );
}
