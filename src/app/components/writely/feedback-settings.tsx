"use client";
import {
    CircleCheck,
    Send,
} from "lucide-react";
import {
    useId,
    useState,
    type FormEvent,
} from "react";
import {
    FEEDBACK_CATEGORIES,
    FEEDBACK_MAX,
    FEEDBACK_MIN,
    type FeedbackCategory,
} from "~/lib/writely/feedback";
import { api } from "~/trpc/react";
import {
    Segmented,
    SettingsCard,
} from "./settings-controls";
import { PRIMARY_BUTTON } from "~/config/ui";

/** The Feedback section of Settings: pick a kind and write a message. */
export function FeedbackSettings() {
    const [category, setCategory] = useState<FeedbackCategory>(
        FEEDBACK_CATEGORIES[0][0],
    );
    const [message, setMessage] = useState("");
    const [sent, setSent] = useState(false);
    const submit = api.feedback.submit.useMutation();
    const kindId = useId();
    const messageId = useId();

    const length = message.trim().length;
    const ready = length >= FEEDBACK_MIN && !submit.isPending;

    const send = (e: FormEvent) => {
        e.preventDefault();
        if (!ready) return;
        submit.mutate(
            {
                category,
                message,
                allowContact: false,
                page: "settings",
            },
            {
                onSuccess: () => {
                    setSent(true);
                    setMessage("");
                },
            },
        );
    };

    if (sent)
        return (
            <SettingsCard className="px-5 py-8">
                <div
                    role="status"
                    className="grid justify-items-center gap-3 text-center"
                >
                    <CircleCheck
                        size={28}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className="text-accent"
                    />
                    <p className="m-0 font-serif text-[20px]">
                        Thank you for telling us.
                    </p>
                    <p className="text-muted m-0 max-w-[420px] text-[13.5px] leading-relaxed">
                        Your message was sent without your email, so we won’t be
                        able to reply.
                    </p>
                    <button
                        type="button"
                        className="border-line! mt-2 h-9! min-h-9! border! px-3.5! text-[13px]!"
                        onClick={() => {
                            setSent(false);
                            submit.reset();
                        }}
                    >
                        Send more feedback
                    </button>
                </div>
            </SettingsCard>
        );

    return (
        <form onSubmit={send} className="grid gap-5">
            <SettingsCard divided={false} className="grid gap-5 p-5">
                <div className="grid gap-2">
                    <span id={kindId} className="text-[13.5px] font-medium">
                        What kind of feedback is it?
                    </span>
                    <Segmented
                        labelledBy={kindId}
                        value={category}
                        onChange={setCategory}
                        options={FEEDBACK_CATEGORIES.map(([value, label]) => ({
                            value,
                            label,
                        }))}
                    />
                </div>
                <div className="grid gap-2">
                    <label
                        htmlFor={messageId}
                        className="m-0 text-[13.5px] font-medium"
                    >
                        Your message
                    </label>
                    <textarea
                        id={messageId}
                        value={message}
                        onChange={(e) => {
                            setMessage(e.target.value);
                            if (submit.isError) submit.reset();
                        }}
                        maxLength={FEEDBACK_MAX}
                        rows={7}
                        placeholder="What happened, or what would you like to see?"
                        aria-describedby={`${messageId}-count`}
                        className="min-h-[160px] w-full resize-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    />
                    <p
                        id={`${messageId}-count`}
                        className="text-muted m-0 flex justify-between gap-3 text-[12px] tabular-nums"
                    >
                        <span>
                            {length > 0 && length < FEEDBACK_MIN
                                ? `A little more detail helps (${FEEDBACK_MIN} characters at least).`
                                : ""}
                        </span>
                        <span>
                            {message.length.toLocaleString()} /{" "}
                            {FEEDBACK_MAX.toLocaleString()}
                        </span>
                    </p>
                </div>
            </SettingsCard>
            {submit.isError && (
                <p role="alert" className="text-danger m-0 text-[13px]">
                    {submit.error.data?.code === "TOO_MANY_REQUESTS"
                        ? submit.error.message
                        : "Couldn’t send your feedback. Please try again."}
                </p>
            )}
            <div className="flex justify-end max-sm:[&>button]:w-full">
                <button
                    type="submit"
                    disabled={!ready}
                    className={`${PRIMARY_BUTTON} h-10! min-h-10! gap-2! rounded-lg! px-4! text-[13.5px]! font-medium`}
                >
                    <Send size={15} aria-hidden="true" />
                    {submit.isPending ? "Sending…" : "Send feedback"}
                </button>
            </div>
        </form>
    );
}
