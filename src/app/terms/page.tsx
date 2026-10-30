import type { Metadata } from "next";
import {
    CONTACT_EMAIL,
    LegalPage,
} from "~/app/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service · Writely" };

export default function TermsPage() {
    return (
        <LegalPage title="Terms of Service" updated="30 October 2026">
            <p>
                By using Writely you agree to these terms. If you don’t agree,
                please don’t use it.
            </p>

            <h2>Your account</h2>
            <p>
                You sign in with Google. You are responsible for activity on
                your account and for keeping your Google account secure.
            </p>

            <h2>Your writing</h2>
            <p>
                What you write is yours. We don’t claim any rights to it. You
                give us only the permission needed to store it and show it back
                to you.
            </p>

            <h2>Acceptable use</h2>
            <ul>
                <li>Don’t use Writely for anything unlawful.</li>
                <li>
                    Don’t try to break, overload or gain unauthorised access to
                    the service or other people’s data.
                </li>
                <li>Don’t use it to spread malware or abuse others.</li>
            </ul>

            <h2>Availability and your data</h2>
            <p>
                We work to keep Writely running and your writing safe, but the
                service is provided “as is”, without warranties. We recommend
                exporting copies of anything important.
            </p>

            <h2>Ending your use</h2>
            <p>
                You can stop at any time and delete your account in Settings,
                which removes your writing. We may suspend accounts that break
                these terms.
            </p>

            <h2>Liability</h2>
            <p>
                To the extent the law allows, Writely is not liable for indirect
                or consequential losses arising from your use of the service.
            </p>

            <h2>Changes</h2>
            <p>
                We may update these terms. If we do, we will change the date at
                the top of this page, and continued use means you accept them.
            </p>

            <h2>Contact</h2>
            <p>
                Questions:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent">
                    {CONTACT_EMAIL}
                </a>
                .
            </p>
        </LegalPage>
    );
}
