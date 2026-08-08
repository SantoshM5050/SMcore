import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, FileText } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | SMCore Discord Bot',
  description: 'Terms of Service for SMCore Discord Bot & Management Dashboard',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-purple-600/30">
              S
            </div>
            <span className="font-extrabold text-white text-lg tracking-wider">SMCORE</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-500" /> Terms of Service
          </h1>
          <p className="text-sm text-gray-400">
            Last Updated: August 9, 2026 • Please read these terms carefully before using SMCore services.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-10 space-y-8 shadow-xl">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">1.</span> Acceptance of Terms
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              By adding SMCore Discord Bot to your Discord server or accessing the SMCore Dashboard, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use or add SMCore to your server.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">2.</span> Description of Service
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              SMCore provides gaming server management, automated role application forms, staff approval pipelines, audit logging, and custom panel embed features for Discord servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">3.</span> Discord Terms Compliance
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Users must comply with all official{' '}
              <a
                href="https://discord.com/terms"
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 underline hover:text-purple-300"
              >
                Discord Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="https://discord.com/guidelines"
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 underline hover:text-purple-300"
              >
                Discord Community Guidelines
              </a>
              . Abuse of SMCore to violate Discord policies is strictly prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">4.</span> User Conduct & Misuse
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              You agree not to exploit, spam, attempt unauthorized database access, or use automated scripts to manipulate role request forms or dashboard endpoints. Server administrators reserve the right to blacklist users from role requests at their discretion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">5.</span> Service Availability & Updates
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              SMCore is provided &quot;as is&quot; without warranties of any kind. While we aim for maximum uptime, we do not guarantee uninterrupted operational availability. Features may be updated or modified at any time to improve reliability.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-gray-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">6.</span> Contact & Support
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              If you have any questions regarding these Terms of Service, please contact the SMCore administration team via your server owner dashboard or official support channels.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-4">
          © 2026 SMCore Management System. All rights reserved. •{' '}
          <Link href="/privacy-policy" className="text-purple-400 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
