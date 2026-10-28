import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie-Hinweis | CloseFlow",
  description: "Informationen zur Nutzung von Cookies und ähnlichen Technologien in CloseFlow.",
};

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
