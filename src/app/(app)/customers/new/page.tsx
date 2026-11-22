import CustomerForm from "@/components/CustomerForm";
import { requireSession } from "@/lib/session";
import { createCustomer } from "@/app/actions";

export default async function NewCustomer() {
  const { team, profile } = await requireSession();
  return (
    <>
      <header className="top"><h1>เพิ่มลูกค้าใหม่</h1></header>
      <CustomerForm action={createCustomer} team={team} meId={profile.id} isLead={profile.role === "lead"} />
    </>
  );
}
