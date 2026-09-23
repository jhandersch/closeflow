"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={12}
      toastOptions={{
        duration: 4000,
        className:
          "!flex !items-center !gap-3 !rounded-2xl !border !px-4 !py-3 !text-sm !shadow-xl",
        style: {
          background: "var(--surface-1)",
          color: "var(--foreground)",
          borderColor: "var(--border-subtle)",
        },
        success: {
          iconTheme: {
            primary: "#22d3ee",
            secondary: "#082f49",
          },
        },
        error: {
          iconTheme: {
            primary: "#fb7185",
            secondary: "#4c0519",
          },
        },
      }}
    />
  );
}
