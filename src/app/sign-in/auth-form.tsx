"use client";
import {
    ChevronLeft,
    Feather,
    KeyRound,
    LockKeyhole,
    Mail,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
    useEffect,
    useRef,
    useState,
    type ClipboardEvent,
    type FormEvent,
    type KeyboardEvent,
    type ReactNode,
} from "react";
import { authClient } from "~/server/better-auth/client";

type Mode = "sign-in" | "sign-up";
type Step = Mode | "forgot" | "code" | "new-password";

/** What: how long before "Resend code" is offered. Used in: the code step. Effect: stops repeat sends. */
const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;

const input =
    "mt-1.5 h-12! w-full rounded-[10px]! border! border-line! bg-surface! px-4! text-[16px]! text-ink! placeholder:text-muted";
const label = "text-[13px] font-medium";
const primary =
    "mt-5 h-12! w-full rounded-[10px]! border-0! bg-accent! text-[15px]! font-medium text-[var(--on-accent)]! hover:bg-[var(--hover)]! disabled:opacity-60";
const link =
    "text-accent! hover:text-[var(--hover)]! cursor-pointer border-0! bg-transparent! p-0! font-medium no-underline";

/** Only same-site paths, so the sign-in page can't be used to send people elsewhere. */
function nextPath() {
    const next = new URLSearchParams(window.location.search).get("next");
    return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function AuthForm({
    initialMode = "sign-in",
    googleEnabled,
}: {
    initialMode?: Mode;
    googleEnabled: boolean;
}) {
    const [step, setStep] = useState<Step>(initialMode);
    const [name, setName] = useState(""),
        [email, setEmail] = useState(""),
        [password, setPassword] = useState(""),
        [confirm, setConfirm] = useState(""),
        [code, setCode] = useState("");
    const [error, setError] = useState(""),
        [busy, setBusy] = useState(false);

    const go = (next: Step) => {
        setStep(next);
        setError("");
    };

    /** Runs an auth call, showing its error in place or moving on when it succeeds. */
    const run = async (
        call: () => Promise<{ error: { message?: string } | null }>,
        then: () => void,
    ) => {
        setBusy(true);
        setError("");
        const { error } = await call();
        setBusy(false);
        if (error) {
            setError(
                error.message ?? "Something went wrong. Please try again.",
            );
            return;
        }
        then();
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (step === "sign-in" || step === "sign-up")
            void run(
                () =>
                    step === "sign-up"
                        ? authClient.signUp.email({
                              name: name.trim(),
                              email,
                              password,
                          })
                        : authClient.signIn.email({ email, password }),
                () => (window.location.href = nextPath()),
            );
        else if (step === "forgot")
            void run(
                () => authClient.emailOtp.requestPasswordReset({ email }),
                () => {
                    setCode("");
                    go("code");
                },
            );
        else if (step === "code")
            void run(
                () =>
                    authClient.emailOtp.checkVerificationOtp({
                        email,
                        otp: code,
                        type: "forget-password",
                    }),
                () => {
                    setPassword("");
                    setConfirm("");
                    go("new-password");
                },
            );
        else if (password !== confirm)
            setError("The two passwords don't match.");
        else
            void run(
                async () => {
                    const reset = await authClient.emailOtp.resetPassword({
                        email,
                        otp: code,
                        password,
                    });
                    return reset.error
                        ? reset
                        : authClient.signIn.email({ email, password });
                },
                () => (window.location.href = nextPath()),
            );
    };

    const errorNote = error && (
        <p className="text-danger m-0 mt-4 text-[14px]" role="alert">
            {error}
        </p>
    );

    if (step === "sign-in" || step === "sign-up") {
        const signingUp = step === "sign-up";
        return (
            <Layout hero={<RevisionDrawing />}>
                <div
                    role="tablist"
                    aria-label="Account"
                    className="bg-line/70 grid grid-cols-2 gap-1 rounded-[10px] p-1"
                >
                    {(["sign-in", "sign-up"] as const).map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            role="tab"
                            aria-selected={step === mode}
                            onClick={() => go(mode)}
                            className={`h-10! rounded-[8px]! border-0! text-[14px]! ${
                                step === mode
                                    ? "bg-surface! text-ink! font-medium [box-shadow:0_1px_2px_color-mix(in_srgb,var(--shadow)_12%,transparent)]"
                                    : "text-muted! bg-transparent! font-medium"
                            }`}
                        >
                            {mode === "sign-in" ? "Sign in" : "Create account"}
                        </button>
                    ))}
                </div>
                <div className="mt-5">
                    <Title>
                        {signingUp ? "Create your account" : "Welcome back"}
                    </Title>
                </div>
                {googleEnabled && (
                    <>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                                void authClient.signIn.social({
                                    provider: "google",
                                    callbackURL: nextPath(),
                                })
                            }
                            className="border-line! bg-surface! text-ink! mt-4 flex h-12! w-full items-center justify-center gap-2.5 rounded-[10px]! border! text-[15px]! font-medium"
                        >
                            <GoogleMark />
                            Continue with Google
                        </button>
                        <div className="text-muted mt-4 flex items-center gap-3 text-[13px]">
                            <span className="bg-line h-px flex-1" />
                            or
                            <span className="bg-line h-px flex-1" />
                        </div>
                    </>
                )}
                <form
                    className="flex flex-col"
                    onSubmit={submit}
                    aria-labelledby="auth-title"
                >
                    {signingUp && (
                        <>
                            <label
                                htmlFor="auth-name"
                                className={`${label} mt-4`}
                            >
                                Name
                            </label>
                            <input
                                id="auth-name"
                                className={input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="name"
                                placeholder="Your name"
                                required
                                maxLength={120}
                            />
                        </>
                    )}
                    <label
                        htmlFor="auth-email"
                        className={`${label} ${signingUp ? "mt-3.5" : "mt-4"}`}
                    >
                        Email
                    </label>
                    <input
                        id="auth-email"
                        className={input}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="you@example.com"
                        required
                    />
                    <div className="mt-3.5 flex min-h-5 items-center justify-between">
                        <label htmlFor="auth-password" className={label}>
                            Password
                        </label>
                        {!signingUp && (
                            <button
                                type="button"
                                className={`${link} -my-3 min-h-11! text-[13px]!`}
                                onClick={() => go("forgot")}
                            >
                                Forgot?
                            </button>
                        )}
                    </div>
                    <input
                        id="auth-password"
                        className={input}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={
                            signingUp ? "new-password" : "current-password"
                        }
                        placeholder={
                            signingUp
                                ? "At least 8 characters"
                                : "Your password"
                        }
                        minLength={signingUp ? 8 : undefined}
                        required
                    />
                    {errorNote}
                    <button className={primary} type="submit" disabled={busy}>
                        {signingUp ? "Create account" : "Sign in"}
                    </button>
                </form>
            </Layout>
        );
    }

    const back = (to: Step, title: string) => (
        <button
            type="button"
            aria-label={title}
            onClick={() => go(to)}
            className="text-ink! -ml-2.5 flex size-11! items-center justify-center rounded-full! border-0! bg-transparent!"
        >
            <ChevronLeft size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
    );

    if (step === "forgot")
        return (
            <Layout
                reset
                back={back("sign-in", "Back to sign in")}
                hero={<HeroIcon icon={KeyRound} />}
                footer={
                    <>
                        Remembered it?{" "}
                        <button
                            type="button"
                            className={`${link} text-[14px]!`}
                            onClick={() => go("sign-in")}
                        >
                            Back to sign in
                        </button>
                    </>
                }
            >
                <form
                    className="flex flex-col"
                    onSubmit={submit}
                    aria-labelledby="auth-title"
                >
                    <Title>Forgot your password?</Title>
                    <Lead>We’ll email you a 6-digit code.</Lead>
                    <label htmlFor="reset-email" className={`${label} mt-6`}>
                        Email
                    </label>
                    <input
                        id="reset-email"
                        className={input}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="you@example.com"
                        required
                    />
                    {errorNote}
                    <button className={primary} type="submit" disabled={busy}>
                        Send code
                    </button>
                </form>
            </Layout>
        );

    if (step === "code")
        return (
            <Layout
                reset
                back={back("forgot", "Back")}
                hero={<HeroIcon icon={Mail} />}
                footer={
                    <>
                        Wrong address?{" "}
                        <button
                            type="button"
                            className={`${link} text-[14px]!`}
                            onClick={() => go("forgot")}
                        >
                            Change email
                        </button>
                    </>
                }
            >
                <form
                    className="flex flex-col"
                    onSubmit={submit}
                    aria-labelledby="auth-title"
                >
                    <Title>Check your email</Title>
                    <Lead>
                        We sent a 6-digit code to{" "}
                        <span className="text-ink font-medium">{email}</span>.
                    </Lead>
                    <CodeInput value={code} onChange={setCode} />
                    {errorNote}
                    <button
                        className={primary}
                        type="submit"
                        disabled={busy || code.length < CODE_LENGTH}
                    >
                        Verify code
                    </button>
                    <Resend
                        onResend={() =>
                            void run(
                                () =>
                                    authClient.emailOtp.requestPasswordReset({
                                        email,
                                    }),
                                () => setCode(""),
                            )
                        }
                    />
                </form>
            </Layout>
        );

    return (
        <Layout reset hero={<HeroIcon icon={LockKeyhole} />}>
            <form
                className="flex flex-col"
                onSubmit={submit}
                aria-labelledby="auth-title"
            >
                <Title>Set a new password</Title>
                <Lead>Your drafts are right where you left them.</Lead>
                <label htmlFor="new-password" className={`${label} mt-6`}>
                    New password
                </label>
                <input
                    id="new-password"
                    className={input}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                />
                <label htmlFor="confirm-password" className={`${label} mt-3.5`}>
                    Confirm password
                </label>
                <input
                    id="confirm-password"
                    className={input}
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Type it once more"
                    minLength={8}
                    required
                />
                {errorNote}
                <button className={primary} type="submit" disabled={busy}>
                    Save and sign in
                </button>
            </form>
        </Layout>
    );
}

