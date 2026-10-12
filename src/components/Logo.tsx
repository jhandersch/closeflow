export function LogoMark({
    size = 36,
    className = "",
}: {
    size?: number;
    className?: string;
}) {
    return (
        <svg
            viewBox="0 0 64 64"
            width={size}
            height={size}
            aria-hidden="true"
            className={`shrink-0 ${className}`}
        >
            <rect
                x="0.75"
                y="0.75"
                width="62.5"
                height="62.5"
                rx="14"
                fill="#ffffff"
                stroke="#e2e8f0"
                strokeWidth="1.5"
            />
            <g
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M32 23.5A11 11 0 1 0 32 40.5" />
                <path d="M39 42V22h11M39 32h8" />
            </g>
        </svg>
    );
}

export default function Logo({
    size = 36,
    showWordmark = true,
    className = "",
    wordmarkClassName = "text-lg font-semibold tracking-tight text-foreground",
}: {
    size?: number;
    showWordmark?: boolean;
    className?: string;
    wordmarkClassName?: string;
}) {
    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <LogoMark size={size} />
            {showWordmark ? (
                <span className={wordmarkClassName}>CloseFlow</span>
            ) : null}
        </span>
    );
}
