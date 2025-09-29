import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Check if dark mode is enabled
  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
      background: isDarkMode 
        ? "linear-gradient(135deg, #1a2a6c 0%, #2c3e50 100%)" 
        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh",
      color: isDarkMode ? "#f0f0f0" : "#333",
    }}>
      {/* Hero Section */}
      <section style={{
        padding: "4rem 1rem",
        textAlign: "center",
        maxWidth: "1200px",
        margin: "0 auto",
      }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: 800,
          marginBottom: "1rem",
          lineHeight: 1.2,
          textShadow: isDarkMode 
            ? "0 2px 4px rgba(0,0,0,0.3)" 
            : "0 2px 4px rgba(0,0,0,0.1)",
          color: isDarkMode ? "#ffffff" : "inherit",
        }}>
          Create Stunning Thumbnails in Seconds
        </h1>
        <p style={{
          fontSize: "1.5rem",
          marginBottom: "2rem",
          opacity: 0.9,
          maxWidth: "800px",
          marginLeft: "auto",
          marginRight: "auto",
          color: isDarkMode ? "#e2e8f0" : "inherit",
        }}>
          Transform your content with AI-powered thumbnail generation. No design skills needed - just upload, customize, and download professional thumbnails for YouTube, social media, and more.
        </p>
        <div style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: "3rem",
        }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              fontWeight: 600,
              borderRadius: "50px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              textDecoration: "none",
              display: "inline-block",
              background: "#4f46e5",
              color: "white",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#4338ca";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#4f46e5";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
            }}
          >
            Get Started Free
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              fontWeight: 600,
              borderRadius: "50px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              textDecoration: "none",
              display: "inline-block",
              background: isDarkMode 
                ? "rgba(255, 255, 255, 0.2)" 
                : "rgba(255, 255, 255, 0.9)",
              color: isDarkMode ? "white" : "#333",
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDarkMode 
                ? "rgba(255, 255, 255, 0.3)" 
                : "rgba(255, 255, 255, 1)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDarkMode 
                ? "rgba(255, 255, 255, 0.2)" 
                : "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
            }}
          >
            Sign In
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: "4rem 1rem",
        background: isDarkMode 
          ? "rgba(0, 0, 0, 0.1)" 
          : "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        borderTop: isDarkMode 
          ? "1px solid rgba(255, 255, 255, 0.1)" 
          : "1px solid rgba(255, 255, 255, 0.2)",
        borderBottom: isDarkMode 
          ? "1px solid rgba(255, 255, 255, 0.1)" 
          : "1px solid rgba(255, 255, 255, 0.2)",
      }}>
        <h2 style={{
          textAlign: "center",
          fontSize: "2.5rem",
          fontWeight: 700,
          marginBottom: "3rem",
          color: isDarkMode ? "#ffffff" : "inherit",
        }}>
          Powerful Features
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem",
          maxWidth: "1200px",
          margin: "0 auto",
        }}>
          <div style={{
            background: isDarkMode 
              ? "rgba(30, 30, 40, 0.8)" 
              : "rgba(255, 255, 255, 0.9)",
            borderRadius: "16px",
            padding: "2rem",
            textAlign: "center",
            transition: "transform 0.3s ease",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            border: isDarkMode 
              ? "1px solid rgba(255, 255, 255, 0.1)" 
              : "1px solid rgba(255, 255, 255, 0.2)",
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              fontSize: "2rem",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
            }}>
              🤖
            </div>
            <h3 style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1rem",
              color: isDarkMode ? "#ffffff" : "inherit",
            }}>
              AI-Powered Design
            </h3>
            <p style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              opacity: 0.8,
              color: isDarkMode ? "#cbd5e0" : "inherit",
            }}>
              Our advanced AI automatically generates stunning thumbnails tailored to your content and audience.
            </p>
          </div>
          
          <div style={{
            background: isDarkMode 
              ? "rgba(30, 30, 40, 0.8)" 
              : "rgba(255, 255, 255, 0.9)",
            borderRadius: "16px",
            padding: "2rem",
            textAlign: "center",
            transition: "transform 0.3s ease",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            border: isDarkMode 
              ? "1px solid rgba(255, 255, 255, 0.1)" 
              : "1px solid rgba(255, 255, 255, 0.2)",
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              fontSize: "2rem",
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              color: "white",
            }}>
              🎨
            </div>
            <h3 style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1rem",
              color: isDarkMode ? "#ffffff" : "inherit",
            }}>
              Easy to Use
            </h3>
            <p style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              opacity: 0.8,
              color: isDarkMode ? "#cbd5e0" : "inherit",
            }}>
              Create professional thumbnails in minutes with our intuitive drag-and-drop editor and templates.
            </p>
          </div>
          
          <div style={{
            background: isDarkMode 
              ? "rgba(30, 30, 40, 0.8)" 
              : "rgba(255, 255, 255, 0.9)",
            borderRadius: "16px",
            padding: "2rem",
            textAlign: "center",
            transition: "transform 0.3s ease",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            border: isDarkMode 
              ? "1px solid rgba(255, 255, 255, 0.1)" 
              : "1px solid rgba(255, 255, 255, 0.2)",
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              fontSize: "2rem",
              background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              color: "white",
            }}>
              ⚡
            </div>
            <h3 style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1rem",
              color: isDarkMode ? "#ffffff" : "inherit",
            }}>
              Lightning Fast
            </h3>
            <p style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              opacity: 0.8,
              color: isDarkMode ? "#cbd5e0" : "inherit",
            }}>
              Generate and download high-quality thumbnails in seconds, not hours.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section style={{
        padding: "4rem 1rem",
        textAlign: "center",
        maxWidth: "1200px",
        margin: "0 auto",
      }}>
        <h2 style={{
          textAlign: "center",
          fontSize: "2.5rem",
          fontWeight: 700,
          marginBottom: "3rem",
          color: isDarkMode ? "#ffffff" : "inherit",
        }}>
          What Creators Say
        </h2>
        <div style={{
          background: isDarkMode 
            ? "rgba(30, 30, 40, 0.8)" 
            : "rgba(255, 255, 255, 0.9)",
          borderRadius: "16px",
          padding: "2rem",
          margin: "2rem auto",
          maxWidth: "800px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          border: isDarkMode 
            ? "1px solid rgba(255, 255, 255, 0.1)" 
            : "1px solid rgba(255, 255, 255, 0.2)",
        }}>
          <p style={{
            fontSize: "1.2rem",
            fontStyle: "italic",
            marginBottom: "1.5rem",
            lineHeight: 1.6,
            color: isDarkMode ? "#cbd5e0" : "inherit",
          }}>
            "Thumbnail Maker Studio increased my YouTube click-through rate by 40% in just one week. 
            The AI suggestions are incredibly accurate and save me hours of design work!"
          </p>
          <div style={{
            fontWeight: 600,
            fontSize: "1.1rem",
            color: isDarkMode ? "#ffffff" : "inherit",
          }}>
            Sarah Johnson
          </div>
          <div style={{
            fontSize: "0.9rem",
            opacity: 0.7,
            color: isDarkMode ? "#cbd5e0" : "inherit",
          }}>
            YouTube Content Creator
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "2rem 1rem",
        textAlign: "center",
        background: isDarkMode 
          ? "rgba(0, 0, 0, 0.3)" 
          : "rgba(0, 0, 0, 0.2)",
        backdropFilter: "blur(10px)",
        borderTop: isDarkMode 
          ? "1px solid rgba(255, 255, 255, 0.1)" 
          : "1px solid rgba(255, 255, 255, 0.1)",
        color: isDarkMode ? "#cbd5e0" : "inherit",
      }}>
        <p style={{
          opacity: 0.8,
        }}>
          © {new Date().getFullYear()} Thumbnail Maker Studio. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;