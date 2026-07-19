import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MapPin, Send } from 'lucide-react';
import Tooltip from './ui/Tooltip';
import { API_BASE_URL } from '../config/environment';

const ContactPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formLoadTime] = useState<number>(Date.now());
  const [honeypot, setHoneypot] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          honeypot: honeypot,
          formLoadTime: formLoadTime,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error('Contact form error:', err);
      setError('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (submitted) {
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

        {/* Success Content */}
        <section className="pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-600/20 border border-green-600/30 rounded-full flex items-center justify-center mx-auto mb-8">
              <Send className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-light mb-6">
              Message <span className="text-blue-500">Sent!</span>
            </h1>
            <p className="text-base sm:text-xl text-gray-400 mb-8 sm:mb-10">
              Thank you for contacting us. We'll get back to you within 24
              hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Back to Home
              </button>
              <button
                onClick={() => setSubmitted(false)}
                className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Send Another Message
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-12 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
            <p>
              &copy; {new Date().getFullYear()} ThumPiks LLC. All rights
              reserved.
            </p>
          </div>
        </footer>
      </div>
    );
  }

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
            <Mail className="w-4 h-4 text-blue-500" />
            <span className="text-sm">We're here to help</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-light mb-6">
            Get in Touch
            <br />
            <span className="text-blue-500">With Us</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-400 mb-8 sm:mb-10">
            Have questions, feedback, or need support?
            <br />
            We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Contact Info Cards */}
            <div className="space-y-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 sm:p-8 hover:border-blue-600/50 transition-colors">
                <Tooltip content="Email us" side="top">
                  <div className="w-14 h-14 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 mb-6">
                    <Mail className="w-7 h-7" />
                  </div>
                </Tooltip>
                <h3 className="text-xl font-semibold mb-2">Email Us</h3>
                <p className="text-gray-400 mb-3">Send us an email anytime</p>
                <a
                  href="mailto:contact@thumpiks.com"
                  className="text-blue-500 hover:text-blue-400 transition-colors"
                >
                  contact@thumpiks.com
                </a>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 sm:p-8 hover:border-blue-600/50 transition-colors">
                <Tooltip content="Our office location" side="top">
                  <div className="w-14 h-14 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 mb-6">
                    <MapPin className="w-7 h-7" />
                  </div>
                </Tooltip>
                <h3 className="text-xl font-semibold mb-2">Office</h3>
                <p className="text-gray-400 mb-3">Visit us anytime</p>
                <span className="text-gray-300">Honolulu, HI</span>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 sm:p-8 lg:p-12">
                <h2 className="text-2xl font-semibold mb-8">Send a Message</h2>

                {error && (
                  <div className="mb-6 p-4 bg-red-600/10 border border-red-600/30 rounded-xl">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Honeypot field - hidden from users, visible to bots */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-9999px',
                      opacity: 0,
                    }}
                  >
                    <label htmlFor="website_url">Website URL</label>
                    <input
                      type="text"
                      id="website_url"
                      name="website_url"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={e => setHoneypot(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-400 mb-2"
                      >
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-400 mb-2"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-gray-400 mb-2"
                    >
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-600 transition-colors"
                    >
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="billing">Billing Question</option>
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-400 mb-2"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us how we can help you..."
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed px-8 py-4 rounded-xl text-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/50 rounded-3xl p-6 sm:p-16 text-center">
            <h2 className="text-3xl sm:text-5xl font-light mb-6">
              Ready to Create
              <br />
              <span className="text-blue-500">Amazing Thumbnails?</span>
            </h2>
            <p className="text-gray-300 text-lg mb-10">
              Be among the first creators to try ThumPiks — early access is open
              now
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                View Pricing
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              No credit card required • 14-day free trial
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>
            &copy; {new Date().getFullYear()} ThumPiks LLC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
