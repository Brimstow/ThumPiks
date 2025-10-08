import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Gradually adding shadcn components - systematic approach
import { Button, Input, Card, CardHeader, CardBody } from './ui';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [videoLink, setVideoLink] = useState('');
  const [includeFace, setIncludeFace] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

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
                className="generate-btn"
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
          <Card variant="outlined" padding="lg" className="pricing-card">
            <CardHeader>
              <div className="pricing-header-content">
                <h3 className="pricing-plan">Essential</h3>
                <div className="pricing-discount">-30%</div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="pricing-price">
                <span className="price-old">$20</span>
                <span className="price-current">$14</span>
                <span className="price-period">/mo</span>
              </div>
              <p className="pricing-billing">Billed Annually</p>
              <p className="pricing-description">Generate up to <strong>240 thumbnails</strong> per year.</p>
              <ul className="pricing-features">
                <li>✅ 2400 credits</li>
                <li>✅ Works in Any Language</li>
                <li>✅ Thumbnail Generator</li>
                <li>✅ Edit Thumbnail</li>
              </ul>
              <Button variant="secondary" size="lg" fullWidth className="pricing-btn">Subscribe</Button>
            </CardBody>
          </Card>

          <Card variant="elevated" padding="lg" className="pricing-card featured" interactive>
            <div className="popular-badge">Most popular</div>
            <CardHeader>
              <div className="pricing-header-content">
                <h3 className="pricing-plan">Premium</h3>
                <div className="pricing-discount">-30%</div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="pricing-price">
                <span className="price-old">$40</span>
                <span className="price-current">$28</span>
                <span className="price-period">/mo</span>
              </div>
              <p className="pricing-billing">Billed Annually</p>
              <p className="pricing-description">Generate up to <strong>1800 thumbnails</strong> per year.</p>
              <ul className="pricing-features">
                <li>✅ 18000 credits</li>
                <li>✅ Works in Any Language</li>
                <li>✅ All AI features</li>
                <li>✅ Early Access to New Features</li>
              </ul>
              <Button variant="primary" size="lg" fullWidth className="pricing-btn">Subscribe</Button>
            </CardBody>
          </Card>

          <Card variant="outlined" padding="lg" className="pricing-card">
            <CardHeader>
              <div className="pricing-header-content">
                <h3 className="pricing-plan">Ultimate</h3>
                <div className="pricing-discount">-30%</div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="pricing-price">
                <span className="price-old">$80</span>
                <span className="price-current">$56</span>
                <span className="price-period">/mo</span>
              </div>
              <p className="pricing-billing">Billed Annually</p>
              <p className="pricing-description">Generate up to <strong>5400 thumbnails</strong> per year.</p>
              <ul className="pricing-features">
                <li>✅ 54000 credits</li>
                <li>✅ Works in Any Language</li>
                <li>✅ All features</li>
                <li>✅ Priority support</li>
              </ul>
              <Button variant="secondary" size="lg" fullWidth className="pricing-btn">Subscribe</Button>
            </CardBody>
          </Card>
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
    </div>
  );
};

export default LandingPage;