/**
 * Phones: the drawing on the cream page, the form on a raised white sheet below it, like the
 * landing page above. From 900px wide the page beside it frames the form instead, so the hero and
 * the sheet fall away.
 */
function Layout({
    reset = false,
    back,
    hero,
    footer,
    children,
}: {
    /** The forgot-password steps: a back button instead of the logo. */
    reset?: boolean;
    back?: ReactNode;
    hero: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-dvh w-full flex-col min-[900px]:mx-auto min-[900px]:min-h-0 min-[900px]:max-w-[380px]">
            <div className="flex shrink-0 flex-col px-6 min-[900px]:hidden">
                <header className="flex h-16 items-center">
                    {back}
                    {!reset && (
                        <Link
                            href="/"
                            aria-label="Writely home"
                            className="text-accent flex items-center gap-2 no-underline"
                        >
                            <Feather
                                size={20}
                                strokeWidth={1.6}
                                aria-hidden="true"
                            />
                            <span className="text-ink text-[18px] font-semibold tracking-[-0.04em]">
                                Writely
                            </span>
                        </Link>
                    )}
                </header>
                {hero}
            </div>
            {/* The sheet always runs edge to edge on phones and tablets; only its contents keep a phone width. */}
            <div className="bg-surface border-line flex flex-1 flex-col rounded-t-[24px] border-t px-6 pt-6 pb-7 [box-shadow:0_-18px_40px_-30px_color-mix(in_srgb,var(--shadow)_40%,transparent)] min-[900px]:rounded-none min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:p-0 min-[900px]:shadow-none">
                <div className="mx-auto flex w-full max-w-[392px] flex-1 flex-col min-[900px]:max-w-none">
                    {children}
                    {footer && (
                        <p className="text-muted m-0 mt-auto pt-6 text-center text-[14px]">
                            {footer}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function Title({ children }: { children: ReactNode }) {
    return (
        <h1
            id="auth-title"
            className="m-0 font-serif text-[26px] leading-[1.15] font-normal tracking-[-0.02em]"
        >
            {children}
        </h1>
    );
}

function Lead({ children }: { children: ReactNode }) {
    return (
        <p className="text-muted m-0 mt-1.5 text-[14px] leading-[1.5]">
            {children}
        </p>
    );
}

/**
 * A small piece of a Writely draft above the sign-in form: one struck word and its replacement, so
 * the page shows what revising here looks like.
 */
function RevisionDrawing() {
    return (
        <div aria-hidden="true" className="flex justify-center pt-2 pb-7">
            <div className="bg-surface text-ink border-line w-full max-w-[304px] -rotate-2 rounded-[12px] border px-5 pt-4 pb-5 [box-shadow:0_16px_32px_-22px_color-mix(in_srgb,var(--shadow)_40%,transparent)]">
                <div className="text-muted flex items-baseline justify-between text-[11px] font-medium tracking-[0.02em]">
                    <span>A work in progress</span>
                    <span>Draft 03</span>
                </div>
                <p className="m-0 mt-2.5 font-serif text-[16px] leading-[1.5]">
                    The first draft says it{" "}
                    <span className="text-muted line-through decoration-1">
                        loudly
                    </span>{" "}
                    <span className="rounded-[3px] bg-[var(--hero-mark)] px-[3px]">
                        honestly
                    </span>
                    . The rewrite is where you find the words you meant.
                </p>
            </div>
        </div>
    );
}

/** The tilted badge above the sheet on the reset steps. */
function HeroIcon({ icon: Icon }: { icon: LucideIcon }) {
    return (
        <div aria-hidden="true" className="flex h-[140px] justify-center pt-4">
            <span className="bg-surface border-line text-accent flex size-[76px] -rotate-6 items-center justify-center rounded-full border [box-shadow:0_14px_28px_-18px_color-mix(in_srgb,var(--shadow)_45%,transparent)]">
                <Icon size={30} strokeWidth={1.6} />
            </span>
        </div>
    );
}

/** Six boxes that behave as one code field: typing moves on, backspace moves back, a paste fills them all. */
function CodeInput({
    value,
    onChange,
}: {
    value: string;
    onChange: (code: string) => void;
}) {
    const boxes = useRef<(HTMLInputElement | null)[]>([]);
    const focus = (i: number) =>
        boxes.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))]?.focus();

    const setDigit = (i: number, raw: string) => {
        // Typing into a filled box gives two characters; keep the new one.
        const digits = (raw.length === 2 ? raw.slice(-1) : raw).replace(
            /\D/g,
            "",
        );
        if (!digits) return;
        const chars = value.padEnd(CODE_LENGTH, " ").split("");
        digits
            .slice(0, CODE_LENGTH - i)
            .split("")
            .forEach((d, k) => (chars[i + k] = d));
        onChange(chars.join("").trimEnd().replace(/ /g, ""));
        focus(i + digits.length);
    };

    const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !value[i]) {
            e.preventDefault();
            onChange(value.slice(0, Math.max(0, i - 1)));
            focus(i - 1);
        } else if (e.key === "Backspace") {
            e.preventDefault();
            onChange(value.slice(0, i));
        } else if (e.key === "ArrowLeft") focus(i - 1);
        else if (e.key === "ArrowRight") focus(i + 1);
    };

    const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const digits = e.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, CODE_LENGTH);
        onChange(digits);
        focus(digits.length);
    };

    return (
        <fieldset className="m-0 mt-6 flex gap-2 border-0 p-0">
            <legend className="sr-only">6-digit code</legend>
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
                <input
                    key={i}
                    ref={(el) => {
                        boxes.current[i] = el;
                    }}
                    aria-label={`Digit ${i + 1}`}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={CODE_LENGTH}
                    value={value[i] ?? ""}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onPaste={onPaste}
                    className="bg-surface! text-ink! border-line! h-12! min-w-0 flex-1 rounded-[10px]! border! p-0! text-center text-[20px]! font-medium focus:border-2!"
                />
            ))}
        </fieldset>
    );
}

/** "Didn't get it? Resend in 0:42", then a button once the wait is over. */
function Resend({ onResend }: { onResend: () => void }) {
    const [left, setLeft] = useState(RESEND_SECONDS);
    useEffect(() => {
        if (left <= 0) return;
        const timer = setTimeout(() => setLeft(left - 1), 1000);
        return () => clearTimeout(timer);
    }, [left]);
    return (
        <p className="text-muted m-0 mt-4 text-center text-[13px]">
            Didn’t get it?{" "}
            {left > 0 ? (
                `Resend in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`
            ) : (
                <button
                    type="button"
                    className={`${link} min-h-11! text-[13px]!`}
                    onClick={() => {
                        onResend();
                        setLeft(RESEND_SECONDS);
                    }}
                >
                    Resend code
                </button>
            )}
        </p>
    );
}

function GoogleMark() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
        </svg>
    );
}
