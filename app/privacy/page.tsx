import type { Metadata } from "next";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy Policy | ${BRAND.name}`,
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Privacy Policy
          </h1>
          <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink-2">
            <p>
              When you request offers through this site, we collect the
              information you submit — your name, phone number, email address,
              property address, and anything you tell us about the property —
              so we can contact you, evaluate the property, and prepare your
              cash offer and listing net sheet.
            </p>
            <p>
              We do not sell your information. We share it only with service
              providers we use to run this business (such as our database,
              email, and phone providers) and as required by law.
            </p>
            <p>
              By submitting the form, you agree that we may contact you by
              phone, text, or email about your property. You can opt out of
              messages at any time by telling us, replying STOP to a text, or
              using the unsubscribe link in an email.
            </p>
            <p>
              Questions or requests about your data? Contact us at{" "}
              <a
                href={`mailto:${BRAND.email}`}
                className="font-medium text-navy underline underline-offset-2"
              >
                {BRAND.email}
              </a>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
