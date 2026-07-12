"use client"

import { Toaster } from "react-hot-toast"

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className: "!bg-[#111] !text-white !border !border-white/10",
        duration: 4000,
      }}
    />
  )
}
