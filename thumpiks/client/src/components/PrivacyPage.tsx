import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Eye,
  Lock,
  Database,
  Cookie,
  Globe,
  Baby,
  Mail,
  FileText,
} from 'lucide-react';

const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: <Database className="w-6 h-6" />,
      title: 'Information We Collect',
      content: [
        'We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.',
      ],
      subsections: [
        {
          title: 'Personal Information',
          items: [
            'Email address',
            'Name (optional)',
            'Profile information',
            'Payment information (processed securely by third-party providers)',
          ],
        },
        {
          title: 'Usage Information',
          items: [
            'Thumbnails you create and their associated metadata',
            'How you interact with our service',
            'Device and browser information',
            'IP address and location data',
          ],
        },
      ],
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: 'How We Use Your Information',
      content: ['We use the information we collect to:'],
      items: [
        'Provide, maintain, and improve our services',
        'Process transactions and send related information',
        'Send technical notices, updates, and support messages',
        'Respond to your comments, questions, and requests',
        'Monitor and analyze trends and usage',
        'Detect, investigate, and prevent fraudulent transactions',
      ],
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Information Sharing',
      content: [
        'We do not sell, trade, or otherwise transfer your personal information to third parties except as described in this policy.',
      ],
      subtitle: 'We may share information in the following situations:',
      items: [
        'With service providers who assist in our operations',
        'To comply with legal obligations',
        'To protect our rights and prevent fraud',
        'In connection with a business transfer or merger',
        'With your consent',
      ],
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'Data Security',
      content: [
        'We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.',
      ],
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: 'Data Retention',
      content: [
        'We retain your personal information for as long as necessary to provide our services and comply with legal obligations. You can delete your account at any time, which will remove your personal information from our systems.',
      ],
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Your Rights',
      content: [
        'Depending on your location, you may have the following rights:',
      ],
      items: [
        'Access to your personal information',
        'Correction of inaccurate information',
        'Deletion of your personal information',
        'Portability of your data',
        'Objection to processing',
        'Restriction of processing',
      ],
    },
    {
      icon: <Cookie className="w-6 h-6" />,
      title: 'Cookies and Tracking',
      content: [
        'We use cookies and similar tracking technologies to track activity on our service and collect certain information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent.',
      ],
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Third-Party Services',
      content: [
        'Our service may contain links to third-party websites or services that are not owned or controlled by us. We are not responsible for the privacy practices of these third parties.',
      ],
    },
    {
      icon: <Baby className="w-6 h-6" />,
      title: "Children's Privacy",
      content: [
        'Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.',
      ],
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'International Data Transfers',
      content: [
        'Your information may be transferred to and maintained on computers located outside of your jurisdiction where privacy laws may differ.',
      ],
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Changes to This Policy',
      content: [
        'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.',
      ],
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Contact Us',
      content: [
        'If you have any questions about this Privacy Policy, please contact us at privacy@thumpiks.com.',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
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
              className="hidden sm:inline-flex text-gray-400 hover:text-white transition-colors"
            >
              Back to Home
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-6 py-2 rounded-lg transition-colors text-sm sm:text-base"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 mb-8">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm">Your privacy matters to us</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-light mb-6">
            Privacy
            <br />
            <span className="text-blue-500">Policy</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-400 mb-4">
            Learn how we collect, use, and protect your personal information
            <br className="hidden sm:block" />
            when you use ThumPiks.
          </p>
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </section>

      {/* Privacy Sections */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <div
                key={index}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 sm:p-8 hover:border-blue-600/50 transition-colors"
              >
                <div className="flex items-center gap-3 sm:gap-4 mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 shrink-0">
                    {section.icon}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold">
                    {index + 1}. {section.title}
                  </h2>
                </div>

                <div className="space-y-4 ml-0 sm:ml-16">
                  {section.content.map((text, i) => (
                    <p key={i} className="text-gray-400 leading-relaxed">
                      {text}
                    </p>
                  ))}

                  {section.subtitle && (
                    <p className="text-gray-300 font-medium mt-4">
                      {section.subtitle}
                    </p>
                  )}

                  {section.items && (
                    <ul className="space-y-3 mt-4">
                      {section.items.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-gray-400"
                        >
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.subsections &&
                    section.subsections.map((sub, subIndex) => (
                      <div key={subIndex} className="mt-6">
                        <h3 className="text-lg font-medium text-gray-300 mb-3">
                          {sub.title}
                        </h3>
                        <ul className="space-y-3">
                          {sub.items.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-gray-400"
                            >
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/50 rounded-3xl p-6 sm:p-16 text-center">
            <h2 className="text-3xl sm:text-5xl font-light mb-6">
              Have Questions About
              <br />
              <span className="text-blue-500">Your Privacy?</span>
            </h2>
            <p className="text-gray-300 text-lg mb-10">
              We're here to help. Reach out to our team anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/contact')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Contact Us
              </button>
              <button
                onClick={() => navigate('/terms')}
                className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Terms of Service
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              We typically respond within 24 hours
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>
            © {new Date().getFullYear()} ThumPiks LLC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPage;
