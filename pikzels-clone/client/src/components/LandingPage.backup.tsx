import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Gradually adding shadcn components - systematic approach
import { Button, Input, Card, CardHeader, CardBody } from './ui';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [videoLink, setVideoLink] = useState('');
  const [includeFace, setIncludeFace] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [showSignin, setShowSignin] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');

  // FAQ data for the FAQ section
  const faqData = [
    {
      question: 'How can custom AI thumbnails improve my YouTube video views?',
      answer: 'Custom thumbnails grab attention and make your videos stand out. A well-designed thumbnail shows what your video is about and encourages viewers to click.',
    },
    {
      question: 'What file formats does the thumbnail software support?',
      answer: 'Our AI thumbnail generator supports file formats like JPG, PNG, and GIF. This flexibility allows you to upload thumbnails directly to YouTube.',
    },
    {
      question: 'How does the AI suggest thumbnail designs?',
      answer: 'The AI analyzes your video link and key content to recommend thumbnail designs that best capture the essence of your video.',
    }
  ];

  // Thumbnail examples for infinite scroll
  const thumbnailExamples = [
    {
      id: 1,
      src: 'https://picsum.photos/280/160?random=1',
      title: 'How to Master Gaming Skills',
      views: '1.2M',
      category: 'Gaming'
    },
    {
      id: 2,
      src: 'https://picsum.photos/280/160?random=2',
      title: 'Latest Tech Reviews 2024',
      views: '850K',
      category: 'Tech'
    },
    {
      id: 3,
      src: 'https://picsum.photos/280/160?random=3',
      title: 'AI Tools for Creators',
      views: '2.5M',
      category: 'Tech'
    },
    {
      id: 4,
      src: 'https://picsum.photos/280/160?random=4',
      title: 'Learn JavaScript Fast',
      views: '1.8M',
      category: 'Programming'
    },
    {
      id: 5,
      src: 'https://picsum.photos/280/160?random=5',
      title: 'Best Mobile Apps 2024',
      views: '920K',
      category: 'Tech'
    },
    {
      id: 6,
      src: 'https://picsum.photos/280/160?random=6',
      title: 'Top Games This Month',
      views: '3.2M',
      category: 'Gaming'
    },
    {
      id: 7,
      src: 'https://picsum.photos/280/160?random=7',
      title: 'Easy DIY Home Projects',
      views: '940K',
      category: 'DIY'
    },
    {
      id: 8,
      src: 'https://picsum.photos/280/160?random=8',
      title: 'Complete Fitness Guide',
      views: '1.5M',
      category: 'Fitness'
    },
    {
      id: 9,
      src: 'https://picsum.photos/280/160?random=9',
      title: 'Digital Art Masterclass',
      views: '780K',
      category: 'Art'
    },
    {
      id: 10,
      src: 'https://picsum.photos/280/160?random=10',
      title: 'Amazing Travel Destinations',
      views: '1.8M',
      category: 'Travel'
    },
    {
      id: 11,
      src: 'https://picsum.photos/280/160?random=11',
      title: 'Fashion Trends 2024',
      views: '1.1M',
      category: 'Fashion'
    },
    {
      id: 12,
      src: 'https://picsum.photos/280/160?random=12',
      title: 'Photography Basics',
      views: '890K',
      category: 'Photography'
    }
  ];

  const topRowThumbnails = thumbnailExamples.slice(0, 6);
  const bottomRowThumbnails = thumbnailExamples.slice(6);

  const handleGenerateThumbnail = () => {
    if (!videoLink.trim()) {
      alert('Please enter a video link');
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className={`landing-page ${isDarkMode ? 'dark' : ''}`}>
      {/* Navigation Header */}
      <header className="pill-navigation">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-text">ThumbnailMaker</span>
          </div>
          <nav className="pill-nav">
            {['home', 'features', 'pricing', 'faq'].map(item => (
              <button
                key={item}
                className={`pill-nav-item ${activeNavItem === item ? 'active' : ''}`}
                onClick={() => setActiveNavItem(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/register')}
            className="nav-cta"
          >
            Sign Up
          </Button>
        </div>
      </header>

      {/* Hero + Generate Section */}
      <section className="hero-generate-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Create Click-Worthy YouTube Thumbnails in Seconds with AI
          </h1>
          <p className="hero-subtitle">
            Turn any video into a click magnet with thumbnails that grab
            attention and drive views. Our AI YouTube thumbnail maker creates
            professional designs instantly - no design skills needed.
          </p>
          <div className="flex items-center justify-center gap-4 mb-12">
            <button onClick={() => setShowSignup(true)} className="btn-pure-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors">
              Create a free account →
            </button>
            <button className="bg-gray-900 border border-gray-800 px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-700 rounded"></div>
              Watch demo
            </button>
          </div>

          {/* Generate Interface */}
          <div className="generate-interface">
            <div className="generate-options">
              <Button
                variant={includeFace ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setIncludeFace(!includeFace)}
                leftIcon={<span>👤</span>}
                className="option-pill"
              >
                Include face
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<span>👁️</span>}
                className="option-pill"
              >
                See example
              </Button>
            </div>

            <div className="video-input-container">
              <div className="input-icon">🎬</div>
              <Input
                type="text"
                placeholder="Drop link to your YouTube video"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                className="video-link-input"
                size="lg"
                leftIcon={<span>🎬</span>}
              />
              <Button
                onClick={handleGenerateThumbnail}
                variant="primary"
                size="lg"
                className="btn-pure-white px-8 py-4 rounded-lg transition-colors"
              >
                Generate Thumbnail
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Infinite Scroll Gallery */}
      <section className="infinite-scroll-section">
        <h2 className="section-title">
          Discover amazing thumbnails by creators like you.
        </h2>
        
        {/* Top Row - Scrolling Left */}
        <div className="infinite-scroll-row">
          <div className="scroll-track scroll-left">
            {[...topRowThumbnails, ...topRowThumbnails, ...topRowThumbnails].map((thumbnail, index) => (
              <div key={`top-${thumbnail.id}-${index}`} className="scroll-thumbnail-card">
                <div className="thumbnail-container">
                  <img
                    src={thumbnail.src}
                    alt={thumbnail.title}
                    className="scroll-thumbnail-image"
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';
                      target.style.display = 'flex';
                      target.style.alignItems = 'center';
                      target.style.justifyContent = 'center';
                      target.style.color = 'white';
                      target.style.fontSize = '12px';
                      target.style.fontWeight = 'bold';
                      target.textContent = '🎬 ' + thumbnail.title.slice(0, 15) + '...';
                    }}
                  />
                  <div className="thumbnail-text-overlay">
                    <h3 className="thumbnail-overlay-title">{thumbnail.title}</h3>
                    <div className="thumbnail-overlay-stats">
                      <span className="views-badge">{thumbnail.views} views</span>
                      <span className="category-badge">{thumbnail.category}</span>
                    </div>
                  </div>
                  <div className="thumbnail-gradient-overlay"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Bottom Row - Scrolling Right */}
        <div className="infinite-scroll-row">
          <div className="scroll-track scroll-right">
            {[...bottomRowThumbnails, ...bottomRowThumbnails, ...bottomRowThumbnails].map((thumbnail, index) => (
              <div key={`bottom-${thumbnail.id}-${index}`} className="scroll-thumbnail-card">
                <div className="thumbnail-container">
                  <img
                    src={thumbnail.src}
                    alt={thumbnail.title}
                    className="scroll-thumbnail-image"
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)';
                      target.style.display = 'flex';
                      target.style.alignItems = 'center';
                      target.style.justifyContent = 'center';
                      target.style.color = 'white';
                      target.style.fontSize = '12px';
                      target.style.fontWeight = 'bold';
                      target.textContent = '📺 ' + thumbnail.title.slice(0, 15) + '...';
                    }}
                  />
                  <div className="thumbnail-text-overlay">
                    <h3 className="thumbnail-overlay-title">{thumbnail.title}</h3>
                    <div className="thumbnail-overlay-stats">
                      <span className="views-badge">{thumbnail.views} views</span>
                      <span className="category-badge">{thumbnail.category}</span>
                    </div>
                  </div>
                  <div className="thumbnail-gradient-overlay"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section with shadcn Cards */}
      <section className="pricing-section">
        <div className="pricing-header">
          <h2 className="section-title">Start Creating with ThumbnailMaker Today</h2>
          <p className="pricing-subtitle">No surprises or hidden fees. Cancel anytime.</p>
          <div className="billing-toggle">
            <Button variant="ghost" size="sm" className="billing-pill active">Monthly</Button>
            <Button variant="ghost" size="sm" className="billing-pill">Yearly</Button>
            <span className="savings-badge">Save 30% with our annual plans</span>
          </div>
        </div>

        <div className="pricing-cards">
          <Card variant="outlined" padding="lg" className="pricing-card glass-effect">
            {/* Top Badge */}
            <div className="pricing-card-header">
              <div className="icon-circle">
                <span style={{ fontSize: '14px' }}>🚀</span>
              </div>
              <h3 className="pricing-card-title">Essential</h3>
            </div>
            
            {/* Price */}
            <div className="pricing-price">
              <span className="price-current">$14</span>
              <span className="price-period">/month</span>
            </div>
            <p className="pricing-description" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Perfect for individuals and small projects</p>
            
            <div className="card-divider" style={{ margin: '1.5rem 0' }}></div>
            
            {/* Features */}
            <ul className="pricing-features" style={{ marginBottom: '2rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>240 thumbnails/year</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>2400 AI credits</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>Basic templates</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>Email support</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.3)', marginRight: '12px', width: '16px' }}>−</span>
                <span>No custom training</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.3)', marginRight: '12px', width: '16px' }}>−</span>
                <span>No priority support</span>
              </li>
            </ul>
            
            {/* Stats */}
            <div className="pricing-stats">
              <div className="pricing-stat">
                <div className="pricing-stat-value">99.5%</div>
                <div className="pricing-stat-label">Uptime</div>
              </div>
              <div className="pricing-stat">
                <div className="pricing-stat-value">150ms</div>
                <div className="pricing-stat-label">Response</div>
              </div>
            </div>
            
            {/* CTA */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <Button variant="secondary" size="lg" fullWidth className="pricing-btn">Start Free Trial</Button>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', textAlign: 'center', marginTop: '12px' }}>No credit card required</p>
            </div>
          </Card>

          <Card variant="elevated" padding="lg" className="pricing-card featured glass-effect" interactive>
            {/* Popular Badge */}
            <div style={{ position: 'absolute', top: '-2px', right: '30px', padding: '4px 10px', background: 'rgba(37, 99, 235, 0.9)', color: 'white', fontSize: '12px', fontWeight: '500', borderRadius: '0 0 6px 6px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)' }}>MOST POPULAR</div>
            
            {/* Top Badge */}
            <div className="pricing-card-header">
              <div className="icon-circle" style={{ background: 'rgba(37, 99, 235, 0.2)', border: '1px solid rgba(37, 99, 235, 0.3)' }}>
                <span style={{ fontSize: '14px', color: '#3b82f6' }}>⚡</span>
              </div>
              <h3 className="pricing-card-title">Professional</h3>
            </div>
            
            {/* Price */}
            <div className="pricing-price">
              <span className="price-current">$28</span>
              <span className="price-period">/month</span>
            </div>
            <p className="pricing-description" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>For teams with advanced AI needs</p>
            
            <div className="card-divider" style={{ margin: '1.5rem 0' }}></div>
            
            {/* Features */}
            <ul className="pricing-features" style={{ marginBottom: '2rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>1800 thumbnails/year</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>18000 AI credits</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>Advanced templates</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>Priority support</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>Custom training</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.3)', marginRight: '12px', width: '16px' }}>−</span>
                <span>No dedicated resources</span>
              </li>
            </ul>
            
            {/* Stats */}
            <div className="pricing-stats">
              <div className="pricing-stat featured">
                <div className="pricing-stat-value">99.95%</div>
                <div className="pricing-stat-label">Uptime</div>
              </div>
              <div className="pricing-stat featured">
                <div className="pricing-stat-value">80ms</div>
                <div className="pricing-stat-label">Response</div>
              </div>
            </div>
            
            {/* CTA */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <Button variant="primary" size="lg" fullWidth className="pricing-btn">Get Started</Button>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', textAlign: 'center', marginTop: '12px' }}>14-day free trial included</p>
            </div>
          </Card>

          <Card variant="outlined" padding="lg" className="pricing-card glass-effect">
            {/* Top Badge */}
            <div className="pricing-card-header">
              <div className="icon-circle">
                <span style={{ fontSize: '14px', color: '#8b5cf6' }}>🏢</span>
              </div>
              <h3 className="pricing-card-title">Enterprise</h3>
            </div>
            
            {/* Price */}
            <div className="pricing-price">
              <span className="price-current">$56</span>
              <span className="price-period">/month</span>
            </div>
            <p className="pricing-description" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>For organizations with advanced requirements</p>
            
            <div className="card-divider" style={{ margin: '1.5rem 0' }}></div>
            
            {/* Features */}
            <ul className="pricing-features" style={{ marginBottom: '2rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>Unlimited thumbnails</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>Unlimited AI models</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>Full API ecosystem</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>24/7 dedicated support</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>Advanced custom training</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                <span style={{ color: '#3b82f6', marginRight: '12px', width: '16px' }}>✓</span>
                <span>Dedicated resources</span>
              </li>
            </ul>
            
            {/* Stats */}
            <div className="pricing-stats">
              <div className="pricing-stat">
                <div className="pricing-stat-value">99.99%</div>
                <div className="pricing-stat-label">Uptime</div>
              </div>
              <div className="pricing-stat">
                <div className="pricing-stat-value">50ms</div>
                <div className="pricing-stat-label">Response</div>
              </div>
            </div>
            
            {/* CTA */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <Button variant="secondary" size="lg" fullWidth className="pricing-btn">Contact Sales</Button>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', textAlign: 'center', marginTop: '12px' }}>Custom pricing available</p>
            </div>
          </Card>
        </div>
        
        {/* Bottom compliance text and badges */}
        <div className="compliance-section">
          <p className="compliance-text">
            All plans include core features: Advanced AI models, REST API, 99.9% uptime SLA, Enterprise encryption, and Community access.
          </p>
          <div className="compliance-badges">
            <span className="compliance-badge">GDPR COMPLIANT</span>
            <span className="compliance-badge">SOC 2 CERTIFIED</span>
            <span className="compliance-badge">HIPAA READY</span>
            <span className="compliance-badge">ISO 27001</span>
          </div>
        </div>
      </section>

      {/* FAQ Section with shadcn Cards */}
      <section className="faq-section">
        <div className="faq-header">
          <h2 className="section-title">Got questions?</h2>
          <p className="faq-subtitle">Everything you need to know about creating viral thumbnails</p>
        </div>

        <div className="faq-container">
          {faqData.map((faq, index) => (
            <Card 
              key={index} 
              variant="outlined" 
              padding="md" 
              interactive 
              className="faq-item"
            >
              <Button
                variant="ghost"
                fullWidth
                className={`faq-question ${activeFAQ === index ? 'active' : ''}`}
                onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                rightIcon={<span className={`faq-icon ${activeFAQ === index ? 'rotated' : ''}`}>▼</span>}
              >
                <span>{faq.question}</span>
              </Button>
              <div className={`faq-answer ${activeFAQ === index ? 'open' : ''}`}>
                <p>{faq.answer}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-brand">
              <h3 className="footer-logo">ThumbnailMaker</h3>
              <p className="footer-tagline">Say Goodbye to 10 of 10s Try ThumbnailMaker Today.</p>
              <p className="footer-description">No headaches, no delays, no hidden costs.</p>
              <Button variant="primary" size="lg" className="footer-cta">Try for Free</Button>
            </div>

            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#faq">FAQ</a>
              </div>
              <div className="footer-column">
                <h4>Support</h4>
                <a href="/feedback">Feedback</a>
                <a href="/changelog">Changelog</a>
                <a href="/subscription">Customer Portal</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <a href="/terms">Terms</a>
                <a href="/privacy">Privacy</a>
              </div>
            </div>
          </div>

          <div className="footer-social">
            <div className="social-icons">
              <Button variant="ghost" size="sm" className="social-icon" aria-label="Instagram">📷</Button>
              <Button variant="ghost" size="sm" className="social-icon" aria-label="Twitter">🐦</Button>
              <Button variant="ghost" size="sm" className="social-icon" aria-label="Discord">💬</Button>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} ThumbnailMaker Studio. All rights reserved.</p>
            <p>contact@thumbnailmaker.com</p>
          </div>
        </div>
      </footer>
      
      {showSignup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white rounded"></div>
                <span className="font-bold text-lg">ThumbnailMaker</span>
              </div>
              <button 
                onClick={() => setShowSignup(false)} 
                className="text-gray-400 hover:text-white transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <h2 className="text-2xl font-light mb-2">Create your account</h2>
            <p className="text-gray-400 text-sm mb-8">Join thousands of creators building with AI</p>

            <div className="space-y-4 mb-6">
              <button className="w-full border border-gray-700 bg-gray-800/50 hover:bg-gray-800 rounded-lg py-3 px-4 flex items-center justify-center gap-3 transition-colors text-sm font-medium">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#1f2937" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#1f2937" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#1f2937" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#1f2937" />
                </svg>
                <span>Sign up with Google</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-gray-900 text-gray-500">Or continue with email</span>
                </div>
              </div>
            </div>

            <form className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Email address
                </label>
                <input 
                  type="email" 
                  value={signupEmail} 
                  onChange={e => setSignupEmail(e.target.value)} 
                  placeholder="you@example.com" 
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Password
                </label>
                <input 
                  type="password" 
                  value={signupPassword} 
                  onChange={e => setSignupPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Create account
              </button>
            </form>

            <p className="text-center text-xs text-gray-400">
              Already have an account?{' '}
              <span 
                onClick={() => {
                  setShowSignup(false);
                  setShowSignin(true);
                }} 
                className="text-blue-500 cursor-pointer hover:text-blue-400"
              >
                Sign in
              </span>
            </p>

            <p className="text-xs text-gray-500 text-center mt-6">
              By signing up, you agree to our <span className="text-gray-400">Terms of Service</span> and <span className="text-gray-400">Privacy Policy</span>
            </p>
          </div>
        </div>
      )}

      {showSignin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white rounded"></div>
                <span className="font-bold text-lg">ThumbnailMaker</span>
              </div>
              <button 
                onClick={() => setShowSignin(false)} 
                className="text-gray-400 hover:text-white transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <h2 className="text-2xl font-light mb-2">Welcome back</h2>
            <p className="text-gray-400 text-sm mb-8">Sign in to your ThumbnailMaker account</p>

            <div className="space-y-4 mb-6">
              <button className="w-full border border-gray-700 bg-gray-800/50 hover:bg-gray-800 rounded-lg py-3 px-4 flex items-center justify-center gap-3 transition-colors text-sm font-medium">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#1f2937" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#1f2937" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#1f2937" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#1f2937" />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-gray-900 text-gray-500">Or continue with email</span>
                </div>
              </div>
            </div>

            <form className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Email address
                </label>
                <input 
                  type="email" 
                  value={signinEmail} 
                  onChange={e => setSigninEmail(e.target.value)} 
                  placeholder="you@example.com" 
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Password
                </label>
                <input 
                  type="password" 
                  value={signinPassword} 
                  onChange={e => setSigninPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors" 
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 bg-gray-800 border border-gray-700 rounded" />
                  <span className="text-gray-400">Remember me</span>
                </label>
                <a href="#" className="text-blue-500 hover:text-blue-400">Forgot password?</a>
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Sign in
              </button>
            </form>

            <p className="text-center text-xs text-gray-400">
              Don't have an account?{' '}
              <span 
                onClick={() => {
                  setShowSignin(false);
                  setShowSignup(true);
                }} 
                className="text-blue-500 cursor-pointer hover:text-blue-400"
              >
                Sign up
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;