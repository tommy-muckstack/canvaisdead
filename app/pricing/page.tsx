import { redirect } from "next/navigation";

// Keep old links useful without presenting plans or checkout.
export default function Pricing() {
  redirect("/");
}
