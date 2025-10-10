import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPage: React.FC = () => {
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
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-lg mx-auto dark:prose-invert">
          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.
          </p>
          
          <h3>Personal Information</h3>
          <ul>
            <li>Email address</li>
            <li>Name (optional)</li>
            <li>Profile information</li>
            <li>Payment information (processed securely by third-party providers)</li>
          </ul>

          <h3>Usage Information</h3>
          <ul>
            <li>Thumbnails you create and their associated metadata</li>
            <li>How you interact with our service</li>
            <li>Device and browser information</li>
            <li>IP address and location data</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices, updates, and support messages</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Monitor and analyze trends and usage</li>
            <li>Detect, investigate, and prevent fraudulent transactions</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>
            We do not sell, trade, or otherwise transfer your personal information to third parties except as described in this policy.
          </p>

          <h3>We may share information in the following situations:</h3>
          <ul>
            <li>With service providers who assist in our operations</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and prevent fraud</li>
            <li>In connection with a business transfer or merger</li>
            <li>With your consent</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to provide our services and comply with legal obligations. You can delete your account at any time, which will remove your personal information from our systems.
          </p>

          <h2>6. Your Rights</h2>
          <p>Depending on your location, you may have the following rights:</p>
          <ul>
            <li>Access to your personal information</li>
            <li>Correction of inaccurate information</li>
            <li>Deletion of your personal information</li>
            <li>Portability of your data</li>
            <li>Objection to processing</li>
            <li>Restriction of processing</li>
          </ul>

          <h2>7. Cookies and Tracking</h2>
          <p>
            We use cookies and similar tracking technologies to track activity on our service and collect certain information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent.
          </p>

          <h2>8. Third-Party Services</h2>
          <p>
            Our service may contain links to third-party websites or services that are not owned or controlled by us. We are not responsible for the privacy practices of these third parties.
          </p>

          <h2>9. Children's Privacy</h2>
          <p>
            Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
          </p>

          <h2>10. International Data Transfers</h2>
          <p>
            Your information may be transferred to and maintained on computers located outside of your jurisdiction where privacy laws may differ.
          </p>

          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
          </p>

          <h2>12. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at privacy@thumbnailmaker.com.
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
            onClick={() => navigate('/terms')}
            className="border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 px-6 py-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Terms of Service
          </button>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;