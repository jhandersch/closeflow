import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AGB | CloseFlow",
  description: "Allgemeine Geschäftsbedingungen für CloseFlow.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
