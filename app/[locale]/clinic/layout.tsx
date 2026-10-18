import type {ReactNode} from "react";
import {requireRole} from "@/lib/auth/server";
import {ClinicShell} from "@/components/shell/clinic-shell";

export const dynamic="force-dynamic";
export default async function ClinicLayout({children,params}:{children:ReactNode;params:Promise<{locale:string}>}) {
  const {locale}=await params;await requireRole(["clinic_staff","clinic_admin"],locale as "vi"|"en");
  return <ClinicShell>{children}</ClinicShell>;
}
