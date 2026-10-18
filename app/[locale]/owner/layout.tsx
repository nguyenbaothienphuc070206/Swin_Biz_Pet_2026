import type {ReactNode} from "react";
import {requireRole} from "@/lib/auth/server";
import {OwnerShell} from "@/components/shell/owner-shell";

export const dynamic="force-dynamic";
export default async function OwnerLayout({children,params}:{children:ReactNode;params:Promise<{locale:string}>}) {
  const {locale}=await params;await requireRole(["owner"],locale as "vi"|"en");
  return <OwnerShell>{children}</OwnerShell>;
}
