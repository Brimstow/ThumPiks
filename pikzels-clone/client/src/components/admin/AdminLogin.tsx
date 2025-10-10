import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle, Sparkles, Zap } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

const AdminLogin: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);
  const navigate = useNavigate();

  // Generate floating particles for background animation
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5
      }));
      setParticles(newParticles);
    };
    generateParticles();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8550/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.admin || data.user));
      
      navigate('/admin');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-violet-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Dynamic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse"></div>
        
        {/* Floating Particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-white/30 rounded-full animate-bounce"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
        
        {/* Geometric Shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 relative">
            {/* Animated Icon Container */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-3xl animate-pulse shadow-2xl">
            </div>
            <div className="relative h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300">
              <Zap className="h-10 w-10 text-white animate-pulse" />
            </div>
            {/* Sparkle Effects */}
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-spin" style={{ animationDuration: '3s' }} />
            <Sparkles className="absolute -bottom-1 -left-1 h-4 w-4 text-blue-300 animate-ping" />
          </div>
          <h2 className="mt-8 text-4xl font-black text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text">
            Admin Portal
          </h2>
          <p className="mt-3 text-lg text-blue-100 font-medium">
            ✨ Sign in to access your powerful dashboard
          </p>
        </div>

        {/* Glass-morphism Login Card */}
        <div className="relative">
          {/* Card Background with Glass Effect */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl"></div>
          
          {/* Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-3xl"></div>
          
          <div className="relative py-10 px-8 rounded-3xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-2xl p-4 flex items-start space-x-3 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-5 w-5 text-red-300 flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-red-200">Login Failed</h3>
                  <p className="text-sm text-red-100 mt-1">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-bold text-white/90">
                ✉️ Email Address
              </label>
              <div className="relative group">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 hover:bg-white/20 group-hover:shadow-lg"
                  placeholder="Enter your admin email"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-bold text-white/90">
                🔒 Password
              </label>
              <div className="relative group">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-4 py-4 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 hover:bg-white/20 group-hover:shadow-lg"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center group/btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-white/60 hover:text-white group-hover/btn:scale-110 transition-all duration-200" />
                  ) : (
                    <Eye className="h-5 w-5 text-white/60 hover:text-white group-hover/btn:scale-110 transition-all duration-200" />
                  )}
                </button>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-4 px-6 border-0 text-lg font-black rounded-2xl text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-2xl active:scale-95 overflow-hidden"
              >
                {/* Button Background Animation */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex items-center gap-3">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                      <span className="animate-pulse">Signing in...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 group-hover:animate-pulse" />
                      <span>Sign in to Admin Portal</span>
                      <Sparkles className="h-4 w-4 group-hover:animate-spin" />
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>

          <div className="mt-6 p-5 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
            <h4 className="text-sm font-bold text-white/90 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              Demo Credentials
            </h4>
            <div className="text-sm text-white/80 space-y-2">
              <p><strong className="text-blue-300">Email:</strong> admin@example.com</p>
              <p><strong className="text-purple-300">Password:</strong> AdminPass123!</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  email: 'admin@example.com',
                  password: 'AdminPass123!'
                });
              }}
              className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Zap className="h-3 w-3" />
              Auto-fill Demo Credentials
            </button>
          </div>
          </div>
        </div>

        <div className="text-center animate-pulse">
          <p className="text-sm text-white/60 font-medium">
            🔐 Authorized personnel only • All access is monitored
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;