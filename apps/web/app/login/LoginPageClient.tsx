'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Discord authorization was cancelled or denied. Please try again.',
  invalid_state: 'Session validation failed. This may happen if your session expired. Please try again.',
  missing_params: 'The authorization response from Discord was incomplete. Please try again.',
  auth_failed: 'Discord authentication failed. Please try again or contact support.',
  oauth_config: 'OAuth configuration error. Please contact the administrator.',
  session_expired: 'Your session has expired. Please log in again.',
};

function getErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? 'An authentication error occurred. Please try again.';
}

export default function LoginPageClient() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');
  const errorMessage = getErrorMessage(errorCode);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-2xl border border-border-subtle bg-surface-container shadow-2xl overflow-hidden"
          style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)' }}
        >
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary-light to-transparent" />

          <div className="px-8 pt-10 pb-10">
            {/* Brand mark */}
            <div className="flex flex-col items-center mb-8">
              <div className="mb-5 w-16 h-16 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-primary text-3xl">
                  security
                </span>
              </div>

              <div className="text-center">
                <h1 className="text-2xl font-bold text-on-surface tracking-tight">
                  SMCore
                </h1>
                <p className="mt-1.5 text-sm text-on-surface-variant">
                  Precision Discord Governance
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="mb-7 flex items-center gap-3">
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-xs text-outline font-mono uppercase tracking-widest">
                Secure Access
              </span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>

            {/* Error state */}
            {errorMessage && (
              <div
                className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-lg bg-error/10 border border-error/25 text-sm text-error"
                role="alert"
                aria-live="polite"
              >
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                  error_outline
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Description */}
            <p className="text-center text-sm text-on-surface-variant mb-6 leading-relaxed">
              Connect your Discord account to manage your servers, configure moderation policies,
              and access the SMCore control panel.
            </p>

            {/* Feature bullets */}
            <ul className="mb-8 space-y-2.5" aria-label="Dashboard features">
              {[
                { icon: 'gavel', text: 'Moderation & Case Management' },
                { icon: 'smart_toy', text: 'AutoMod & Anti-Raid Engine' },
                { icon: 'history_edu', text: 'Structured Audit Logs' },
                { icon: 'confirmation_number', text: 'Premium Ticketing System' },
              ].map(({ icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[17px] shrink-0">
                    {icon}
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            {/* Primary CTA */}
            <a
              href="/api/auth/discord"
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-primary hover:bg-primary-dark px-5 py-3.5 font-semibold text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container shadow-lg hover:shadow-primary/25 hover:-translate-y-px active:translate-y-0"
              aria-label="Login with Discord"
              id="login-with-discord"
            >
              {/* Discord logo SVG */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 71 55"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="shrink-0"
              >
                <g clipPath="url(#clip0)">
                  <path
                    d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z"
                    fill="white"
                  />
                </g>
                <defs>
                  <clipPath id="clip0">
                    <rect width="71" height="55" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <span>Login with Discord</span>
              <span
                className="material-symbols-outlined text-[18px] opacity-70 group-hover:translate-x-0.5 transition-transform"
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </a>

            {/* Security note */}
            <p className="mt-5 text-center text-xs text-outline leading-relaxed">
              We only request{' '}
              <span className="text-on-surface-variant font-mono">identify</span> and{' '}
              <span className="text-on-surface-variant font-mono">guilds</span> scopes.
              <br />
              We never access your messages or DMs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-outline">
          SMCore &mdash; Precision Discord Management Platform
        </p>
      </div>
    </div>
  );
}
