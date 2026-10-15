import { redirect } from "next/navigation";
import { BP } from "@/lib/basepath";

// Keep old links useful without presenting plans or checkout.
export default function Pricing() {
  redirect(`${BP}/`);
}
