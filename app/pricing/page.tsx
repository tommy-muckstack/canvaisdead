import { redirect } from "next/navigation";

// Old pricing links lead home. Every feature is included without a trial or upgrade.
export default function Pricing() {
  redirect("/");
}
