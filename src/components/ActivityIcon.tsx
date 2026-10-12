import {
    ArrowRightLeft,
    CalendarCheck,
    CalendarDays,
    CalendarX,
    CircleCheck,
    ListTodo,
    Mail,
    Phone,
    PlusCircle,
    Sparkles,
    StickyNote,
    UserPen,
    Zap,
    type LucideIcon,
} from "lucide-react";

type ActivityIconSource = {
    type?: string | null;
    metadata?: unknown;
};

type ActivityVisual = {
    Icon: LucideIcon;
    tone: string;
};

const TONES = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    neutral: "border-border-subtle bg-foreground/5 text-foreground/70",
};

const VISUALS: Record<string, ActivityVisual> = {
    created: { Icon: PlusCircle, tone: TONES.emerald },
    status_changed: { Icon: ArrowRightLeft, tone: TONES.cyan },
    note_added: { Icon: StickyNote, tone: TONES.amber },
    email_sent: { Icon: Mail, tone: TONES.blue },
    call_completed: { Icon: Phone, tone: TONES.emerald },
    task_created: { Icon: ListTodo, tone: TONES.cyan },
    task_updated: { Icon: ListTodo, tone: TONES.cyan },
    task_deleted: { Icon: ListTodo, tone: TONES.rose },
    task_completed: { Icon: CircleCheck, tone: TONES.emerald },
    task_reopened: { Icon: ListTodo, tone: TONES.amber },
    meeting_created: { Icon: CalendarDays, tone: TONES.blue },
    meeting_updated: { Icon: CalendarDays, tone: TONES.blue },
    meeting_completed: { Icon: CalendarCheck, tone: TONES.emerald },
    meeting_deleted: { Icon: CalendarX, tone: TONES.rose },
    follow_up: { Icon: CalendarDays, tone: TONES.amber },
    customer_updated: { Icon: UserPen, tone: TONES.cyan },
    ai: { Icon: Sparkles, tone: TONES.purple },
};

const FALLBACK: ActivityVisual = { Icon: Zap, tone: TONES.neutral };

function resolveVisual(source: ActivityIconSource): ActivityVisual {
    const metadata = source.metadata as Record<string, unknown> | null | undefined;
    const event = typeof metadata?.event === "string" ? metadata.event.toLowerCase() : "";

    return VISUALS[event] ?? VISUALS[source.type ?? ""] ?? FALLBACK;
}

export default function ActivityIcon({
    activity,
    size = "md",
}: {
    activity: ActivityIconSource;
    size?: "sm" | "md";
}) {
    const { Icon, tone } = resolveVisual(activity);
    const box = size === "sm" ? "h-7 w-7" : "h-10 w-10";
    const glyph = size === "sm" ? 14 : 18;

    return (
        <span
            aria-hidden="true"
            className={`inline-flex shrink-0 items-center justify-center rounded-full border ${box} ${tone}`}
        >
            <Icon size={glyph} strokeWidth={1.75} />
        </span>
    );
}
