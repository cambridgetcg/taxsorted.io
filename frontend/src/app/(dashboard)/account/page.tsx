import type { Metadata } from "next";
import AccountClient from "./account-client";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Your account — TaxSorted",
  description:
    "Your account is just your passkeys — no email, no password, no personal details. Sign in, add or remove passkeys, and keep your recovery codes safe.",
};

export default function AccountPage() {
  return <AccountClient />;
}
