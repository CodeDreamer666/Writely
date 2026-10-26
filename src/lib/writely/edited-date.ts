/** Use local calendar days so relative labels stay correct across DST changes. */
export function formatEdited(date: Date, now = new Date()) {
    const day = (value: Date) =>
        Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    const days = (day(now) - day(date)) / 86_400_000;

    if (days === 0) return "Edited today";
    if (days === 1) return "Edited yesterday";
    if (days > 1 && days < 7) return `Edited ${days} days ago`;

    return `Edited ${date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
    })}`;
}
