import { redirect } from "next/navigation";

export default function HealthRedirectPage() {
  redirect("/metrics");
}
