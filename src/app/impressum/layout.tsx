import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum | CloseFlow",
  description: "Impressum gemäß deutschem Recht für CloseFlow.",
};

export default function ImprintLayout({ children }: { children: React.ReactNode }) {
  return children;
}
