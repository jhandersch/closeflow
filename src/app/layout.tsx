import type { Metadata } from "next"
import { Manrope, Space_Grotesk } from "next/font/google"
import { AppPreferencesProvider } from "@/components/AppPreferencesProvider"
import ToastProvider from "@/components/ToastProvider"
import CookieNotice from "@/components/CookieNotice"
import "./globals.css"

const geistSans = Manrope({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Space_Grotesk({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "CloseFlow | AI-powered CRM",
  description: "A polished AI-powered CRM experience for modern revenue teams.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <AppPreferencesProvider>
          <ToastProvider />
          {children}
          <CookieNotice />
        </AppPreferencesProvider>
      </body>
    </html>
  )
}
