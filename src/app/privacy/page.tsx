import type { Metadata } from "next";
import {
    CONTACT_EMAIL,
    LegalPage,
} from "~/app/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy · Writely" };

export default function PrivacyPage() {
    return (
        <LegalPage title="Privacy Policy" updated="30 October 2026">
            <p>
                Writely is a writing app. This page explains what information it
                keeps and what it does with it.
            </p>

            <h2>What we collect</h2>
            <ul>
                <li>
                    <strong>Your Google account basics.</strong> When you sign
                    in with Google, we receive your name, email address and
                    profile picture. We ask for nothing else from your Google
                    account: no contacts, no Drive files, no calendar.
                </li>
                <li>
                    <strong>What you write.</strong> Your documents, drafts,
                    notes, and your settings and preferences.
                </li>
                <li>
                    <strong>Feedback you send.</strong> If you send us feedback,
                    we keep the message.
                </li>
            </ul>

            <h2>How we use it</h2>
            <p>
                We use this information only to run Writely: to sign you in, to
                save and show your writing, and to answer feedback. We do not
                use your writing for advertising, and we do not sell it.
            </p>

            <h2>Google user data</h2>
            <p>
                Writely’s use of information received from Google APIs adheres
                to the Google API Services User Data Policy, including the
                Limited Use requirements. Your Google name, email and picture
                are used only to identify your account inside Writely. They are
                not shared with anyone else, used for advertising, or used to
                train AI models.
            </p>

            <h2>Cookies</h2>
            <p>
                We use a single sign-in cookie to keep you logged in, and your
                browser’s local storage for display preferences. We use no
                advertising or tracking cookies.
            </p>

            <h2>Sharing</h2>
            <p>
                We do not share your information with third parties, except the
                hosting and database providers that store it on our behalf, or
                when the law requires it.
            </p>

            <h2>Keeping and deleting your data</h2>
            <p>
                Your writing stays until you delete it. You can delete your
                account in Settings, which removes your account and all of your
                writing. You can also export your documents at any time.
            </p>

            <h2>Children</h2>
            <p>Writely is not meant for children under 13.</p>

            <h2>Changes</h2>
            <p>
                If this policy changes, we will update the date at the top of
                this page.
            </p>

            <h2>Contact</h2>
            <p>
                Questions about privacy:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent">
                    {CONTACT_EMAIL}
                </a>
                .
            </p>
        </LegalPage>
    );
}
