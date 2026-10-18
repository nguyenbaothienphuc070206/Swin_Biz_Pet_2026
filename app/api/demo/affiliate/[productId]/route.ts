import { NextRequest, NextResponse } from "next/server";
import { demoProducts } from "@/modules/demo/fixtures";

export async function GET(request: NextRequest, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  const product = demoProducts.find((item) => item.id === productId);
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Demo destinations intentionally remain local; no third-party affiliate receives traffic.
  const destination = new URL(`/${request.nextUrl.pathname.split("/")[1]}/demo`, request.nextUrl.origin);
  destination.searchParams.set("affiliate", productId);
  return NextResponse.redirect(destination, { status: 303 });
}
