import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Shield, FileText } from 'lucide-react';

const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: '1. Acceptance of Terms',
      content:
        'By accessing and using ThumPiks ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our Service.',
    },
    {
      title: '2. Use License',
      content:
        'Permission is granted to temporarily use ThumPiks for personal and commercial thumbnail creation purposes. This license shall automatically terminate if you violate any of these restrictions and may be terminated by us at any time.',
    },
    {
      title: '3. User Accounts',
      content:
        'When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for maintaining the confidentiality of your account.',
    },
    {
      title: '4. Content Ownership',
      content:
        'You retain ownership of all thumbnails and content you create using our Service. We do not claim ownership of your creative works. However, you grant us a limited license to process your content as necessary to provide the Service.',
    },
    {
      title: '5. Prohibited Uses',
      content:
        'You may not use our Service for any unlawful purpose, to violate any regulations, to infringe upon intellectual property rights, to harass or discriminate, or to submit false or misleading information.',
      list: [
        'For any unlawful purpose or to solicit others to perform unlawful acts',
        'To violate any international, federal, or state regulations, rules, or laws',
        'To infringe upon or violate our intellectual property rights or the rights of others',
        'To harass, abuse, insult, harm, defame, slander, or discriminate',
        'To submit false or misleading information',
      ],
    },
    {
      title: '6. Service Availability',
      content:
        'We strive to provide continuous service availability but cannot guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue the Service at any time with reasonable notice.',
    },
    {
      title: '7. Payment Terms',
      content:
        'Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law. We reserve the right to change our pricing with 30 days notice.',
    },
    {
      title: '8. Privacy',
      content:
        'Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices regarding your personal data.',
    },
    {
      title: '9. Termination',
      content:
        'We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.',
    },
    {
      title: '10. Limitation of Liability',
      content:
        'In no event shall ThumPiks, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages.',
    },
    {
      title: '11. Changes to Terms',
      content:
        'We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.',
    },
    {
      title: '12. Contact Information',
      content:
        'If you have any questions about these Terms of Service, please contact us at legal@thumpiks.com.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 bg-white rounded"></div>
            <span>ThumPiks</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Back to Home
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 mb-8">
            <Scale className="w-4 h-4 text-blue-500" />
            <span className="text-sm">Legal terms and conditions</span>
          </div>
          <h1 className="text-6xl font-light mb-6">
            Terms of
            <br />
            <span className="text-blue-500">Service</span>
          </h1>
          <p className="text-xl text-gray-400 mb-4">
            Please read these terms carefully before using ThumPiks.
            <br />
            Your use of the Service constitutes acceptance of these terms.
          </p>
          <p className="text-sm text-gray-500">
            Last updated:{' '}
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center hover:border-blue-600/50 transition-colors">
              <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 mx-auto mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                You Own Your Content
              </h3>
              <p className="text-gray-400 text-sm">
                All thumbnails you create belong to you. We don't claim
                ownership.
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center hover:border-blue-600/50 transition-colors">
              <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 mx-auto mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Fair Use Required</h3>
              <p className="text-gray-400 text-sm">
                Use ThumPiks responsibly and lawfully for your creative
                projects.
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center hover:border-blue-600/50 transition-colors">
              <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 mx-auto mb-4">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Cancel Anytime</h3>
              <p className="text-gray-400 text-sm">
                No long-term contracts. Cancel your subscription whenever you
                want.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-20 px-6 bg-gray-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <div
                key={index}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 hover:border-gray-700 transition-colors"
              >
                <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  {section.content}
                </p>
                {section.list && (
                  <ul className="space-y-2 mt-4">
                    {section.list.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-gray-400"
                      >
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/50 rounded-3xl p-16 text-center">
            <h2 className="text-5xl font-light mb-6">
              Questions About
              <br />
              <span className="text-blue-500">Our Terms?</span>
            </h2>
            <p className="text-gray-300 text-lg mb-10">
              We're here to help clarify anything you need
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/contact')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Contact Us
              </button>
              <button
                onClick={() => navigate('/privacy')}
                className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>
            © {new Date().getFullYear()} ThumPiks LLC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage;
