import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button onClick={() => navigate('/')} className="text-2xl font-bold text-indigo-600">
                ThumbnailMaker
              </button>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => navigate('/login')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-lg mx-auto dark:prose-invert">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using ThumbnailMaker Studio ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily use ThumbnailMaker Studio for personal and commercial purposes. This license shall automatically terminate if you violate any terms and may be terminated by us at any time.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for maintaining the confidentiality of your account.
          </p>

          <h2>4. Content Ownership</h2>
          <p>
            You retain ownership of all content you create using our Service. We do not claim ownership of your thumbnails, designs, or other creative works. However, you grant us a license to use, store, and process your content as necessary to provide the Service.
          </p>

          <h2>5. Prohibited Uses</h2>
          <p>You may not use our Service:</p>
          <ul>
            <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
            <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
            <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
            <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
            <li>To submit false or misleading information</li>
          </ul>

          <h2>6. Service Availability</h2>
          <p>
            We strive to provide continuous service availability but cannot guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue the Service at any time with reasonable notice.
          </p>

          <h2>7. Payment Terms</h2>
          <p>
            Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law. We reserve the right to change our pricing with 30 days notice.
          </p>

          <h2>8. Privacy Policy</h2>
          <p>
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
          </p>

          <h2>9. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            In no event shall ThumbnailMaker Studio, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages.
          </p>

          <h2>11. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
          </p>

          <h2>12. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at contact@thumbnailmaker.com.
          </p>
        </div>

        <div className="text-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <button 
            onClick={() => navigate('/')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 mr-4"
          >
            Back to Home
          </button>
          <button 
            onClick={() => navigate('/privacy')}
            className="border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 px-6 py-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Privacy Policy
          </button>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;