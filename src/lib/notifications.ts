import toast from "react-hot-toast";

type NotificationOptions = {
  id?: string;
  duration?: number;
};

export const notify = {
  success(message: string, options: NotificationOptions = {}) {
    return toast.success(message, {
      id: options.id,
      duration: options.duration ?? 4000,
    });
  },
  error(message: string, options: NotificationOptions = {}) {
    return toast.error(message, {
      id: options.id,
      duration: options.duration ?? 4000,
    });
  },
  warning(message: string, options: NotificationOptions = {}) {
    return toast(message, {
      id: options.id,
      duration: options.duration ?? 4000,
      icon: "\u26A0\uFE0F",
    });
  },
  info(message: string, options: NotificationOptions = {}) {
    return toast(message, {
      id: options.id,
      duration: options.duration ?? 4000,
      icon: "\u2139\uFE0F",
    });
  },
};