import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutz | CloseFlow",
  description: "Datenschutzerklärung für CloseFlow gemäß DSGVO.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
