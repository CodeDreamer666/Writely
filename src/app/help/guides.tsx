import {
    FileDown,
    Focus,
    Link2,
    ListChecks,
    Rocket,
    Settings,
    StickyNote,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ShotId } from "./shot";

/**
 * The Help centre's guides: one per topic, written as numbered steps of one action each. Every
 * step that asks the writer to find a control shows a screenshot with that control ringed, and
 * says what happens next, so nothing is left to guess.
 */

export type Note = {
    /** "result" says how to tell a step worked; "missing" what to do if something isn't there. */
    kind: "tip" | "result" | "missing";
    text: ReactNode;
};

export type Step = {
    /** One action, said as an instruction. */
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
            "Make your first document, name it, and find the tools around the page.",
        about: (
            <>
                Writely keeps all your writing in one library. Each document
                opens on a quiet page that saves itself while you type, so there
                is no Save button to remember. This guide takes you from an
                empty library to a named, saved document, and shows what each
                button around the page is for.
            </>
        ),
        sections: [
            {
                title: "Create a document",
                steps: [
                    {
                        title: "Click New document",
                        body: (
                            <>
                                Go to your library: the page that lists your
                                documents under the heading <Ui>Documents</Ui>.
                                From a document, click <Ui>← Documents</Ui> at
                                the top-left to get there. On a computer,{" "}
                                <Ui>New document</Ui> is the dark green button
                                at the top of the left-hand column. Click it
                                once.
                            </>
                        ),
                        shot: "start-library",
                        alt: "The library on a computer. The New document button at the top of the left column is ringed.",
                        caption:
                            "On a computer, New document sits above the list of filters.",
                        notes: [
                            {
                                kind: "missing",
                                text: (
                                    <>
                                        On a phone the left-hand column is
                                        hidden. Look for the round{" "}
                                        <Ui>+ New document</Ui> button floating
                                        at the bottom-right corner of the screen
                                        instead (see the next picture).
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "On a phone, tap the floating button",
                        body: (
                            <>
                                Skip this step on a computer. On a phone, tap{" "}
                                <Ui>+ New document</Ui> at the bottom-right. It
                                stays in the same place while you scroll.
                            </>
                        ),
                        shot: "start-phone",
                        alt: "The library on a phone. The floating New document button at the bottom-right is ringed.",
                        caption: "The button floats above your documents.",
                    },
                    {
                        title: "Start typing",
                        body: (
                            <>
                                The new document opens straight away. The large
                                empty area in the middle is your page; it shows
                                the faint words{" "}
                                <em>
                                    “Begin anywhere. Every thought has somewhere
                                    to go.”
                                </em>{" "}
                                until you type. Click anywhere on that area and
                                type. The faint words disappear as soon as you
                                type the first letter.
                            </>
                        ),
                        shot: "start-new",
                        alt: "A new, empty document. The title “A new piece” at the top and the empty page are ringed.",
                        caption:
                            "Every new document starts with the title “A new piece”.",
                    },
                ],
            },
            {
                title: "Name it and check it’s saved",
                steps: [
                    {
                        title: "Click the title at the top of the page",
                        body: (
                            <>
                                The title is the text in the middle of the top
                                bar (a new document says <Ui>A new piece</Ui>).
                                Click it once. It turns into a box with the
                                whole title selected, so anything you type
                                replaces it.
                            </>
                        ),
                        shot: "start-rename",
                        alt: "The title has turned into a text box at the top of the page, ringed.",
                        caption:
                            "When the title shows a border, it’s ready to type into.",
                    },
                    {
                        title: "Type a name and press Enter",
                        body: (
                            <>
                                Type the name you want, then press{" "}
                                <Key>Enter</Key> (or click anywhere on the
                                page). The box closes and the new name stays at
                                the top. Your library uses the same name.
                            </>
                        ),
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        Changed your mind? Press <Key>Esc</Key>{" "}
                                        while the box is open to keep the old
                                        name.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "Look for “Saved” at the top-right",
                        body: (
                            <>
                                Writely saves on its own a moment after you stop
                                typing. Look at the top-right corner, left of
                                the curved undo and redo arrows. While it saves
                                you’ll see a spinning circle and{" "}
                                <Ui>Saving…</Ui>; when it’s done you’ll see a
                                tick and <Ui>Saved</Ui>.
                            </>
                        ),
                        shot: "start-saved",
                        alt: "The top-right of the editor. The word Saved with a tick is ringed.",
                        caption:
                            "A tick and “Saved” mean everything you typed is stored.",
                        notes: [
                            {
                                kind: "missing",
                                text: (
                                    <>
                                        If it says <Ui>Not saved</Ui> with a
                                        cloud icon, your connection dropped.
                                        Keep the page open and click the{" "}
                                        <Ui>Retry</Ui> button beside it. On
                                        small screens only the tick or cloud
                                        icon shows, without words.
                                    </>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                title: "Find your way around",
                steps: [
                    {
                        title: "Get to know the tools bar",
                        body: (
                            <>
                                The rounded bar at the bottom of the page holds
                                every writing tool. From left to right:{" "}
                                <Ui>+</Ui> adds a thought card;{" "}
                                <Ui>Thoughts</Ui> lists your cards;{" "}
                                <Ui>Checklist</Ui> holds your revision goals;{" "}
                                <Ui>Drafts</Ui> lists saved versions; the word
                                count opens your writing statistics; and the
                                small arrow <Ui>⌄</Ui> hides the bar. Point at
                                any button to see its name.
                            </>
                        ),
                        shot: "start-dock",
                        alt: "The tools bar with each button ringed and labelled: New card, Thoughts, Checklist, Drafts, Word count, Hide.",
                        caption:
                            "On a phone the same buttons show only their icons.",
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        Hid the bar by accident? A small button
                                        stays at the bottom of the page; click
                                        it to bring the tools back.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "Click “Documents” to go back",
                        body: (
                            <>
                                To return to your library, click{" "}
                                <Ui>← Documents</Ui> at the top-left. Your
                                document is already saved, so nothing is lost.
                                On a phone only the arrow <Ui>←</Ui> shows.
                            </>
                        ),
                        shot: "start-back",
                        alt: "The top-left of the editor. The Documents back button is ringed.",
                        caption:
                            "Your document now appears first in the library.",
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
            "Keep notes, questions and ideas beside your page without touching the text.",
        about: (
            <>
                A thought card is a small coloured note that sits beside your
                page, like a sticky note on paper. Use it for a question, an
                idea for later or a reminder of what to fix. Cards never change
                your text, and each document keeps its own cards. On a computer
                they float in the margins; on a phone they live in a panel
                instead (see the last section).
            </>
        ),
        sections: [
            {
                title: "Add a card",
                steps: [
                    {
                        title: "Click + in the tools bar",
                        body: (
                            <>
                                The <Ui>+</Ui> is the first button on the left
                                of the tools bar at the bottom of the page. When
                                you point at it, a label says{" "}
                                <Ui>Add thought card</Ui>. Click it once.
                            </>
                        ),
                        shot: "cards-add",
                        alt: "The tools bar with the + button on its left ringed.",
                        caption: "The + is always the first button.",
                    },
                    {
                        title: "Type your thought",
                        body: (
                            <>
                                A new, empty card appears in the left margin,
                                level with the top of the part of the page you
                                are looking at. It is already open for typing:
                                just type. You don’t need to click it first.
                            </>
                        ),
                        shot: "cards-new",
                        alt: "A new empty yellow card in the left margin, ringed.",
                        caption:
                            "New cards are yellow; you can change the colour later.",
                    },
                    {
                        title: "Click outside the card to save it",
                        body: (
                            <>
                                When you’ve finished typing, click anywhere
                                outside the card, for example on an empty part
                                of the margin. The card closes and keeps your
                                words.
                            </>
                        ),
                        shot: "cards-typed",
                        alt: "The card now reads “Too vague?”. It is ringed.",
                        caption:
                            "While you type, the card has a blinking cursor; after you click away, it doesn’t.",
                        notes: [
                            {
                                kind: "missing",
                                text: (
                                    <>
                                        Pressing <Key>Esc</Key> while typing
                                        throws away what you just typed. Click
                                        outside the card instead to keep it.
                                    </>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                title: "Change, move or fold a card",
                steps: [
                    {
                        title: "Click the pencil to change the text",
                        body: (
                            <>
                                Every card has two small round buttons in its
                                top-right corner. The right one, a{" "}
                                <Ui>pencil</Ui>, opens the card for typing
                                again. Change the words, then click outside the
                                card to save.
                            </>
                        ),
                        shot: "cards-saved",
                        alt: "A saved card. Its pencil button, its fold arrow and its body are ringed and labelled Edit, Fold away and Drag here to move the card.",
                        caption:
                            "The pencil edits, the arrow folds, and the card itself can be dragged.",
                    },
                    {
                        title: "Drag the card to move it",
                        body: (
                            <>
                                Press and hold on the card’s text (not on the
                                round buttons), move the pointer to where you
                                want the card, then let go. Cards stay where you
                                drop them, even after you close the document.
                            </>
                        ),
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        With the keyboard: press <Key>Tab</Key>{" "}
                                        until the card has a ring around it,
                                        then use the arrow keys to move it.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "Click the small arrow to fold it away",
                        body: (
                            <>
                                The left of the two round buttons is a small
                                downward arrow <Ui>⌄</Ui>. Click it and the card
                                shrinks to a small folded note in the margin, so
                                it stops covering the page.
                            </>
                        ),
                        shot: "cards-folded",
                        alt: "A folded card: a small folded-paper shape in the margin, ringed.",
                        caption:
                            "Click the folded note once to open the card again.",
                    },
                ],
            },
            {
                title: "Manage all your cards",
                steps: [
                    {
                        title: "Click Thoughts in the tools bar",
                        body: (
                            <>
                                <Ui>Thoughts</Ui> is the second button in the
                                tools bar; the number beside it is how many
                                cards this document has. Clicking it opens a
                                list of every card above the bar. The list also
                                has a <Ui>New thought</Ui> button, which adds a
                                card exactly like <Ui>+</Ui> does.
                            </>
                        ),
                        shot: "cards-drawer",
                        alt: "The Thoughts list with the New thought button, the Shown switch, and one card’s colour and delete buttons ringed.",
                        caption:
                            "Each row is one card, with buttons for colour, edit and delete.",
                    },
                    {
                        title: "Click the palette to change a card’s colour",
                        body: (
                            <>
                                In the card’s row, click the <Ui>palette</Ui>{" "}
                                (the round icon with dots). A row of colours
                                appears; the current colour has a tick. Click
                                the colour you want. The card on the page
                                changes at once.
                            </>
                        ),
                        shot: "cards-colour",
                        alt: "A row of four colour circles above a card’s row, ringed. The yellow one has a tick.",
                        caption:
                            "Press Esc to close the colours without changing anything.",
                    },
                    {
                        title: "Click the bin to delete a card",
                        body: (
                            <>
                                In the card’s row, click the <Ui>bin</Ui> on the
                                right. Type <Ui>delete</Ui> in the confirmation
                                dialog and confirm to remove the card. Copy any
                                words you want to keep first. Your page text is
                                never affected.
                            </>
                        ),
                    },
                    {
                        title: "Click Shown to hide every card",
                        body: (
                            <>
                                At the top of the list, <Ui>Shown</Ui> (with an
                                eye) means the cards are visible on the page.
                                Click it and it changes to <Ui>Hidden</Ui>: the
                                cards disappear from the margins but are kept.
                                Click it again to bring them back.
                            </>
                        ),
                    },
                ],
            },
            {
                title: "Cards on a phone",
                intro: (
                    <>
                        Phone screens are too narrow for cards in the margins,
                        so cards are listed in a panel that slides up from the
                        bottom.
                    </>
                ),
                steps: [
                    {
                        title: "Tap the Thoughts icon",
                        body: (
                            <>
                                In the bar at the bottom, tap the first icon,
                                which looks like a page with a folded corner (a
                                small number shows how many cards you have). The{" "}
                                <Ui>Cards</Ui> panel slides up.
                            </>
                        ),
                        shot: "cards-phone",
                        alt: "The Cards panel on a phone. The Thoughts icon, the New card button and one card’s edit and delete buttons are ringed.",
                        caption:
                            "Tap New card to add one; the pencil and bin work as on a computer.",
                    },
                    {
                        title: "Tap New card and type",
                        body: (
                            <>
                                Tap <Ui>New card</Ui>. The card opens on a
                                screen of its own titled <Ui>New card</Ui>, with
                                the keyboard already up. Type your thought; it
                                saves as you type, however long it gets. Tap{" "}
                                <Ui>Done</Ui> at the top-right (or the{" "}
                                <Ui>←</Ui> at the top-left, or your phone’s back
                                gesture) to return to your document where you
                                left it. To change a card later, open the panel
                                again and tap its pencil.
                            </>
                        ),
                    },
                ],
            },
        ],
    },
    {
        slug: "linking",
        title: "Linking cards to text",
        icon: Link2,
        summary:
            "Attach a card to exact words, see the link, and remove it again.",
        about: (
            <>
                Linking ties a thought card to the exact words it is about. The
                linked words are tinted in the card’s colour and a thin line
                runs from the card to them, so you always know what a note
                refers to. You need a card first: see{" "}
                <Link href="/help/thought-cards">Thought cards</Link>. On a
                phone you can also make the card while linking.
            </>
        ),
        sections: [
            {
                title: "Link a card on a computer",
                steps: [
                    {
                        title: "Select the words",
                        body: (
                            <>
                                Put the pointer just before the first word you
                                want. Press and hold the mouse button, drag to
                                the end of the last word, then let go. The words
                                get a pale blue-green background: they are
                                selected. (With the keyboard: click before the
                                first word, then hold <Key>Shift</Key> and press{" "}
                                <Key>→</Key> until the words are covered.)
                            </>
                        ),
                        shot: "link-select",
                        alt: "Words selected in a paragraph, ringed, with a formatting toolbar above them, also ringed.",
                        caption:
                            "A small toolbar appears above the words as soon as they are selected.",
                        notes: [
                            {
                                kind: "missing",
                                text: (
                                    <>
                                        The toolbar appears <em>only</em> while
                                        words are selected. If it isn’t there,
                                        the selection was lost: select the words
                                        again. Selecting only spaces doesn’t
                                        count.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "Click ⋯ at the right end of the toolbar",
                        body: (
                            <>
                                The last button on the toolbar is three dots,{" "}
                                <Ui>⋯</Ui> (its label is{" "}
                                <Ui>More formatting</Ui>). Click it. A menu
                                opens below.
                            </>
                        ),
                        shot: "link-more",
                        alt: "The toolbar above the selected words, with the three-dot button at its right end ringed.",
                        caption: "Keep the words selected while you do this.",
                    },
                    {
                        title: "Click Connect to thought",
                        body: (
                            <>
                                <Ui>Connect to thought</Ui> is the last item in
                                the menu, with a chain-link icon. Click it.
                            </>
                        ),
                        shot: "link-menu",
                        alt: "The open menu with Connect to thought, the last item, ringed.",
                        caption:
                            "If the item is greyed out, the selection can’t be linked; select the words again.",
                    },
                    {
                        title: "Click the card to link",
                        body: (
                            <>
                                A message appears at the top of the window:{" "}
                                <Ui>Select a thought card to connect</Ui>. This
                                means Writely is waiting for you to choose.
                                Point at a card (it gets an outline) and click
                                it.
                            </>
                        ),
                        shot: "link-pick",
                        alt: "The message “Select a thought card to connect” at the top of the window and a card in the margin, both ringed.",
                        caption:
                            "Changed your mind? Press Esc and nothing is linked.",
                    },
                    {
                        title: "Check that the link worked",
                        body: (
                            <>
                                The message disappears and three things change:
                                the words are now tinted in the card’s colour, a
                                thin line runs from the card to the words, and
                                the card’s row in <Ui>Thoughts</Ui> says{" "}
                                <Ui>Connected to “…”</Ui> with the start of the
                                words.
                            </>
                        ),
                        shot: "link-done",
                        alt: "The linked words tinted yellow and the card, both ringed, with a thin line joining them.",
                        caption:
                            "Tint plus line means the card is linked to these words.",
                    },
                    {
                        title: "Open Thoughts to confirm (optional)",
                        body: (
                            <>
                                Click <Ui>Thoughts</Ui> in the tools bar. Under
                                the linked card’s text you’ll see{" "}
                                <Ui>Connected to</Ui> and the first words of the
                                passage. A card that isn’t linked shows nothing
                                there.
                            </>
                        ),
                        shot: "link-drawer",
                        alt: "The Thoughts list. Under one card, the line “Connected to ‘As the buildings thinned o…’” is ringed.",
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        One card can be linked to several
                                        passages: repeat these steps with other
                                        words and pick the same card.
                                    </>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                title: "Remove a link",
                steps: [
                    {
                        title: "Click the card once",
                        body: (
                            <>
                                Click the text of a linked card (not its round
                                buttons). Below the card a small button appears
                                showing a chain link and a <Ui>×</Ui>; there is
                                one for each link the card has.
                            </>
                        ),
                        shot: "link-remove",
                        alt: "A selected card with the small chain-link-and-× button under it ringed.",
                        caption:
                            "Point at the button to see which words it links to.",
                    },
                    {
                        title: "Click the chain-link × button",
                        body: (
                            <>
                                The line and the tint disappear. The card itself
                                and your text stay as they were.
                            </>
                        ),
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        If you delete all the words a card was
                                        linked to, the card stays but its link
                                        has nothing to point at (the button says{" "}
                                        <Ui>Text removed; reconnect</Ui>).
                                        Remove it, then link the card to new
                                        words.
                                    </>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                title: "Link a card on a phone",
                steps: [
                    {
                        title: "Select the words, then tap ⋯",
                        body: (
                            <>
                                Press and hold on the first word until it is
                                selected, then drag the small handles to cover
                                all the words you want. A toolbar appears above
                                them; on a phone the <Ui>⋯</Ui> button sits on a
                                second row in the middle. Tap it.
                            </>
                        ),
                        shot: "link-phone-select",
                        alt: "A phone screen with words selected and the three-dot button on the toolbar’s second row ringed.",
                    },
                    {
                        title: "Tap Connect to thought",
                        body: (
                            <>
                                Tap the last item in the menu,{" "}
                                <Ui>Connect to thought</Ui>. A panel called{" "}
                                <Ui>Attach to a card</Ui> slides up, listing
                                your cards.
                            </>
                        ),
                    },
                    {
                        title: "Tap “Attach selected text” under a card",
                        body: (
                            <>
                                Each card in the panel has the words{" "}
                                <Ui>Attach selected text</Ui> under it. Tap them
                                on the card you want. Or tap <Ui>New card</Ui>{" "}
                                at the top to make a fresh card that is already
                                linked to these words; it opens on its own
                                screen for typing.
                            </>
                        ),
                        shot: "link-phone-attach",
                        alt: "The Attach to a card panel. The New card button and a card ready to attach are ringed.",
                        caption:
                            "Tap the × beside the instructions to cancel without linking.",
                    },
                    {
                        title: "Check the tinted words",
                        body: (
                            <>
                                The panel closes and the words are tinted in the
                                card’s colour. In the <Ui>Cards</Ui> panel that
                                card now shows what it’s attached to, and a{" "}
                                <Ui>Detach</Ui> button removes the link.
                            </>
                        ),
                        shot: "link-phone-done",
                        alt: "A phone screen with the linked words tinted yellow, ringed.",
                    },
                ],
            },
        ],
    },
    {
        slug: "focus-mode",
        title: "Focus mode",
        icon: Focus,
        summary:
            "Hide everything but your words, then bring the tools back when you’re done.",
        about: (
            <>
                Focus mode clears the screen so only your text remains. The top
                bar, the tools bar and the cards disappear (they are only
                hidden, nothing is lost). If <Ui>Paragraph highlighting</Ui> is
                on, every paragraph except the one you are typing in fades, so
                your eyes stay on the current thought.
            </>
        ),
        sections: [
            {
                title: "Turn focus mode on",
                steps: [
                    {
                        title: "Click Enter focus mode",
                        body: (
                            <>
                                Click the focus icon at the top-right of the
                                document. The screen clears and only your text
                                is left.
                            </>
                        ),
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        Shortcut: <Key>Ctrl</Key>+
                                        <Key>Shift</Key>+<Key>F</Key> (on a Mac,{" "}
                                        <Key>⌘</Key>+<Key>Shift</Key>+
                                        <Key>F</Key>) turns focus mode on and
                                        off.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "Keep writing",
                        body: (
                            <>
                                For a couple of seconds a small{" "}
                                <Ui>× Exit focus mode</Ui> button shows at the
                                top centre, then it fades away. The paragraph
                                you are in stays dark and the rest fade.
                            </>
                        ),
                        shot: "focus-on",
                        alt: "Focus mode: only the text is left, the first paragraph dark and the rest faded. The Exit focus mode button at the top is ringed.",
                        caption:
                            "The faded paragraphs come from Paragraph highlighting (see below).",
                    },
                ],
            },
            {
                title: "Leave focus mode",
                steps: [
                    {
                        title: "Point at the top edge, then click Exit",
                        body: (
                            <>
                                Move the pointer up to the very top of the
                                window. <Ui>× Exit focus mode</Ui> appears
                                there; click it. On a touch screen, tap near the
                                top edge to show the button, then tap it.
                            </>
                        ),
                        shot: "focus-hidden",
                        alt: "Focus mode with the button hidden. The strip along the top of the window is ringed.",
                        caption:
                            "The button stays hidden until the pointer comes near the top.",
                        notes: [
                            {
                                kind: "result",
                                text: (
                                    <>
                                        The top bar, tools bar and cards come
                                        back, and a short message says{" "}
                                        <Ui>Focus mode is off.</Ui>
                                    </>
                                ),
                            },
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        Faster: press <Key>Esc</Key>, or the
                                        same <Key>Ctrl</Key>+<Key>Shift</Key>+
                                        <Key>F</Key> shortcut.
                                    </>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                title: "Choose whether other paragraphs fade",
                steps: [
                    {
                        title: "Open Settings › Writing",
                        body: (
                            <>
                                Go to{" "}
                                <Link href="/settings#writing">Settings</Link>{" "}
                                and choose <Ui>Writing</Ui>. The first switch,{" "}
                                <Ui>Paragraph highlighting</Ui>, controls the
                                fading. When the switch is green (to the right),
                                other paragraphs fade; when it’s grey (to the
                                left), every paragraph stays fully dark in focus
                                mode.
                            </>
                        ),
                        shot: "settings-writing",
                        alt: "Writing settings with the Paragraph highlighting switch row ringed.",
                        caption:
                            "Click the switch to flip it. It saves straight away.",
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
            "Work through one goal at a time, save drafts, compare them and go back if needed.",
        about: (
            <>
                A revision is one pass over your whole draft with a single goal,
                such as “Improve the introduction”. When you start one, Writely
                keeps a draft named <Ui>Before revision: …</Ui>, so you can see
                exactly what this pass changed and restore the starting text if
                you don’t like it. Three tools work together: <Ui>Checklist</Ui>{" "}
                holds your goals, <Ui>Drafts</Ui> holds saved versions, and the
                comparison shows the difference between two versions.
            </>
        ),
        sections: [
            {
                title: "Start a revision",
                steps: [
                    {
                        title: "Click Checklist in the tools bar",
                        body: (
                            <>
                                <Ui>Checklist</Ui> is the third button in the
                                tools bar. The numbers beside it (for example{" "}
                                <Ui>0/3</Ui>) show how many goals are done.
                                Click it to open your goals.
                            </>
                        ),
                        shot: "revise-open",
                        alt: "The tools bar with the Checklist button ringed.",
                    },
                    {
                        title: "Click the goal you want to work on",
                        body: (
                            <>
                                Goals under <Ui>Universal goals</Ui> appear in
                                every document (you set them in Settings). Each
                                unfinished goal says{" "}
                                <Ui>Start revision · saves a starting draft</Ui>{" "}
                                under it. Click the goal’s row once.
                            </>
                        ),
                        shot: "revise-checklist",
                        alt: "The Revision Checklist panel with the first goal, Improve the introduction, ringed.",
                        caption: "Click anywhere on the row, not just the box.",
                    },
                    {
                        title: "Check that the revision started",
                        body: (
                            <>
                                The panel closes and two things appear: a
                                message at the top,{" "}
                                <Ui>
                                    Revision started. Your starting text is kept
                                    in Drafts.
                                </Ui>
                                , and a tinted bar above the tools reading{" "}
                                <Ui>Revising · </Ui>
                                and your goal, with a <Ui>
                                    Finish revision
                                </Ui>{" "}
                                button. Now edit your text as usual; your
                                changes autosave.
                            </>
                        ),
                        caption:
                            "The Revising bar stays until you finish the revision.",
                        notes: [
                            {
                                kind: "missing",
                                text: (
                                    <>
                                        If a message says{" "}
                                        <Ui>
                                            Finish your current revision before
                                            choosing another goal
                                        </Ui>
                                        , you already have a revision open. Only
                                        one runs at a time: finish it first (see
                                        below).
                                    </>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                title: "Add a goal just for this document",
                steps: [
                    {
                        title: "Click + Add goal under “This draft”",
                        body: (
                            <>
                                Open <Ui>Checklist</Ui>. Below the universal
                                goals is a section called <Ui>This draft</Ui>.
                                Click <Ui>+ Add goal</Ui> on its right.
                            </>
                        ),
                        shot: "revise-this-draft",
                        alt: "The bottom of the Revision Checklist panel with the This draft row and its Add goal button.",
                    },
                    {
                        title: "Type the goal and click Add",
                        body: (
                            <>
                                A box called <Ui>Add revision goal</Ui> opens.
                                Type what you want to improve, then click{" "}
                                <Ui>Add</Ui> (it stays grey until you type
                                something). The goal appears under{" "}
                                <Ui>This draft</Ui>; click it to start revising
                                towards it.
                            </>
                        ),
                        shot: "revise-add-goal",
                        alt: "The Add revision goal box with the text field and the Add button ringed.",
                    },
                ],
            },
            {
                title: "Save your work and compare",
                steps: [
                    {
                        title: "Keep an optional milestone in Drafts",
                        body: (
                            <>
                                Your work already autosaves. To keep a separate
                                version, open <Ui>Drafts</Ui> and click{" "}
                                <Ui>Save named draft</Ui>. Or press{" "}
                                <Key>Ctrl</Key>+<Key>S</Key> (<Key>⌘</Key>+
                                <Key>S</Key> on a Mac).
                            </>
                        ),
                    },
                    {
                        title: "Check the name and click Save draft",
                        body: (
                            <>
                                A box called <Ui>Keep this version</Ui> opens.
                                The name is filled in with your goal; change it
                                if you like. Click <Ui>Save draft</Ui> at the
                                bottom-right.
                            </>
                        ),
                        caption:
                            "Saving keeps the editor open and doesn’t end the revision.",
                    },
                    {
                        title: "Open Compare when you want to review changes",
                        body: (
                            <>
                                Open <Ui>Drafts</Ui> and click <Ui>Compare</Ui>{" "}
                                on a version. It opens beside{" "}
                                <Ui>Current writing</Ui> on a computer. Use{" "}
                                <Ui>Version</Ui> and <Ui>Compare with</Ui> to
                                change the pair. Small edits highlight changed
                                words. Whole paragraphs use a coloured edge and
                                an Added or Removed label, keeping the text
                                readable. Empty versions are labelled
                                explicitly. Comparing never changes your
                                writing.
                            </>
                        ),
                        caption:
                            "Comparison opens only when you choose Compare.",
                    },
                    {
                        title: "Click ⌄ to jump to the next change",
                        body: (
                            <>
                                At the top-right, the arrows step through the
                                changes: <Ui>⌄</Ui> (<Ui>Next change</Ui>) and{" "}
                                <Ui>⌃</Ui> (<Ui>Previous change</Ui>). Between
                                them you see how many changes there are, then
                                which one you’re on, for example <Ui>2 of 3</Ui>
                                . The current change gets an outline and scrolls
                                to the middle of the page.
                            </>
                        ),
                        notes: [
                            {
                                kind: "result",
                                text: (
                                    <>
                                        If the two versions are identical, the
                                        counter says <Ui>No changes</Ui> and the
                                        page tells you the versions are the
                                        same.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "On a phone, read one text",
                        body: (
                            <>
                                Phone screens show a single text instead of two
                                columns. Each removal comes straight before the
                                words that replaced it (green), so you read the
                                change in place. The same arrows at the top step
                                through the changes, and the colour key sits
                                just under the menus.
                            </>
                        ),
                        caption:
                            "The ← at the top-left goes back to your text, like Continue editing.",
                    },
                    {
                        title: "Restore a version if you need to (optional)",
                        body: (
                            <>
                                <Ui>Restore this version</Ui> replaces your
                                current writing with the saved draft identified
                                in the bottom bar. To return to the start of a
                                revision, choose its <Ui>Before revision: …</Ui>{" "}
                                draft in
                                <Ui>Version</Ui> and keep{" "}
                                <Ui>Current writing</Ui> under{" "}
                                <Ui>Compare with</Ui>. A box asks you to
                                confirm: click <Ui>Preserve &amp; restore</Ui>.
                                Your current text is kept as a labelled restore
                                backup first, and a message confirms{" "}
                                <Ui>Draft restored</Ui>.
                            </>
                        ),
                        notes: [
                            {
                                kind: "missing",
                                text: (
                                    <>
                                        The button is greyed out if no saved
                                        draft is selected, or the selected draft
                                        already matches your current writing.
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "Click Continue editing",
                        body: (
                            <>
                                <Ui>Continue editing</Ui> (bottom-right) takes
                                you back to your text. Pressing <Key>Esc</Key>{" "}
                                does the same.
                            </>
                        ),
                    },
                ],
            },
            {
                title: "Finish the revision",
                steps: [
                    {
                        title: "Click Finish revision",
                        body: (
                            <>
                                When the goal is done, click{" "}
                                <Ui>Finish revision</Ui>, the dark button with a
                                tick at the right of the Revising bar.
                            </>
                        ),
                        notes: [
                            {
                                kind: "result",
                                text: (
                                    <>
                                        The Revising bar disappears and a
                                        message says{" "}
                                        <Ui>
                                            Revision complete. Goal marked done;
                                            no new draft created.
                                        </Ui>
                                    </>
                                ),
                            },
                        ],
                    },
                    {
                        title: "See the goal ticked in Checklist",
                        body: (
                            <>
                                Open <Ui>Checklist</Ui>: the goal now has a
                                green tick and says{" "}
                                <Ui>Revise again · saves a starting draft</Ui>,
                                and the count in the tools bar goes up by one.
                                Click the goal again any time to do another
                                pass.
                            </>
                        ),
                    },
                ],
            },
            {
                title: "Use Drafts at any time",
                steps: [
                    {
                        title: "Click Drafts in the tools bar",
                        body: (
                            <>
                                <Ui>Drafts</Ui> lists every saved version,
                                newest first, with its date and time. Click{" "}
                                <Ui>Save named draft</Ui> to keep the current
                                text as a version (you don’t need a revision for
                                this). Click <Ui>Compare</Ui> on any version to
                                see how it differs.
                            </>
                        ),
                        caption:
                            "Revision starting points and restore backups are labelled in the list.",
                        notes: [
                            {
                                kind: "tip",
                                text: (
                                    <>
                                        The <Ui>⋯</Ui> beside each version has{" "}
                                        <Ui>Rename</Ui>, <Ui>Restore</Ui> and{" "}
                                        <Ui>Delete</Ui>. Restore asks first,
                                        then saves your current text as a
                                        version before bringing the old one back
                                        (<Ui>Preserve &amp; restore</Ui>).
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
        slug: "settings",
        title: "Settings",
        icon: Settings,
        summary:
            "Change how the page looks, how typing feels, export options and your goals.",
        about: (
            <>
                Settings change Writely for every document at once. There is no
                Save button: each change applies the moment you make it and is
                remembered on your account, so it follows you to other devices.
            </>
        ),
        sections: [
            {
                title: "Open Settings",
                steps: [
                    {
                        title: "Click the gear at the top-right of the library",
                        body: (
                            <>
                                In your library, the <Ui>gear</Ui> icon is at
                                the far right of the top bar. Click it. (In a
                                document, first click <Ui>← Documents</Ui> to
                                get back to the library.)
                            </>
                        ),
                        shot: "settings-open",
                        alt: "The right end of the library’s top bar with the gear icon ringed.",
                    },
                    {
                        title: "Choose a section on the left",
                        body: (
                            <>
                                The left column lists the sections. Click one to
                                show its settings on the right. Each white row
                                is one setting: the name on the left, the
                                choices on the right. Click a choice; the
                                highlighted one is the current setting.
                            </>
                        ),
                        shot: "settings-page",
                        alt: "The Settings page. The list of sections and the Theme row are ringed.",
                        caption:
                            "Appearance opens first. The Theme row switches between light and dark.",
                    },
                ],
            },
            {
                title: "Settings on a phone",
                steps: [
                    {
                        title: "Tap a section in the list",
                        body: (
                            <>
                                On a phone, Settings opens as a list. Tap a row
                                (for example <Ui>Appearance</Ui>) to open it.
                            </>
                        ),
                        shot: "settings-phone",
                        alt: "The Settings list on a phone with the Appearance row ringed.",
                    },
                    {
                        title: "Tap ‹ Settings to go back",
                        body: (
                            <>
                                The section fills the screen. Make your changes,
                                then tap <Ui>‹ Settings</Ui> at the top-left (or
                                use your phone’s back gesture) to return to the
                                list.
                            </>
                        ),
                        shot: "settings-phone-section",
                        alt: "The Appearance section on a phone with the Settings back button ringed.",
                    },
                ],
            },
            {
                title: "What each section holds",
                steps: [
                    {
                        title: "Appearance",
                        body: (
                            <>
                                <Ui>Theme</Ui> (Light, Dark, or System to follow
                                your device), <Ui>Font</Ui>, <Ui>Font size</Ui>{" "}
                                (drag the slider; the sample below it shows the
                                result), <Ui>Line spacing</Ui>,{" "}
                                <Ui>Paragraph spacing</Ui> and{" "}
                                <Ui>Editor width</Ui>.
                            </>
                        ),
                    },
                    {
                        title: "Writing",
                        body: (
                            <>
                                Four switches: <Ui>Paragraph highlighting</Ui>{" "}
                                (fades other paragraphs),{" "}
                                <Ui>Typewriter scrolling</Ui> (keeps the line
                                you’re typing near the middle of the screen),{" "}
                                <Ui>Smart punctuation</Ui> (curly quotes and
                                dashes) and <Ui>Check spelling</Ui>. Green and
                                to the right means on.
                            </>
                        ),
                    },
                    {
                        title: "Revision checklist",
                        body: (
                            <>
                                Your universal goals, the ones every document’s
                                checklist starts with. Click <Ui>+ Add goal</Ui>{" "}
                                at the top-right to add one; use the pencil to
                                reword a goal and the bin to remove it.
                            </>
                        ),
                        shot: "settings-goals",
                        alt: "The Revision checklist settings with the Add goal button ringed.",
                    },
                    {
                        title: "Document export, shortcuts, help and account",
                        body: (
                            <>
                                <Ui>Document export</Ui> sets up Word and PDF
                                files (see{" "}
                                <Link href="/help/export">Export</Link>).{" "}
                                <Ui>Keyboard shortcuts</Ui> lists every
                                shortcut. <Ui>Help</Ui> brings you to these
                                guides. <Ui>Account</Ui> shows your name and
                                email and has <Ui>Log out</Ui> and{" "}
                                <Ui>Delete account</Ui>.
                            </>
                        ),
                    },
                ],
            },
        ],
    },
    {
        slug: "export",
        title: "Export",
        icon: FileDown,
        summary:
            "Download a document as a Word file or a PDF, and choose how it looks.",
        about: (
            <>
                Export makes a copy of a document as a Word file (.docx) or a
                PDF to send, print or submit. The file contains your text and
                its formatting only, with no thought cards, links or checklists.
                Your document in Writely doesn’t change.
            </>
        ),
        sections: [
            {
                title: "Export a document",
                steps: [
                    {
                        title: "Open the document menu",
                        body: (
                            <>
                                In your document library, open the three-dot
                                menu for the document you want to export.
                            </>
                        ),
                    },
                    {
                        title: "Choose an export format",
                        body: (
                            <>
                                Choose <Ui>Export</Ui>, then{" "}
                                <Ui>Word (.docx)</Ui> or <Ui>PDF (.pdf)</Ui>.
                                Your browser downloads the file.
                            </>
                        ),
                    },
                ],
            },
            {
                title: "Choose how exports look",
                steps: [
                    {
                        title: "Open Settings › Document export",
                        body: (
                            <>
                                Go to{" "}
                                <Link href="/settings#export">Settings</Link>{" "}
                                and choose <Ui>Document export</Ui>.{" "}
                                <Ui>Paper size</Ui> picks A4 or US Letter.{" "}
                                <Ui>Font</Ui> picks Sans-serif, Serif, or{" "}
                                <Ui>Match editor</Ui> to use your writing font.
                                Turn on <Ui>Start with the title</Ui> to print
                                the title at the top, unless your text already
                                starts with it.
                            </>
                        ),
                        shot: "export-settings",
                        alt: "Document export settings with the Paper size row and the Start with the title switch ringed.",
                        caption: "These apply to every export from now on.",
                    },
                ],
            },
        ],
    },
];

export const guideBySlug = (slug: string) =>
    GUIDES.find((guide) => guide.slug === slug);
