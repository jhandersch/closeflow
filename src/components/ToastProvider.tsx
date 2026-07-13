"use client"

import { Toaster } from "react-hot-toast"

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className: "!bg-surface-1 !text-foreground !border !border-border-subtle",
        duration: 4000,
      }}
    />
  )
}

