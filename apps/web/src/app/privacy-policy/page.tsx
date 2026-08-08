import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | SMCore Discord Bot',
  description: 'Privacy Policy for SMCore Discord Bot & Management Dashboard',
};

export default function PrivacyPolicyPage() {
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
            <Lock className="w-8 h-8 text-emerald-400" /> Privacy Policy
          </h1>
          <p className="text-sm text-gray-400">
            Last Updated: August 9, 2026 • Learn how SMCore collects, uses, and safeguards your data.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-10 space-y-8 shadow-xl">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">1.</span> Information We Collect
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              SMCore collects minimal data required for operating server role verification pipelines:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-300 space-y-1 pl-2">
              <li>Discord User ID, Username, and Discriminator/Tag</li>
              <li>Server Role IDs and Guild Configurations</li>
              <li>Submitted In-Game Name (IGN), In-Game ID, and Rank Level</li>
              <li>Optional Screenshot Proof URLs submitted during role verification</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">2.</span> How We Use Your Data
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Collected information is strictly used to:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-300 space-y-1 pl-2">
              <li>Process and present role verification requests to server staff</li>
              <li>Assign verified Discord roles upon staff approval</li>
              <li>Update server nicknames according to guild settings</li>
              <li>Maintain server audit logs and blacklist enforcement against spammers</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">3.</span> Data Sharing & Third Parties
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              We do <strong>NOT</strong> sell, trade, or share your personal data with third-party advertisers or external marketing companies. All data remains strictly within SMCore database storage to service your Discord server.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">4.</span> Data Security & Storage
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Data is stored securely in encrypted PostgreSQL database storage behind authenticated APIs. Access to review role applications is restricted solely to authorized server staff members holding designated staff role permissions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">5.</span> Data Retention & Right to Deletion
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Users or server owners may request data deletion or removal of their application records by contacting server administrators or purging historical application logs via the Dashboard settings.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-gray-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">6.</span> Policy Updates
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              We may update this Privacy Policy periodically. Continued use of SMCore services following updates constitutes acceptance of the revised policy.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-4">
          © 2026 SMCore Management System. All rights reserved. •{' '}
          <Link href="/terms-of-service" className="text-purple-400 hover:underline">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
