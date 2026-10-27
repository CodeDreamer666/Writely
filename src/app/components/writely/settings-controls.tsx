"use client";
import type {
    CSSProperties,
    ReactNode,
} from "react";

/** The controls every Settings section is built from: grouped rows, segmented choices and switches. */

export const entries = <T extends object>(o: T) =>
    Object.entries(o) as [Extract<keyof T, string>, T[keyof T]][];

/** A titled part of Settings, shown as the panel beside the section list: the title and its explanation above the settings. */
export function SettingsSection({
    id,
    title,
    hint,
    action,
    children,
}: {
    id: string;
    title: string;
    hint?: ReactNode;
    /** A control beside the title, such as "Add goal". */
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section aria-labelledby={id} className="grid gap-y-7">
            <div className="border-line flex items-end justify-between gap-x-6 gap-y-4 border-b pb-6 max-sm:flex-col max-sm:items-stretch">
                <div className="max-w-[560px]">
                    <h2
                        id={id}
                        className="font-serif text-[30px] leading-tight font-normal tracking-[-0.02em]"
                    >
                        {title}
                    </h2>
                    {hint && (
                        <p className="text-muted mt-2 text-[13.5px] leading-relaxed">
                            {hint}
                        </p>
                    )}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
                {children}
            </div>
        </section>
    );
}

/** Rows of related settings on one surface, separated by hairlines. */
export function SettingsCard({
    children,
    className = "",
    divided = true,
}: {
    children: ReactNode;
    className?: string;
    /** Hairlines between the children; off for a card laid out as one row. */
    divided?: boolean;
}) {
    return (
        <div
            className={`border-line bg-surface rounded-2xl border ${divided ? "divide-line divide-y" : ""} ${className}`}
        >
            {children}
        </div>
    );
}

/**
 * One setting: its label and an optional hint, with the control beside it. Wide controls
 * (`stacked`) sit underneath instead, as do all controls on phones.
 */
export function SettingRow({
    id,
    label,
    hint,
    value,
    stacked = false,
    compact = false,
    children,
}: {
    id: string;
    label: string;
    hint?: ReactNode;
    /** The current value, shown beside the label (for sliders). */
    value?: ReactNode;
    stacked?: boolean;
    /** Keep a switch beside its title, with supporting text on a second row. */
    compact?: boolean;
    children: ReactNode;
}) {
    if (compact) {
        return (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0 px-4 py-5">
                <span id={id} className="text-[14px] leading-5 font-medium">
                    {label}
                </span>
                <div className="flex h-5 items-center">{children}</div>
                {hint && (
                    <p
                        id={`${id}-hint`}
                        className="text-muted col-span-2 m-0 text-[12px] leading-5"
                    >
                        {hint}
                    </p>
                )}
            </div>
        );
    }
    return (
        <div
            className={`flex gap-x-6 gap-y-3 px-5 py-4 ${stacked ? "flex-col" : "items-center justify-between max-sm:flex-col max-sm:items-stretch"}`}
        >
            <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                    <span id={id} className="text-[13.5px] font-medium">
                        {label}
                    </span>
                    {value}
                </div>
                {hint && (
                    <p
                        id={`${id}-hint`}
                        className="text-muted mt-0.5 text-[12px] leading-relaxed"
                    >
                        {hint}
                    </p>
                )}
            </div>
            <div className={stacked ? "" : "shrink-0"}>{children}</div>
        </div>
    );
}

/** Mutually exclusive choices that read as one control, with arrow-key movement between them. */
export function Segmented<T extends string>({
    labelledBy,
    value,
    options,
    onChange,
}: {
    labelledBy: string;
    value: T;
    options: {
        value: T;
        label: ReactNode;
        style?: CSSProperties;
        detail?: string;
        /** A small drawing of the choice's effect, shown above its label. */
        preview?: ReactNode;
    }[];
    onChange: (value: T) => void;
}) {
    return (
        <div
            role="radiogroup"
            aria-labelledby={labelledBy}
            className="border-line bg-paper grid min-w-[300px] auto-cols-fr grid-flow-col gap-0.5 rounded-xl border p-1 max-sm:min-w-0"
            onKeyDown={(e) => {
                const step =
                    e.key === "ArrowRight" || e.key === "ArrowDown"
                        ? 1
                        : e.key === "ArrowLeft" || e.key === "ArrowUp"
                          ? -1
                          : 0;
                if (!step) return;
                e.preventDefault();
                const index = options.findIndex((o) => o.value === value);
                const next =
                    options[(index + step + options.length) % options.length]!;
                onChange(next.value);
                requestAnimationFrame(() =>
                    e.currentTarget
                        .querySelector<HTMLElement>(
                            `[data-value="${next.value}"]`,
                        )
                        ?.focus(),
                );
            }}
        >
            {options.map((option) => {
                const checked = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        data-value={option.value}
                        aria-checked={checked}
                        tabIndex={checked ? 0 : -1}
                        onClick={() => onChange(option.value)}
                        style={option.style}
                        className={`min-h-10! min-w-0! flex-col! rounded-lg! border-0! px-2.5! text-[13px]! leading-tight shadow-none! transition-colors duration-150 ${option.preview ? "gap-1.5! py-2!" : "gap-0! py-1.5!"} ${
                            checked
                                ? "bg-tint! text-accent! font-medium"
                                : "text-muted! hover:text-ink! bg-transparent! hover:bg-[var(--control-hover)]!"
                        }`}
                    >
                        {option.preview && (
                            <span
                                aria-hidden="true"
                                className="flex h-7 w-full items-center justify-center"
                            >
                                {option.preview}
                            </span>
                        )}
                        <span className="max-w-full truncate">
                            {option.label}
                        </span>
                        {option.detail && (
                            <span
                                className={`text-[10.5px] font-normal tabular-nums ${checked ? "text-accent" : "text-muted"}`}
                            >
                                {option.detail}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/** An on/off setting, read by screen readers as a switch. */
export function Switch({
    labelledBy,
    describedBy,
    checked,
    onChange,
}: {
    labelledBy: string;
    describedBy?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            onClick={() => onChange(!checked)}
            className="group -mr-2 h-11! min-h-11! w-14! min-w-14! rounded-full! border-0! bg-transparent! p-0! hover:bg-transparent!"
        >
            <span
                aria-hidden="true"
                className={`relative block h-6 w-10 rounded-full border transition-colors duration-150 ${
                    checked
                        ? "border-accent bg-accent"
                        : "border-[var(--control-border)] bg-[color-mix(in_srgb,var(--text)_14%,var(--surface))] group-hover:bg-[color-mix(in_srgb,var(--text)_20%,var(--surface))]"
                }`}
            >
                <span
                    className={`bg-surface absolute top-1/2 left-0.5 size-[18px] -translate-y-1/2 rounded-full shadow-[0_1px_3px_color-mix(in_srgb,var(--shadow)_25%,transparent)] transition-transform duration-150 ${
                        checked ? "translate-x-4" : ""
                    }`}
                />
            </span>
        </button>
    );
}
