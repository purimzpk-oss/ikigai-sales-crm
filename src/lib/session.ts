import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/crm";

export async function requireSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single<Profile>();
  const { data: team } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("full_name")
    .returns<Profile[]>();
  return {
    supabase,
    user,
    profile: profile ?? { id: user.id, full_name: user.email ?? "", role: "sales" as const },
    team: team ?? [],
  };
}
