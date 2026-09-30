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
  const panelRef = useRef<HTMLElement>(null);
  const promptRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

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
    if (!active) {
      previousFocus.current?.focus();
      previousFocus.current = null;
      return;
    }
    if (!previousFocus.current) {
      previousFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    const target = promptRef.current ?? panelRef.current?.querySelector<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    target?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        settle(null);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
      )).filter((element) => element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            aria-describedby="app-dialog-description"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-1 p-6 shadow-2xl"
          >
            <h2 id="app-dialog-title" className="text-lg font-semibold text-foreground">
              {active.request.title}
            </h2>
            <p id="app-dialog-description" className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/70">
              {active.request.message}
            </p>
            {active.request.kind === "prompt" && (
              <input
                ref={promptRef}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") confirm();
                }}
                aria-label={active.request.title}
                aria-describedby="app-dialog-description"
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
