import {notFound,redirect} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {requireRole} from "@/lib/auth/server";
import {SandboxCheckout} from "@/components/billing/subscription-manager";

export default async function SandboxBillingPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{reference?:string;amount?:string}>}){
  const [{locale},{reference,amount}]=await Promise.all([params,searchParams]);if(locale!=="vi"&&locale!=="en")notFound();await requireRole(["owner"],locale);const t=await getTranslations("billing");const amountVnd=Number(amount);if(!reference||reference.length>160||!Number.isSafeInteger(amountVnd)||amountVnd<=0)redirect(`/${locale}/owner/billing`);
  return <main className="mx-auto grid max-w-3xl gap-6 px-4 py-10"><header><h1 className="font-display text-3xl font-bold">{t("sandboxTitle")}</h1><p className="mt-2 text-muted-foreground">{t("sandboxIntro")}</p></header><SandboxCheckout reference={reference} amountVnd={amountVnd}/></main>;
}
