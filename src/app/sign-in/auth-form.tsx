"use client";
import { Feather } from "lucide-react";
import {
    useState,
    type FormEvent,
} from "react";
import { authClient } from "~/server/better-auth/client";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ initialMode = "sign-in" }: { initialMode?: Mode }) {
    const [mode, setMode] = useState<Mode>(initialMode);
    const [name, setName] = useState(""),
        [email, setEmail] = useState(""),
        [password, setPassword] = useState("");
    const [error, setError] = useState(""),
        [busy, setBusy] = useState(false);
    const signingUp = mode === "sign-up";

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const { error } = signingUp
            ? await authClient.signUp.email({
                  name: name.trim(),
                  email,
                  password,
              })
            : await authClient.signIn.email({ email, password });
        if (error) {
            setBusy(false);
            setError(
                error.message ?? "Something went wrong. Please try again.",
            );
            return;
        }
        // Only same-site paths, so the sign-in page can't be used to send people elsewhere.
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.href =
            next?.startsWith("/") && !next.startsWith("//") ? next : "/";
    };

    return (
        <form
            className="[&_label]:text-muted w-full max-w-[380px] [&_input]:min-h-12! [&_input]:text-[15px]! [&_label]:mb-2 [&_label]:block [&_label]:text-[12px] [&_label]:font-medium"
            onSubmit={(e) => void submit(e)}
            aria-labelledby="auth-title"
        >
            <div className="text-accent mb-10 hidden items-center gap-2 max-[900px]:flex">
                <Feather size={20} strokeWidth={1.5} aria-hidden="true" />
                <span className="text-ink text-[20px] font-semibold tracking-[-0.04em]">
                    Writely
                </span>
            </div>
            <h1
                id="auth-title"
                className="mb-2 font-serif text-[36px] leading-[1.1] font-normal tracking-[-0.03em]"
            >
                {signingUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-muted mb-8 text-[14px] leading-[1.6]">
                {signingUp
                    ? "Your writing, drafts and thoughts are kept safely in your account."
                    : "Sign in to continue writing."}
            </p>
            {signingUp && (
                <div className="mb-4">
                    <label htmlFor="auth-name">Name</label>
                    <input
                        id="auth-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        required
                        maxLength={120}
                    />
                </div>
            )}
            <div className="mb-4">
                <label htmlFor="auth-email">Email</label>
                <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                />
            </div>
            <div>
                <label htmlFor="auth-password">Password</label>
                <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                        signingUp ? "new-password" : "current-password"
                    }
                    minLength={signingUp ? 8 : undefined}
                    required
                />
            </div>
            {error && (
                <p className="text-danger mt-4 text-[13px]" role="alert">
                    {error}
                </p>
            )}
            <div className="mt-7 flex flex-col items-stretch gap-2">
                <button
                    className="primary bg-accent! min-h-12! rounded-[10px]! text-[15px]! font-medium text-[var(--on-accent)]! hover:bg-[var(--hover)]!"
                    type="submit"
                    disabled={busy}
                >
                    {signingUp ? "Create account" : "Sign in"}
                </button>
                <button
                    type="button"
                    className="text-muted! min-h-11! text-[13px]!"
                    onClick={() => {
                        setMode(signingUp ? "sign-in" : "sign-up");
                        setError("");
                    }}
                >
                    {signingUp
                        ? "Already have an account? Sign in"
                        : "New to Writely? Create an account"}
                </button>
            </div>
        </form>
    );
}
