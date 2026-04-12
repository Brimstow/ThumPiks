import React from 'react';
import { useNavigate } from 'react-router-dom';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="text-2xl font-bold text-indigo-600"
              >
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
            About ThumbnailMaker Studio
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Empowering creators with AI-powered thumbnail generation
          </p>
        </div>

        <div className="prose prose-lg mx-auto dark:prose-invert">
          <h2>Our Mission</h2>
          <p>
            At ThumbnailMaker Studio, we believe that every creator deserves
            professional-quality thumbnails that drive engagement and grow their
            audience. Our AI-powered platform makes it easy to create stunning,
            click-worthy thumbnails in seconds, not hours.
          </p>

          <h2>What We Do</h2>
          <p>
            We provide creators with powerful tools to generate, edit, and
            manage thumbnails for their content. Our platform combines
            artificial intelligence with intuitive design tools to help you
            create thumbnails that stand out and get clicks.
          </p>

          <h2>Key Features</h2>
          <ul>
            <li>
              <strong>AI-Powered Generation:</strong> Create thumbnails from
              simple text prompts
            </li>
            <li>
              <strong>Professional Editing Tools:</strong> Fine-tune your
              thumbnails with advanced editing features
            </li>
            <li>
              <strong>Project Management:</strong> Organize your thumbnails and
              collaborate with team members
            </li>
            <li>
              <strong>Analytics Dashboard:</strong> Track performance and
              optimize your thumbnail strategy
            </li>
            <li>
              <strong>Multi-Platform Sharing:</strong> Share directly to social
              media platforms
            </li>
          </ul>

          <h2>Our Technology</h2>
          <p>
            Built with modern web technologies including React, TypeScript, and
            Node.js, our platform delivers fast, reliable performance. We use
            cutting-edge AI models to generate high-quality thumbnails that
            match your content and style preferences.
          </p>

          <h2>Privacy & Security</h2>
          <p>
            Your content and data are secure with us. We implement
            industry-standard security measures and never share your private
            thumbnails without your explicit permission. All generated content
            remains private to your account.
          </p>

          <h2>Get Started Today</h2>
          <p>
            Ready to create amazing thumbnails? Be among the first creators to
            try ThumPiks — early access is open now. Start growing your audience
            and engagement today.
          </p>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => navigate('/register')}
            className="bg-indigo-600 text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-indigo-700 mr-4"
          >
            Start Creating
          </button>
          <button
            onClick={() => navigate('/')}
            className="border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 px-8 py-3 rounded-md text-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Learn More
          </button>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;
