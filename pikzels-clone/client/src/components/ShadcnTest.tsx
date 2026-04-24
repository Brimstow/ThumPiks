import React, { useEffect, useState } from 'react';
import { Button, Input, Card, CardHeader, CardBody } from './ui';
// Import ALL design system CSS to ensure proper loading
import '../styles/design-system.css';
import '../styles/dark-mode.css';

const ShadcnTest: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    try {
      console.log('🚀 ShadcnTest component mounted');
      
      // Get CSS custom properties
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      const debugData = {
        primaryColor: computedStyle.getPropertyValue('--color-primary-500'),
        bgPrimary: computedStyle.getPropertyValue('--color-bg-primary'),
        textPrimary: computedStyle.getPropertyValue('--color-text-primary'),
        borderPrimary: computedStyle.getPropertyValue('--color-border-primary'),
        isDarkMode: document.documentElement.classList.contains('dark'),
        reactVersion: React.version
      };
      
      setDebugInfo(debugData);
      console.log('🎨 CSS Debug Info:', debugData);
      
    } catch (error) {
      console.error('❌ Error in ShadcnTest:', error);
      setHasError(true);
    }
  }, []);

  // Fallback styling for when CSS variables fail
  const fallbackStyle = {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    background: debugInfo.isDarkMode ? '#1f2937' : '#ffffff',
    color: debugInfo.isDarkMode ? '#f9fafb' : '#111827',
    minHeight: '100vh'
  };

  const containerStyle = {
    marginBottom: '20px',
    padding: '10px',
    border: `1px solid ${debugInfo.isDarkMode ? '#374151' : '#e5e7eb'}`,
    borderRadius: '8px',
    background: debugInfo.isDarkMode ? '#374151' : '#f9fafb'
  };

  if (hasError) {
    return (
      <div style={fallbackStyle}>
        <h1 style={{ color: 'red' }}>🚨 Component Error</h1>
        <p>Check the browser console for details</p>
      </div>
    );
  }

  return (
    <div style={fallbackStyle}>
      <h1>🧪 Shadcn Component Test Page</h1>
      
      {/* Test 1: Import Button only */}
      <div style={containerStyle}>
        <h2>🔘 Test 1: Button Component Only</h2>
        <p>Status: Testing Button import</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <Button variant="primary" size="md">
            🔵 Primary Button
          </Button>
          <Button variant="secondary" size="md">
            ⚪ Secondary Button
          </Button>
          <Button variant="ghost" size="md">
            👻 Ghost Button
          </Button>
        </div>
      </div>

      {/* Test 2: Import Card only */}
      <div style={containerStyle}>
        <h2>🃏 Test 2: Card Component</h2>
        <p>Status: Testing Card component integration</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
          <Card variant="default" padding="md">
            <CardHeader>
              <h3>🎯 Default Card</h3>
            </CardHeader>
            <CardBody>
              <p>This is a default card with header and body components.</p>
            </CardBody>
          </Card>
          
          <Card variant="elevated" padding="lg" interactive>
            <CardBody>
              <h4>✨ Elevated Interactive Card</h4>
              <p>Click me! I have hover effects and elevation.</p>
            </CardBody>
          </Card>
          
          <Card variant="outlined" padding="sm">
            <CardBody>
              <h4>🔲 Outlined Card</h4>
              <p>Compact card with border styling.</p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Test 3: Import Input only */}
      <div style={containerStyle}>
        <h2>📝 Test 3: Input Component</h2>
        <p>Status: Testing Input component integration</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', maxWidth: '400px' }}>
          <Input 
            type="text" 
            placeholder="Test input component"
            label="Test Input"
            size="md"
          />
          <Input 
            type="email" 
            placeholder="Enter your email"
            label="Email Input"
            size="lg"
            leftIcon={<span>📧</span>}
          />
          <Input 
            type="text" 
            placeholder="Search..."
            size="sm"
            rightIcon={<span>🔍</span>}
          />
        </div>
      </div>

      {/* Debug info */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        background: debugInfo.isDarkMode ? '#1f2937' : '#f3f4f6',
        borderRadius: '8px',
        border: `1px solid ${debugInfo.isDarkMode ? '#374151' : '#d1d5db'}`
      }}>
        <h3>🔍 Debug Information</h3>
        <ul style={{ lineHeight: '1.6' }}>
          <li>React version: {debugInfo.reactVersion || 'Loading...'}</li>
          <li>Dark mode: {debugInfo.isDarkMode ? '🌙 Yes' : '☀️ No'}</li>
          <li>Primary color: {debugInfo.primaryColor || 'Not loaded'}</li>
          <li>Background: {debugInfo.bgPrimary || 'Not loaded'}</li>
          <li>Text color: {debugInfo.textPrimary || 'Not loaded'}</li>
          <li>Input component: ✅ Imported</li>
          <li>Card components: ✅ Imported</li>
          <li>Current URL: {window.location.pathname}</li>
        </ul>
        
        <details style={{ marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>🔧 Advanced Debug</summary>
          <pre style={{ 
            background: debugInfo.isDarkMode ? '#111827' : '#ffffff',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            marginTop: '10px'
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default ShadcnTest;