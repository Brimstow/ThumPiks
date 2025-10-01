import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody } from './ui';
import ThemeToggle from './ThemeToggle';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className={`landing-page ${isDarkMode ? 'dark' : ''}`}>
      <ThemeToggle 
        isDarkMode={isDarkMode} 
        onToggle={toggleTheme} 
      />
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">
          Create Stunning Thumbnails in Seconds
        </h1>
        <p className="hero-subtitle">
          Transform your content with AI-powered thumbnail generation. No design skills needed - just upload, customize, and download professional thumbnails for YouTube, social media, and more.
        </p>
        <div className="hero-cta">
          <Button
            size="lg"
            variant="primary"
            onClick={() => navigate('/register')}
          >
            Get Started Free
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className={`features-section ${isDarkMode ? 'dark' : ''}`}>
        <h2 className="section-title">
          Powerful Features
        </h2>
        <div className="features-grid">
          <Card 
            variant="elevated" 
            padding="lg" 
            className={`feature-card ${isDarkMode ? 'dark' : ''}`}
            interactive
          >
            <CardBody>
              <div className="feature-icon feature-icon--ai">
                🤖
              </div>
              <h3 className="feature-title">
                AI-Powered Design
              </h3>
              <p className="feature-description">
                Our advanced AI automatically generates stunning thumbnails tailored to your content and audience.
              </p>
            </CardBody>
          </Card>
          
          <Card 
            variant="elevated" 
            padding="lg" 
            className={`feature-card ${isDarkMode ? 'dark' : ''}`}
            interactive
          >
            <CardBody>
              <div className="feature-icon feature-icon--design">
                🎨
              </div>
              <h3 className="feature-title">
                Easy to Use
              </h3>
              <p className="feature-description">
                Create professional thumbnails in minutes with our intuitive drag-and-drop editor and templates.
              </p>
            </CardBody>
          </Card>
          
          <Card 
            variant="elevated" 
            padding="lg" 
            className={`feature-card ${isDarkMode ? 'dark' : ''}`}
            interactive
          >
            <CardBody>
              <div className="feature-icon feature-icon--speed">
                ⚡
              </div>
              <h3 className="feature-title">
                Lightning Fast
              </h3>
              <p className="feature-description">
                Generate and download high-quality thumbnails in seconds, not hours.
              </p>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <h2 className="section-title">
          What Creators Say
        </h2>
        <Card 
          variant="elevated" 
          padding="xl" 
          className={`testimonial-card ${isDarkMode ? 'dark' : ''}`}
        >
          <CardBody>
            <p className="testimonial-text">
              "Thumbnail Maker Studio increased my YouTube click-through rate by 40% in just one week. 
              The AI suggestions are incredibly accurate and save me hours of design work!"
            </p>
            <div className="testimonial-author">
              Sarah Johnson
            </div>
            <div className="testimonial-role">
              YouTube Content Creator
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Footer */}
      <footer className={`landing-footer ${isDarkMode ? 'dark' : ''}`}>
        <p className="footer-text">
          © {new Date().getFullYear()} Thumbnail Maker Studio. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;