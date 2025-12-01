import { Link } from "wouter";
import { ArrowLeft, Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { useEffect } from "react";

const BRAND_NAME = "Scholar AI Advisor";
const COMPANY_LEGAL_NAME = "Referral Service LLC";
const MAIN_SITE_URL = "https://scholaraiadvisor.com";
const APP_NAME = "student_pilot";
const APP_BASE_URL = "https://student-pilot-jamarrlmayes.replit.app";
const CONTACT_EMAIL = "support@referralsvc.com";
const CONTACT_PHONE = "602-796-0177";
const CONTACT_ADDRESS = "16031 N 171st Ln, Surprise, AZ 85388, USA";
const COPYRIGHT_LINE = "© 2025 Referral Service LLC. All rights reserved.";
const EFFECTIVE_DATE = new Date().toISOString().split('T')[0];

function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": COMPANY_LEGAL_NAME,
    "alternateName": BRAND_NAME,
    "url": MAIN_SITE_URL,
    "email": CONTACT_EMAIL,
    "telephone": CONTACT_PHONE,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "16031 N 171st Ln",
      "addressLocality": "Surprise",
      "addressRegion": "AZ",
      "postalCode": "85388",
      "addressCountry": "USA"
    },
    "sameAs": [MAIN_SITE_URL]
  };
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function LegalPageLayout({ 
  title, 
  metaDescription, 
  children 
}: { 
  title: string; 
  metaDescription: string; 
  children: React.ReactNode 
}) {
  useEffect(() => {
    document.title = `${title} | ${BRAND_NAME} – ${APP_NAME}`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', metaDescription);
    
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${APP_BASE_URL}${window.location.pathname}`);
  }, [title, metaDescription]);
  
  return (
    <div className="min-h-screen bg-background">
      <OrganizationJsonLd />
      
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded z-50">
        Skip to main content
      </a>
      
      <nav className="bg-surface shadow-sm border-b" role="navigation" aria-label="Legal page navigation">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center text-primary hover:text-primary/80 transition-colors" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Back to {BRAND_NAME}
          </Link>
        </div>
      </nav>
      
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8" role="main">
        {children}
      </main>
      
      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <a 
              href={MAIN_SITE_URL} 
              className="text-xl font-bold text-white hover:text-primary transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-brand"
            >
              {BRAND_NAME}
            </a>
            <p className="mt-2 text-sm">{COMPANY_LEGAL_NAME}</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{CONTACT_ADDRESS}</span>
              </div>
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 flex-shrink-0" aria-hidden="true" />
                <a 
                  href={`mailto:${CONTACT_EMAIL}`} 
                  className="hover:text-white transition-colors"
                  data-testid="link-email"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 flex-shrink-0" aria-hidden="true" />
                <a 
                  href={`tel:${CONTACT_PHONE}`} 
                  className="hover:text-white transition-colors"
                  data-testid="link-phone"
                >
                  {CONTACT_PHONE}
                </a>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <nav aria-label="Legal links">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors" data-testid="link-privacy">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors" data-testid="link-terms">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/accessibility" className="hover:text-white transition-colors" data-testid="link-accessibility">
                    Accessibility Statement
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <nav aria-label="Quick links">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/dashboard" className="hover:text-white transition-colors" data-testid="link-dashboard">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/scholarships" className="hover:text-white transition-colors" data-testid="link-scholarships">
                    Find Scholarships
                  </Link>
                </li>
                <li>
                  <a 
                    href={MAIN_SITE_URL} 
                    className="hover:text-white transition-colors inline-flex items-center"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-main-site"
                  >
                    Main Site <ExternalLink className="w-3 h-3 ml-1" aria-hidden="true" />
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>{COPYRIGHT_LINE}</p>
        </div>
      </div>
    </footer>
  );
}

export function ReportBrandingFooter({ className = "" }: { className?: string }) {
  return (
    <div className={`text-[10px] md:text-[11px] text-gray-500 border-t pt-2 mt-4 ${className}`} data-testid="report-branding">
      <p>
        This report was generated by {APP_NAME} — {APP_BASE_URL} | {BRAND_NAME} by {COMPANY_LEGAL_NAME} | {CONTACT_EMAIL} | {CONTACT_PHONE}
      </p>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPageLayout 
      title="Privacy Policy" 
      metaDescription={`Privacy Policy for ${BRAND_NAME}. Learn how we collect, use, and protect your personal information when using our scholarship discovery and management platform.`}
    >
      <article className="prose prose-gray max-w-none" data-testid="privacy-policy-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Effective Date: {EFFECTIVE_DATE}</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Who We Are</h2>
          <p className="text-gray-700">
            {BRAND_NAME} is provided by {COMPANY_LEGAL_NAME} ("we," "us," "our") operating at{" "}
            <a href={MAIN_SITE_URL} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              {MAIN_SITE_URL}
            </a>{" "}
            and this app at {APP_BASE_URL}.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What We Do</h2>
          <p className="text-gray-700">
            We help students and providers discover, manage, and apply for scholarships using AI-enabled tools.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Account and profile data</strong> that users provide (name, email, school/academic info needed for scholarship matching).</li>
            <li><strong>Usage and device data</strong> (log files, cookies, analytics).</li>
            <li><strong>Payment and transaction data</strong> when credits or services are purchased; payments are processed by third-party processors.</li>
            <li><strong>Provider data</strong> submitted to list or manage scholarships.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How We Use Data</h2>
          <p className="text-gray-700">
            To deliver and improve services, personalize recommendations, provide customer support, process transactions, detect/prevent fraud/abuse, maintain security, and comply with law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Legal Bases/Consent</h2>
          <p className="text-gray-700">
            We rely on user consent and legitimate interests; users may withdraw consent where applicable.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cookies/Tracking</h2>
          <p className="text-gray-700">
            We use essential cookies and analytics. Users can control cookies via browser settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Sharing</h2>
          <p className="text-gray-700">
            Service providers (hosting, analytics, payments, email/SMS), compliance with legal requests, mergers/acquisitions. We do not sell personal information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">FERPA/COPPA and Student Privacy</h2>
          <p className="text-gray-700">
            We design for student privacy. We do not knowingly collect personal information from children under 13. Education records are handled in accordance with applicable law and only with appropriate authorization.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Retention</h2>
          <p className="text-gray-700">
            Kept only as long as necessary for the purposes above and to meet legal obligations.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Security</h2>
          <p className="text-gray-700">
            Administrative, technical, and physical safeguards; no system is 100% secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">International Transfers</h2>
          <p className="text-gray-700">
            Where data crosses borders, we use appropriate safeguards as required by law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Rights</h2>
          <p className="text-gray-700">
            Access, correction, deletion, portability, restriction/objection (as applicable). Contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Communications</h2>
          <p className="text-gray-700">
            Users can opt out of non-essential emails/SMS; transactional messages may still occur.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Third-Party Links</h2>
          <p className="text-gray-700">
            We are not responsible for third-party sites' privacy practices.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Changes</h2>
          <p className="text-gray-700">
            We will update this policy as needed and post the new Effective Date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact</h2>
          <address className="not-italic text-gray-700">
            <p>{COMPANY_LEGAL_NAME}</p>
            <p>{CONTACT_ADDRESS}</p>
            <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a></p>
            <p>Phone: <a href={`tel:${CONTACT_PHONE}`} className="text-primary hover:underline">{CONTACT_PHONE}</a></p>
          </address>
        </section>
      </article>
    </LegalPageLayout>
  );
}

export function TermsOfService() {
  return (
    <LegalPageLayout 
      title="Terms of Service" 
      metaDescription={`Terms of Service for ${BRAND_NAME}. Read our terms governing the use of our scholarship discovery, matching, and AI-powered essay assistance platform.`}
    >
      <article className="prose prose-gray max-w-none" data-testid="terms-of-service-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Effective Date: {EFFECTIVE_DATE}</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Agreement</h2>
          <p className="text-gray-700">
            These Terms govern your use of {BRAND_NAME} at{" "}
            <a href={MAIN_SITE_URL} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              {MAIN_SITE_URL}
            </a>{" "}
            and this app at {APP_BASE_URL}. By using the services, you agree to these Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Eligibility and Accounts</h2>
          <p className="text-gray-700">
            You are responsible for your credentials and keeping your account secure. You must be of legal age to form a binding contract or have appropriate consent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Services and AI Assistance</h2>
          <p className="text-gray-700">
            Our tools provide scholarship discovery, matching, content drafting, and workflow support. AI outputs may contain errors; review and verify before submitting applications. Do not use the services to cheat or commit academic misconduct.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Content and Licenses</h2>
          <p className="text-gray-700">
            You retain your content. You grant us a limited license to host/process your content solely to provide the services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Providers</h2>
          <p className="text-gray-700">
            Providers submitting scholarships represent they have rights to publish the content and consent to display it. Platform fees may apply.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payments</h2>
          <p className="text-gray-700">
            Prices, credits, and fees are shown at purchase. Taxes may apply. All sales are subject to our refund policy if provided in the app.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Prohibited Uses</h2>
          <p className="text-gray-700">
            Abuse, reverse engineering, unauthorized scraping, security testing without permission, violating law, infringing IP, or harassing others.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Intellectual Property</h2>
          <p className="text-gray-700">
            {BRAND_NAME} and its software, trademarks, and content are owned by {COMPANY_LEGAL_NAME} or licensors.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Disclaimers</h2>
          <p className="text-gray-700">
            Services are provided "as is" and "as available." We disclaim warranties to the fullest extent permitted by law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
          <p className="text-gray-700">
            To the maximum extent permitted, we are not liable for indirect, incidental, consequential, or special damages. Our aggregate liability is limited to the amounts you paid in the 12 months prior to the claim.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Indemnity</h2>
          <p className="text-gray-700">
            You agree to indemnify us for claims arising from your misuse of the services or violation of these Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Termination</h2>
          <p className="text-gray-700">
            We may suspend or terminate accounts for violations or risks to the platform. You may stop using the services at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Governing Law and Venue</h2>
          <p className="text-gray-700">
            Arizona law governs. Venue lies in Maricopa County, Arizona. If we offer arbitration terms, they will be presented separately.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Changes</h2>
          <p className="text-gray-700">
            We may update these Terms and will post the new Effective Date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact</h2>
          <address className="not-italic text-gray-700">
            <p>{COMPANY_LEGAL_NAME}</p>
            <p>{CONTACT_ADDRESS}</p>
            <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a></p>
            <p>Phone: <a href={`tel:${CONTACT_PHONE}`} className="text-primary hover:underline">{CONTACT_PHONE}</a></p>
          </address>
        </section>
      </article>
    </LegalPageLayout>
  );
}

export function AccessibilityStatement() {
  return (
    <LegalPageLayout 
      title="Accessibility Statement" 
      metaDescription={`Accessibility Statement for ${BRAND_NAME}. Learn about our commitment to digital accessibility and how to report accessibility issues.`}
    >
      <article className="prose prose-gray max-w-none" data-testid="accessibility-statement-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Accessibility Statement</h1>
        <p className="text-gray-600 mb-8">Effective Date: {EFFECTIVE_DATE}</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Our Commitment</h2>
          <p className="text-gray-700">
            {COMPANY_LEGAL_NAME} is committed to digital accessibility for all users. Our goal is WCAG 2.1 AA conformance across{" "}
            <a href={MAIN_SITE_URL} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              {MAIN_SITE_URL}
            </a>{" "}
            and this app at {APP_BASE_URL}.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Measures We Take</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Semantic HTML</li>
            <li>Keyboard navigation</li>
            <li>Sufficient color contrast</li>
            <li>Descriptive links and alt text</li>
            <li>Focus management</li>
            <li>Captions and transcripts where applicable</li>
            <li>Regular audits</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Known Limitations</h2>
          <p className="text-gray-700">
            If any part of the service is not fully accessible, we will work to remediate promptly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Feedback and Requests</h2>
          <p className="text-gray-700">
            If you encounter accessibility barriers or need an accommodation, contact{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>{" "}
            or{" "}
            <a href={`tel:${CONTACT_PHONE}`} className="text-primary hover:underline">{CONTACT_PHONE}</a>.
            Please include the page URL and a description of the issue.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assessment</h2>
          <p className="text-gray-700">
            We use automated and manual testing and train staff on accessibility best practices.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Continuous Improvement</h2>
          <p className="text-gray-700">
            We review this statement regularly and update the Effective Date when changes occur.
          </p>
        </section>
      </article>
    </LegalPageLayout>
  );
}
