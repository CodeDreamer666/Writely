import {
    Focus,
    ListChecks,
    Rocket,
    StickyNote,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ShotId } from "./shot";

/**
 * The Help centre's guides: one per task area, covering only what the interface doesn't make
 * obvious on its own. Each step is one thing to do; a screenshot shows where its controls are
 * when they would be hard to find from words alone.
 */

export type Note = {
    /** "result" says how to tell a step worked; "missing" what to do if something isn't there. */
    kind: "tip" | "result" | "missing";
    text: ReactNode;
};

export type Step = {
    /** What to do, said as an instruction. */
    title: string;
    body: ReactNode;
    shot?: ShotId;
    /** What the screenshot shows, in words; also its alternative text. */
    alt?: string;
    /** A short line beneath the screenshot. */
    caption?: ReactNode;
    notes?: Note[];
};

export type Section = {
    title: string;
    intro?: ReactNode;
    steps: Step[];
};

export type Guide = {
    slug: string;
    title: string;
    icon: LucideIcon;
    /** One line for the topic list. */
    summary: string;
    /** What the feature does, before any steps. */
    about: ReactNode;
    sections: Section[];
};

/** A control's name, as it appears on screen. */
const Ui = ({ children }: { children: ReactNode }) => (
    <strong className="text-ink font-semibold">{children}</strong>
);
/** A key on the keyboard. */
const Key = ({ children }: { children: ReactNode }) => (
    <kbd className="border-line bg-paper text-ink inline-flex min-w-6 justify-center rounded-[5px] border px-1.5 py-px font-sans text-[0.85em] leading-[1.4]">
        {children}
    </kbd>
);

