import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody } from './ui';
import ThemeToggle from './ThemeToggle';
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
  const [currentSlide, setCurrentSlide] = useState(0);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);

    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Sample thumbnail examples for slideshow - using actual working images
  const thumbnailExamples = [
    {
      id: 1,
      src: 'https://via.placeholder.com/300x200/6366f1/ffffff?text=Gaming+Tutorial',
      title: 'How to Master Gaming Skills',
      views: '1.2M',
    },
    {
      id: 2,
      src: 'https://via.placeholder.com/300x200/8b5cf6/ffffff?text=Tech+Review',
      title: 'Latest Tech Reviews 2024',
      views: '850K',
    },
    {
      id: 3,
      src: 'https://via.placeholder.com/300x200/06b6d4/ffffff?text=Lifestyle+Tips',
      title: 'Daily Lifestyle Hacks',
      views: '2.1M',
    },
    {
      id: 4,
      src: 'https://via.placeholder.com/300x200/10b981/ffffff?text=Cooking+Show',
      title: 'Quick Cooking Recipes',
      views: '650K',
    },
    {
      id: 5,
      src: 'https://via.placeholder.com/300x200/f59e0b/ffffff?text=Travel+Guide',
      title: 'Amazing Travel Destinations',
      views: '1.8M',
    },
    {
      id: 6,
      src: 'https://via.placeholder.com/300x200/ef4444/ffffff?text=Music+Hits',
      title: 'Top Music Hits 2024',
      views: '3.2M',
    },
    {
      id: 7,
      src: 'https://via.placeholder.com/300x200/8b5cf6/ffffff?text=DIY+Projects',
      title: 'Easy DIY Home Projects',
      views: '940K',
    },
    {
      id: 8,
      src: 'https://via.placeholder.com/300x200/06b6d4/ffffff?text=Fitness+Tips',
      title: 'Complete Fitness Guide',
      views: '1.5M',
    },
    {
      id: 9,
      src: 'https://via.placeholder.com/300x200/10b981/ffffff?text=Art+Tutorial',
      title: 'Digital Art Masterclass',
      views: '780K',
    },
  ];

  // Auto-slide for thumbnail gallery
  useEffect(() => {
    console.log('ThumbnailMaker Landing Page loaded successfully!');
    const interval = setInterval(() => {
      setCurrentSlide(prev => {
        const nextSlide = (prev + 1) % Math.ceil(thumbnailExamples.length / 3);
        console.log('Sliding from', prev, 'to', nextSlide);
        return nextSlide;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [thumbnailExamples.length]);

  const handleGenerateThumbnail = () => {
    if (!videoLink.trim()) {
      alert('Please enter a video link');
      return;
    }
    // Navigate to thumbnail editor or handle generation
    navigate('/dashboard');
  };

  const faqData = [
    {
      question: 'How can custom AI thumbnails improve my YouTube video views?',
      answer:
        'Custom thumbnails grab attention and make your videos stand out. A well-designed thumbnail shows what your video is about and encourages viewers to click. Using an AI thumbnail maker boosts click-through rates and helps you grow your audience faster.',
    },
    {
      question: 'What file formats does the thumbnail software support?',
      answer:
        "Our AI thumbnail generator supports file formats like JPG, PNG, and GIF. This flexibility allows you to upload thumbnails directly to YouTube. Using this thumbnail generator, it's easy to create and save your thumbnails in the right format every time.",
    },
    {
      question: 'How does the AI suggest thumbnail designs?',
      answer:
        'The AI analyzes your video link and key content to recommend thumbnail designs. It suggests designs that best capture the essence of your video. It focuses on elements like colors, text placement, and imagery to maximize clicks.',
    },
    {
      question: 'What styles and themes can users create with your software?',
      answer:
        "Our software can generate thumbnails from a wide variety of styles and themes, from bold and colorful to sleek and minimalist. Our AI thumbnail maker adapts the style according to what works best for your video's genre.",
    },
    {
      question:
        'How does your software save time for creators with many videos?',
      answer:
        'Managing thumbnails for multiple videos can be time-consuming. Our AI thumbnail generator automates much of the process and generates thumbnails instantly from video links. Our software streamlines your workflow so you can focus on growing your channel.',
    },
  ];

  return (
    <div className={`landing-page ${isDarkMode ? 'dark' : ''}`}>
      <ThemeToggle 
        isDarkMode={isDarkMode} 
        onToggle={toggleTheme} 
      />

      {/* Pill Navigation Header */}
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

          {/* Generate Thumbnail Interface */}
          <div className="generate-interface">
            <div className="generate-options">
              <button
                className={`option-pill ${includeFace ? 'active' : ''}`}
                onClick={() => setIncludeFace(!includeFace)}
              >
                <span className="option-icon">👤</span>
                Include face
              </button>
              <button className="option-pill">
                <span className="option-icon">👁️</span>
                See example
              </button>
            </div>

            <div className="video-input-container">
              <div className="input-icon">🎬</div>
              <input
                type="text"
                placeholder="Drop link to your YouTube video"
                value={videoLink}
                onChange={e => setVideoLink(e.target.value)}
                className="video-link-input"
              />
              <Button
                onClick={handleGenerateThumbnail}
                className="generate-btn"
                size="lg"
              >
                Generate Thumbnail
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Slideshow Gallery Section */}
      <section className="slideshow-section">
        <h2 className="section-title">
          Discover amazing thumbnails by creators like you.
        </h2>
        <div className="thumbnail-gallery">
          <div
            className="gallery-track"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {Array.from({
              length: Math.ceil(thumbnailExamples.length / 3),
            }).map((_, slideIndex) => (
              <div key={slideIndex} className="gallery-slide">
                {thumbnailExamples
                  .slice(slideIndex * 3, (slideIndex + 1) * 3)
                  .map(thumbnail => (
                    <div key={thumbnail.id} className="thumbnail-card">
                      <img
                        src={thumbnail.src}
                        alt={thumbnail.title}
                        className="thumbnail-image"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.style.background =
                            'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
                          target.style.display = 'flex';
                          target.style.alignItems = 'center';
                          target.style.justifyContent = 'center';
                          target.style.color = 'white';
                          target.style.fontSize = '14px';
                          target.style.fontWeight = 'bold';
                          // Use textContent instead of innerHTML to prevent XSS
                          target.alt = thumbnail.title;
                          target.textContent = '🖼️ ' + thumbnail.title;
                        }}
                      />
                      <div className="thumbnail-info">
                        <h4 className="thumbnail-title">{thumbnail.title}</h4>
                        <span className="thumbnail-views">
                          {thumbnail.views} views
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="pricing-section">
        <div className="pricing-header">
          <h2 className="section-title">
            Start Creating with ThumbnailMaker Today
          </h2>
          <p className="pricing-subtitle">
            No surprises or hidden fees. Cancel anytime.
          </p>
          <div className="billing-toggle">
            <button className="billing-pill active">Monthly</button>
            <button className="billing-pill">Yearly</button>
            <span className="savings-badge">
              Save 30% with our annual plans
            </span>
          </div>
        </div>

        <div className="pricing-cards">
          <Card className="pricing-card">
            <CardBody>
              <div className="pricing-header-content">
                <h3 className="pricing-plan">Essential</h3>
                <div className="pricing-discount">-30%</div>
              </div>
              <div className="pricing-price">
                <span className="price-old">$20</span>
                <span className="price-current">$14</span>
                <span className="price-period">/mo</span>
              </div>
              <p className="pricing-billing">Billed Annually</p>
              <p className="pricing-description">
                Generate up to <strong>240 thumbnails</strong> per year.
              </p>
              <ul className="pricing-features">
                <li>✅ 2400 credits</li>
                <li>✅ Works in Any Language</li>
                <li>✅ Thumbnail Generator</li>
                <li>✅ Edit Thumbnail</li>
                <li>✅ Personas</li>
                <li>✅ Styles</li>
                <li>✅ FaceSwap</li>
                <li>✅ Title Generator</li>
                <li>✅ All Generations Remain Private</li>
              </ul>
              <Button className="pricing-btn" size="lg">
                Subscribe
              </Button>
            </CardBody>
          </Card>

          <Card className="pricing-card featured">
            <div className="popular-badge">Most popular</div>
            <CardBody>
              <div className="pricing-header-content">
                <h3 className="pricing-plan">Premium</h3>
                <div className="pricing-discount">-30%</div>
              </div>
              <div className="pricing-price">
                <span className="price-old">$40</span>
                <span className="price-current">$28</span>
                <span className="price-period">/mo</span>
              </div>
              <p className="pricing-billing">Billed Annually</p>
              <p className="pricing-description">
                Generate up to <strong>1800 thumbnails</strong> per year.
              </p>
              <ul className="pricing-features">
                <li>✅ 18000 credits</li>
                <li>✅ Works in Any Language</li>
                <li>✅ Thumbnail Generator</li>
                <li>✅ Edit Thumbnail</li>
                <li>✅ Personas</li>
                <li>✅ Styles</li>
                <li>✅ FaceSwap</li>
                <li>✅ Title Generator</li>
                <li>✅ All Generations Remain Private</li>
                <li>✅ Early Access to New Features</li>
              </ul>
              <Button className="pricing-btn" size="lg" variant="primary">
                Subscribe
              </Button>
            </CardBody>
          </Card>

          <Card className="pricing-card">
            <CardBody>
              <div className="pricing-header-content">
                <h3 className="pricing-plan">Ultimate</h3>
                <div className="pricing-discount">-30%</div>
              </div>
              <div className="pricing-price">
                <span className="price-old">$80</span>
                <span className="price-current">$56</span>
                <span className="price-period">/mo</span>
              </div>
              <p className="pricing-billing">Billed Annually</p>
              <p className="pricing-description">
                Generate up to <strong>5400 thumbnails</strong> per year.
              </p>
              <ul className="pricing-features">
                <li>✅ 54000 credits</li>
                <li>✅ Works in Any Language</li>
                <li>✅ Thumbnail Generator</li>
                <li>✅ Edit Thumbnail</li>
                <li>✅ Personas</li>
                <li>✅ Styles</li>
                <li>✅ FaceSwap</li>
                <li>✅ Title Generator</li>
                <li>✅ All Generations Remain Private</li>
                <li>✅ Early Access to New Features</li>
              </ul>
              <Button className="pricing-btn" size="lg">
                Subscribe
              </Button>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="faq-header">
          <h2 className="section-title">Got questions?</h2>
          <p className="faq-subtitle">
            Everything you need to know about creating viral thumbnails
          </p>
        </div>

        <div className="faq-container">
          {faqData.map((faq, index) => (
            <div key={index} className="faq-item">
              <button
                className={`faq-question ${activeFAQ === index ? 'active' : ''}`}
                onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
              >
                <span>{faq.question}</span>
                <span
                  className={`faq-icon ${activeFAQ === index ? 'rotated' : ''}`}
                >
                  ▼
                </span>
              </button>
              <div
                className={`faq-answer ${activeFAQ === index ? 'open' : ''}`}
              >
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-brand">
              <h3 className="footer-logo">ThumbnailMaker</h3>
              <p className="footer-tagline">
                Say Goodbye to 10 of 10s Try ThumbnailMaker Today.
              </p>
              <p className="footer-description">
                No headaches, no delays, no hidden costs.
              </p>
              <Button className="footer-cta" size="lg">
                Try for Free
              </Button>
            </div>

            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#faq">FAQ</a>
                <a href="/app">Web App</a>
              </div>

              <div className="footer-column">
                <h4>Support</h4>
                <a href="/feedback">Feedback</a>
                <a href="/changelog">Changelog</a>
                <a href="/subscription">Customer Portal</a>
                <span>Contact</span>
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
              <a href="#" className="social-icon" aria-label="Instagram">
                📷
              </a>
              <a href="#" className="social-icon" aria-label="Twitter">
                🐦
              </a>
              <a href="#" className="social-icon" aria-label="Discord">
                💬
              </a>
            </div>
          </div>

          <div className="footer-bottom">
            <p>
              © {new Date().getFullYear()} ThumbnailMaker Studio. All rights
              reserved.
            </p>
            <p>contact@thumbnailmaker.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
