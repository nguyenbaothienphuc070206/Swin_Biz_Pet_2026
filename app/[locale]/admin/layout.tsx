import type {ReactNode} from "react";
import {requireRole} from "@/lib/auth/server";
import {AdminShell} from "@/components/shell/admin-shell";

export const dynamic="force-dynamic";
export default async function AdminLayout({children,params}:{children:ReactNode;params:Promise<{locale:string}>}) {
  const {locale}=await params;await requireRole(["platform_admin"],locale as "vi"|"en");
  return <AdminShell>{children}</AdminShell>;
}
