export type DialogRequest =
  | {
      kind: "confirm";
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      danger: boolean;
    }
  | {
      kind: "prompt";
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      inputMode?: "text" | "numeric";
      autoComplete?: string;
      maxLength?: number;
    };

type DialogResult = boolean | string | null;
type DialogHandler = (request: DialogRequest) => Promise<DialogResult>;

let dialogHandler: DialogHandler | null = null;

export function registerDialogHandler(handler: DialogHandler) {
  dialogHandler = handler;
  return () => {
    if (dialogHandler === handler) dialogHandler = null;
  };
}

export function appConfirm(
  message: string,
  options: Partial<Pick<Extract<DialogRequest, { kind: "confirm" }>, "title" | "confirmLabel" | "cancelLabel" | "danger">> = {},
): Promise<boolean> {
  if (!dialogHandler) return Promise.resolve(false);
  return dialogHandler({
    kind: "confirm",
    message,
    title: options.title ?? "Please confirm",
    confirmLabel: options.confirmLabel ?? "Continue",
    cancelLabel: options.cancelLabel ?? "Cancel",
    danger: options.danger ?? true,
  }).then((result) => result === true);
}

export function appPrompt(
  message: string,
  options: Partial<Pick<Extract<DialogRequest, { kind: "prompt" }>, "title" | "confirmLabel" | "cancelLabel" | "inputMode" | "autoComplete" | "maxLength">> = {},
): Promise<string | null> {
  if (!dialogHandler) return Promise.resolve(null);
  return dialogHandler({
    kind: "prompt",
    message,
    title: options.title ?? "Enter a value",
    confirmLabel: options.confirmLabel ?? "Continue",
    cancelLabel: options.cancelLabel ?? "Cancel",
    inputMode: options.inputMode,
    autoComplete: options.autoComplete,
    maxLength: options.maxLength,
  }).then((result) => (typeof result === "string" ? result : null));
}