export const GUIDES: Guide[] = [
    {
        slug: "getting-started",
        title: "Getting started",
        icon: Rocket,
        summary:
            "Where the writing tools are on a computer and a phone, and how to export.",
        about: (
            <>
                Writely saves while you type, so there is no Save button: the
                top bar says <Ui>Saved</Ui> once your words are stored. If it
                says <Ui>Not saved</Ui>, keep the page open and click{" "}
                <Ui>Retry</Ui>. Click a document’s title in the top bar to
                rename it.
            </>
        ),
        sections: [
            {
                title: "Find the writing tools",
                steps: [
                    {
                        title: "On a computer, use the bar under the page",
                        body: (
                            <>
                                The bar at the bottom holds the document tools:{" "}
                                <Ui>+</Ui> adds a thought card, then{" "}
                                <Ui>Thoughts</Ui>, <Ui>Checklist</Ui>,{" "}
                                <Ui>Drafts</Ui> and the word count, which opens
                                your writing statistics. The <Ui>⌄</Ui> at its
                                end tucks the bar away; click <Ui>Tools</Ui> to
                                bring it back. Formatting appears above your
                                text when you select some words; its <Ui>⋯</Ui>{" "}
                                button holds the less common styles.
                            </>
                        ),
                        shot: "start-dock",
                        alt: "The tools bar under the page, with New card, Thoughts, Checklist, Drafts, Word count and Hide ringed.",
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        Press <Key>Ctrl</Key>+<Key>/</Key> (
                                        <Key>⌘</Key>+<Key>/</Key> on a Mac)
                                        while writing to see every keyboard
                                        shortcut.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "On a phone or tablet, switch the bar above the keyboard",
                        body: (
                            <>
                                One bar sits at the bottom of the screen, above
                                the keyboard. It shows formatting while you type
                                and the document tools (Thoughts, Checklist,
                                Drafts, word count) otherwise. The button at its
                                left switches between the two. Swipe the row
                                sideways to reach more buttons, and hold a
                                button for a moment to see its name.
                            </>
                        ),
                        shot: "start-phone-bar",
                        alt: "A phone with the formatting bar above the keyboard. The switch button at its left and the scrolling row are ringed.",
                        caption:
                            "A faded edge means more buttons are off-screen.",
                    },
                ],
            },
            {
                title: "Export a document",
                steps: [
                    {
                        title: "Choose Export from the document’s menu",
                        body: (
                            <>
                                Export works from your library, not inside the
                                editor. Open the three-dot menu on the document
                                and choose <Ui>Export as Word (.docx)</Ui> or{" "}
                                <Ui>Export as PDF (.pdf)</Ui>; on a phone the
                                menu opens from the bottom of the screen. The
                                file holds your text and its formatting only,
                                without thought cards, connections or
                                checklists.
                            </>
                        ),
                        shot: "export-library",
                        alt: "A document’s menu in the library with Export as Word and Export as PDF ringed.",
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        Paper size, font and whether the title
                                        is printed at the top are set once for
                                        every export, in{" "}
                                        <Link href="/settings#export">
                                            Settings › Document export
                                        </Link>
                                        .
                                    </>
                                ),
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        slug: "thought-cards",
        title: "Thought cards",
        icon: StickyNote,
        summary:
            "Keep notes beside your page, connect them to the words they’re about, and fold them away.",
        about: (
            <>
                A thought card is a coloured note that sits beside your text and
                never changes it. Connect a card to a passage and the words are
                tinted in the card’s colour, with a line from the card to them.
                On a computer, cards float in the margins. On a phone, tablet or
                narrow window they live in a <Ui>Cards</Ui> panel instead (see
                the last section).
            </>
        ),
        sections: [
            {
                title: "Write and arrange cards",
                steps: [
                    {
                        title: "Add a card with +",
                        body: (
                            <>
                                Click <Ui>+</Ui> in the tools bar (or{" "}
                                <Ui>New thought</Ui> in the <Ui>Thoughts</Ui>{" "}
                                panel). A card appears in the left margin, ready
                                for typing. Click anywhere outside it to keep
                                what you wrote.
                            </>
                        ),
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        <Key>Esc</Key> while typing in a card
                                        throws away what you typed since you
                                        opened it. Click outside the card
                                        instead to keep it.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "Edit, move or fold a card",
                        body: (
                            <>
                                Double-click a card, or click its{" "}
                                <Ui>pencil</Ui>, to change the text. Drag the
                                card to move it; it stays where you drop it. The{" "}
                                <Ui>⌄</Ui> beside the pencil folds it into a
                                small note so it stops covering the margin; a
                                folded card keeps its connection line. Click the
                                folded note to open it again.
                            </>
                        ),
                        shot: "cards-saved",
                        alt: "A card in the margin. Its pencil, its fold arrow and its body are ringed and labelled Edit, Fold away and Drag here to move the card.",
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        With the keyboard: <Key>Tab</Key> to a
                                        card, press <Key>Enter</Key> to edit it
                                        or the arrow keys to move it.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "Recolour, delete or hide cards from Thoughts",
                        body: (
                            <>
                                Click <Ui>Thoughts</Ui> in the tools bar for a
                                list of this document’s cards. Click a row to
                                scroll to its card. Each row has a{" "}
                                <Ui>palette</Ui> for the colour, a{" "}
                                <Ui>pencil</Ui> and a <Ui>bin</Ui> (type{" "}
                                <Ui>delete</Ui> to confirm). <Ui>Shown</Ui> at
                                the top hides every card from the margins
                                without deleting them; click it again to bring
                                them back.
                            </>
                        ),
                        shot: "cards-drawer",
                        alt: "The Thoughts panel with the New thought button, the Shown switch, and one card’s colour and delete buttons ringed.",
                    },
                ],
            },
            {
                title: "Connect a card to text",
                steps: [
                    {
                        title: "Select the words, then choose Connect to thought",
                        body: (
                            <>
                                Select the passage the card is about. In the
                                toolbar that appears above it, click <Ui>⋯</Ui>{" "}
                                (<Ui>More formatting</Ui>), then{" "}
                                <Ui>Connect to thought</Ui>, the last item.
                            </>
                        ),
                        shot: "link-menu",
                        alt: "The formatting toolbar above selected words, with its menu open and Connect to thought ringed.",
                        caption:
                            "The item is greyed out if the selection is only spaces.",
                    },
                    {
                        title: "Click the card to connect",
                        body: (
                            <>
                                A message at the top says{" "}
                                <Ui>Select a thought card to connect</Ui>. Click
                                a card in the margin, open or folded. The words
                                are tinted in the card’s colour and a line joins
                                them; in <Ui>Thoughts</Ui>, the card’s row now
                                reads <Ui>Connected to “…”</Ui>.
                            </>
                        ),
                        shot: "link-done",
                        alt: "Tinted words in the text and the card in the margin, both ringed, joined by a thin line.",
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        Changed your mind? Press <Key>Esc</Key>{" "}
                                        or click elsewhere and nothing is
                                        connected.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "Change or remove a connection",
                        body: (
                            <>
                                A card connects to one passage at a time:
                                connecting it to new words moves the connection
                                there. To remove it, click the card once; a
                                small <Ui>chain-link ×</Ui> button appears below
                                it. Click that button. The tint and line go; the
                                card and your text stay.
                            </>
                        ),
                        shot: "link-remove",
                        alt: "A selected card with the chain-link and × button below it ringed.",
                        notes: [
                            {
                                kind: "missing",
                                text: (
                                    <>
                                        If you delete all the connected words,
                                        the card says{" "}
                                        <Ui>Text removed; reconnect</Ui>.
                                        Connect it to new words as above.
                                    </>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                title: "Cards on a phone or tablet",
                intro: (
                    <>
                        The same steps apply in a narrow window on a computer,
                        using the tools bar and the formatting toolbar.
                    </>
                ),
                steps: [
                    {
                        title: "Open Cards from Thoughts",
                        body: (
                            <>
                                Show the document tools in the bar at the bottom
                                and tap <Ui>Thoughts</Ui>. The <Ui>Cards</Ui>{" "}
                                panel slides up; swipe it down to close it.{" "}
                                <Ui>New card</Ui> opens a full screen for
                                typing; tap <Ui>Done</Ui> to go back. Tap a
                                connected card to jump to its words. Each card
                                has buttons for colour, edit, detach (the broken
                                chain) and delete.
                            </>
                        ),
                        shot: "cards-phone",
                        alt: "The Cards panel on a phone with the New card button and one card’s edit, detach and delete buttons ringed.",
                    },
                    {
                        title: "Connect selected words to a card",
                        body: (
                            <>
                                Select the words, then swipe the formatting row
                                to its end and tap <Ui>Connect to thought</Ui>{" "}
                                (the chain link). In the{" "}
                                <Ui>Attach to a card</Ui> panel, tap{" "}
                                <Ui>Attach selected text</Ui> on a card, or tap{" "}
                                <Ui>New card</Ui> for a fresh card that’s
                                already connected.
                            </>
                        ),
                        shot: "link-phone-attach",
                        alt: "The Attach to a card panel on a phone with New card and a card’s Attach selected text ringed.",
                        caption:
                            "Tap × beside the instructions to cancel without connecting.",
                    },
                ],
            },
        ],
    },
    {
        slug: "focus-mode",
        title: "Focus mode",
        icon: Focus,
        summary: "Hide everything but your words, and find the way back out.",
        about: (
            <>
                Focus mode hides the top bar, the tools and the cards for as
                long as you need; nothing is lost. If{" "}
                <Ui>Paragraph highlighting</Ui> is on in{" "}
                <Link href="/settings#writing">Settings › Writing</Link>, every
                paragraph but the one you’re in fades.
            </>
        ),
        sections: [
            {
                title: "Use focus mode",
                steps: [
                    {
                        title: "Turn it on from the top bar",
                        body: (
                            <>
                                Click <Ui>Enter focus mode</Ui>, the last button
                                at the top-right of the document. Or press{" "}
                                <Key>Ctrl</Key>+<Key>Shift</Key>+<Key>F</Key> (
                                <Key>⌘</Key>+<Key>Shift</Key>+<Key>F</Key> on a
                                Mac). On a phone the bar above the keyboard
                                hides too; select words to bring formatting
                                back.
                            </>
                        ),
                        shot: "focus-button",
                        alt: "The top-right of the editor with the Enter focus mode button ringed.",
                    },
                    {
                        title: "Leave from the top edge",
                        body: (
                            <>
                                The only control left is{" "}
                                <Ui>Exit focus mode</Ui> at the top centre. It
                                shows for a moment, then hides until you move
                                the pointer near the top of the window. Click
                                it, or anywhere along that top strip. On a touch
                                screen, tap the strip above your text. Pressing{" "}
                                <Key>Esc</Key> also leaves.
                            </>
                        ),
                        shot: "focus-on",
                        alt: "Focus mode: only the text is left, the current paragraph dark and the rest faded. The Exit focus mode button at the top is ringed.",
                    },
                ],
            },
        ],
    },
    {
        slug: "revision",
        title: "Revision tools",
        icon: ListChecks,
        summary:
            "Revise towards one goal at a time, keep drafts, compare them and restore an older one.",
        about: (
            <>
                A revision is one pass over your text with a single goal, such
                as “Improve the introduction”. Starting it keeps your text as a
                draft named <Ui>Before revision: …</Ui>, so you can see what the
                pass changed and go back if you need to. Your writing autosaves
                throughout; drafts are extra versions you choose to keep.
            </>
        ),
        sections: [
            {
                title: "Run a revision",
                steps: [
                    {
                        title: "Start from a goal in Checklist",
                        body: (
                            <>
                                Open <Ui>Checklist</Ui> and click a goal. Goals
                                under <Ui>Universal goals</Ui> appear in every
                                document; change them in{" "}
                                <Link href="/settings#checklist">
                                    Settings › Revision checklist
                                </Link>
                                . <Ui>Add goal</Ui> under <Ui>This draft</Ui>{" "}
                                adds one just for this document.
                            </>
                        ),
                        shot: "revise-checklist",
                        alt: "The Revision Checklist panel with the first goal ringed.",
                        notes: [
                            {
                                kind: "missing",
                                text: (
                                    <>
                                        Only one revision runs at a time: while
                                        one is open, the other goals are greyed
                                        out.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "Edit, then click Finish revision",
                        body: (
                            <>
                                A <Ui>Revising</Ui> bar with your goal appears
                                above the tools. Edit as usual; when the goal is
                                met, click <Ui>Finish revision</Ui>. On a phone
                                it is the tick at the start of the document
                                tools. Finishing marks the goal{" "}
                                <Ui>Completed</Ui> for this document; it doesn’t
                                save another draft.
                            </>
                        ),
                        shot: "revise-started",
                        alt: "The tools bar with the Revising bar above it and its Finish revision button ringed.",
                        caption:
                            "A completed goal can’t be started again in the same document.",
                    },
                ],
            },
            {
                title: "Keep, compare and restore drafts",
                steps: [
                    {
                        title: "Save a named draft",
                        body: (
                            <>
                                Open <Ui>Drafts</Ui> and click{" "}
                                <Ui>Save named draft</Ui>, or press{" "}
                                <Key>Ctrl</Key>+<Key>S</Key> (<Key>⌘</Key>+
                                <Key>S</Key> on a Mac). You stay in the editor,
                                and a running revision carries on. Each draft’s{" "}
                                <Ui>⋯</Ui> has <Ui>Rename</Ui>, <Ui>Restore</Ui>{" "}
                                and <Ui>Delete</Ui>.
                            </>
                        ),
                    },
                    {
                        title: "Compare two versions",
                        body: (
                            <>
                                Click <Ui>Compare</Ui> on a draft to see it
                                against your current writing. Change the pair
                                with <Ui>Version</Ui> and <Ui>Compare with</Ui>;
                                the arrows at the top-right step through each
                                change. Changed words are marked inside
                                paragraphs, and whole paragraphs are labelled{" "}
                                <Ui>Added paragraph</Ui> or{" "}
                                <Ui>Removed paragraph</Ui>. Comparing never
                                changes your text.
                            </>
                        ),
                        shot: "revise-compare",
                        alt: "The comparison: two versions side by side, with the version menus, the change arrows and the Restore this version button ringed.",
                        caption:
                            "On a phone the two versions merge into one text, each removal just before what replaced it.",
                    },
                    {
                        title: "Restore an older version",
                        body: (
                            <>
                                In the comparison, click{" "}
                                <Ui>Restore this version</Ui>, or use{" "}
                                <Ui>Restore</Ui> in a draft’s <Ui>⋯</Ui> menu,
                                then <Ui>Preserve &amp; restore</Ui>. Your
                                current text is kept first as a draft named{" "}
                                <Ui>Before restoring …</Ui>, so nothing is lost.
                                To undo a whole revision, restore its{" "}
                                <Ui>Before revision: …</Ui> draft.
                            </>
                        ),
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        Thought cards stay with the document,
                                        but a card connected to words that the
                                        old version doesn’t have will need
                                        reconnecting.
                                    </>
                                ),
                            },
                        ],
                    },
                ],
            },
        ],
    },
];

export const guideBySlug = (slug: string) =>
    GUIDES.find((guide) => guide.slug === slug);

/** How many steps a guide has, for the topic list. */
export const stepCount = (guide: Guide) =>
    guide.sections.reduce((sum, section) => sum + section.steps.length, 0);
