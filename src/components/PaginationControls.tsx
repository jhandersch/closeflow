type PaginationControlsProps = {
    page: number;
    pageSize: number;
    totalItems: number;
    label: string;
    onPageChange: (page: number) => void;
    showSummary?: boolean;
};

export default function PaginationControls({
    page,
    pageSize,
    totalItems,
    label,
    onPageChange,
    showSummary = true,
}: PaginationControlsProps) {
    const totalPages = Math.ceil(totalItems / pageSize);

    if (totalPages <= 1) {
        return null;
    }

    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const firstItem = (currentPage - 1) * pageSize + 1;
    const lastItem = Math.min(currentPage * pageSize, totalItems);
    const buttonClassName =
        "rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-foreground/80 transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40";

    return (
        <nav
            aria-label={`${label} pagination`}
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
            {showSummary ? (
                <p aria-live="polite" className="text-foreground/60">
                    Showing {firstItem}–{lastItem} of {totalItems} {label} · Page {currentPage} of {totalPages}
                </p>
            ) : null}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={buttonClassName}
                >
                    Previous
                </button>
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={buttonClassName}
                >
                    Next
                </button>
            </div>
        </nav>
    );
}
