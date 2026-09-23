"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  registerDialogHandler,
  type DialogRequest,
} from "@/lib/dialogs";

type PendingDialog = {
  request: DialogRequest;
  resolve: (result: boolean | string | null) => void;
};

export default function AppDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [active, setActive] = useState<PendingDialog | null>(null);
  const [value, setValue] = useState("");
  const activeRef = useRef<PendingDialog | null>(null);
  const queue = useRef<PendingDialog[]>([]);

  const handleRequest = useCallback(
    (request: DialogRequest) =>
      new Promise<boolean | string | null>((resolve) => {
        const pending = { request, resolve };
        if (activeRef.current) {
          queue.current.push(pending);
        } else {
          activeRef.current = pending;
          setActive(pending);
        }
      }),
    [],
  );

  const settle = useCallback((result: boolean | string | null) => {
    const current = activeRef.current;
    if (!current) return;
    current.resolve(result);
    const next = queue.current.shift() ?? null;
    activeRef.current = next;
    setActive(next);
  }, []);

  useEffect(() => registerDialogHandler(handleRequest), [handleRequest]);
  useEffect(() => {
    setValue("");
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") settle(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, settle]);

  const confirm = () =>
    settle(active?.request.kind === "prompt" ? value : true);

  return (
    <>
      {children}
      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) settle(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-1 p-6 shadow-2xl"
          >
            <h2 id="app-dialog-title" className="text-lg font-semibold text-foreground">
              {active.request.title}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/70">
              {active.request.message}
            </p>
            {active.request.kind === "prompt" && (
              <input
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") confirm();
                }}
                inputMode={active.request.inputMode}
                autoComplete={active.request.autoComplete}
                maxLength={active.request.maxLength}
                className="mt-4 h-11 w-full rounded-xl border border-border-subtle bg-surface-2 px-3 text-foreground outline-none focus:border-cyan-400/60"
              />
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => settle(null)}
                className="rounded-xl border border-border-subtle px-4 py-2 text-sm font-semibold text-foreground/75 hover:bg-foreground/5"
              >
                {active.request.cancelLabel}
              </button>
              <button
                type="button"
                onClick={confirm}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${active.request.kind === "confirm" && active.request.danger ? "bg-rose-600 hover:bg-rose-500" : "bg-cyan-600 hover:bg-cyan-500"}`}
              >
                {active.request.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
