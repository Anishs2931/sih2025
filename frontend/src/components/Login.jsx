import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import User from './user/User';
import Technician from './technician/Technician';
import Admin from './admin/Admin';
import UserAuth from './UserAuth';

const FixifyLandingPage = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentRole, setCurrentRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({ issues: 0, techs: 0, satisfaction: 0 });
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    category: 'electrical'
  });
  const { currentUser, setCurrentUser } = useCurrentUser();

  // Navigation function - sets currentPage to respective dashboard
  const navigate = (path) => {
    switch (path) {
      case '/technician-dashboard':
        setCurrentPage('technician');
        break;
      case '/admin-dashboard':
        setCurrentPage('admin');
        break;
      case '/user-dashboard':
      default:
        setCurrentPage('user');
        break;
    }
  };

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animate stats counters
  useEffect(() => {
    if (currentPage === 'home') {
      const animateStats = () => {
        const targets = { issues: 500, techs: 50, satisfaction: 98 };
        const duration = 2000;
        const steps = 60;
        const stepTime = duration / steps;
        
        let currentStep = 0;
        const timer = setInterval(() => {
          currentStep++;
          const progress = currentStep / steps;
          
          setAnimatedStats({
            issues: Math.floor(targets.issues * progress),
            techs: Math.floor(targets.techs * progress),
            satisfaction: Math.floor(targets.satisfaction * progress)
          });
          
          if (currentStep >= steps) {
            clearInterval(timer);
            setAnimatedStats(targets);
          }
        }, stepTime);
        
        return () => clearInterval(timer);
      };
      
      const timeout = setTimeout(animateStats, 500);
      return () => clearTimeout(timeout);
    }
  }, [currentPage]);

 const handleRoleSelect = (role) => {
  setCurrentRole(role);
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle user login from UserAuth component
  const handleUserLogin = (userData) => {
    setCurrentUser(userData);
    setShowUserAuth(false);
    navigate('/user-dashboard');
  };

  const handleAuthSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: currentRole
        })
      });
      const data = await response.json();
      console.log(data)
      setIsLoading(false);
      if (response.ok && data.success) {
        // Fetch full user data based on role after login
        let userData;
        if (currentRole === 'technician') {
          const techRes = await fetch(`http://localhost:3000/api/technician/profile/${formData.email}`);
          if (techRes.ok) {
            userData = await techRes.json();
            setCurrentUser({ ...userData.technician, role: 'technician' });
          } else {
            setCurrentUser({ email: formData.email, role: 'technician' });
          }
        } else if (currentRole === 'admin') {
          // For admin, we'll use a simple user object for now
          setCurrentUser({ email: formData.email, role: 'admin', name: 'Admin User' });
        } else {
          // For regular users
          const userRes = await fetch(`http://localhost:3000/api/user/email/${formData.email}`);
          userData = await userRes.json();
          setCurrentUser({ ...userData.user, role: 'user' } || { email: formData.email, role: 'user' });
        }

        // After login, go to dashboard
        switch (currentRole) {
          case 'technician':
            navigate('/technician-dashboard');
            break;
          case 'admin':
            navigate('/admin-dashboard');
            break;
          case 'user':
          default:
            navigate('/user-dashboard');
            break;
        }
      } else {
        alert(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      setIsLoading(false);
      alert('Network error. Please try again later.');
    }
  };

  const features = [
    {
      icon: '📷',
      title: 'AI Image Recognition',
      description: 'Upload photos and let AI automatically classify maintenance issues',
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      icon: '📍',
      title: 'Smart Location Tracking',
      description: 'Automatic GPS detection and nearby technician assignment',
      gradient: 'from-green-500 to-teal-600'
    },
    {
      icon: '👥',
      title: 'Community Verification',
      description: 'Nearby residents verify issues before technician assignment',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      icon: '⚡',
      title: 'Real-time Updates',
      description: 'Live status tracking and instant notifications',
      gradient: 'from-yellow-500 to-orange-600'
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'Comprehensive insights and performance metrics',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      icon: '🛡️',
      title: 'Quality Assurance',
      description: 'Rating system and quality control mechanisms',
      gradient: 'from-indigo-500 to-blue-600'
    }
  ];

  const steps = [
    { step: 1, title: 'Report Issue', desc: 'Take a photo of the problem and upload it', color: 'bg-blue-500' },
    { step: 2, title: 'AI Analysis', desc: 'AI automatically classifies and prioritizes', color: 'bg-green-500' },
    { step: 3, title: 'Community Verify', desc: 'Nearby residents confirm the issue', color: 'bg-yellow-500' },
    { step: 4, title: 'Get Fixed', desc: 'Technician arrives and resolves the issue', color: 'bg-purple-500' }
  ];

  const roleOptions = [
    { 
      id: 'user', 
      icon: '👤', 
      title: 'User', 
      desc: 'Report maintenance issues',
      gradient: 'from-blue-500 to-blue-600'
    },
    { 
      id: 'technician', 
      icon: '🔧', 
      title: 'Technician', 
      desc: 'Find job opportunities',
      gradient: 'from-green-500 to-green-600'
    },
    { 
      id: 'admin', 
      icon: '🛡️', 
      title: 'Admin', 
      desc: 'Manage operations',
      gradient: 'from-purple-500 to-purple-600'
    }
  ];

  if (currentPage === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative w-full max-w-4xl">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            {/* Back Button */}
            <button
              onClick={() => setCurrentPage('home')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
            >
              ← Back to Home
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                ⚡ Fixify.AI
              </h1>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-600">Choose your role and get started</p>
            </div>

            {/* Role Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {roleOptions.map((role) => (
                <div
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`cursor-pointer p-6 rounded-2xl border-2 transition-all duration-300 text-center hover:scale-105 ${
                    currentRole === role.id
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="text-4xl mb-3">{role.icon}</div>
                  <h3 className="font-semibold text-gray-800 mb-1">{role.title}</h3>
                  <p className="text-sm text-gray-600">{role.desc}</p>
                </div>
              ))}
            </div>

            {/* New User Registration Option */}
            {currentRole === 'user' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                <div className="text-center">
                  <p className="text-sm text-gray-700 mb-3">
                    <span className="font-semibold">New to Fixify.AI?</span> Create your account with phone number for WhatsApp integration!
                  </p>
                  <button
                    onClick={() => setShowUserAuth(true)}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-600 transition-all duration-200 transform hover:scale-105 shadow-md"
                  >
                    🚀 Create New Account
                  </button>
                </div>
              </div>
            )}

            {/* Login Form Only */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">📧</span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔒</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter your password"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAuthSubmit}
                disabled={isLoading}
                className={`w-full py-4 px-6 rounded-xl font-semibold transform transition-all duration-200 shadow-lg ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02]'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  `Login as ${currentRole} →`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render UserAuth component if showUserAuth is true
  if (showUserAuth) {
    return (
      <UserAuth
        onLogin={handleUserLogin}
        onBack={() => setShowUserAuth(false)}
      />
    );
  }

  // Render dashboard pages after login
  if (currentPage === 'user') {
    return <User />;
  }
  if (currentPage === 'technician') {
    return <Technician />;
  }
  if (currentPage === 'admin') {
    return <Admin />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ⚡ Fixify.AI
              </h1>
            </div>
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
                <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">How it Works</a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
                <button
                  onClick={() => setCurrentPage('auth')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        
        {/* Animated background elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen">
            <div className="text-white space-y-8">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Smart Maintenance Management with{' '}
                <span className="text-yellow-400 animate-pulse">AI Power</span>
              </h1>
              
              <p className="text-xl text-blue-100 leading-relaxed">
                Transform your community maintenance with AI-powered issue detection, 
                automated technician assignment, and real-time tracking.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setCurrentPage('auth')}
                  className="bg-white text-blue-600 px-8 py-4 rounded-full font-semibold hover:bg-blue-50 transform hover:scale-105 transition-all shadow-lg"
                >
                  👤 Get Started Free
                </button>
                <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-all">
                  ▶️ Watch Demo
                </button>
              </div>
              
              {/* Animated Stats */}
              <div className="grid grid-cols-3 gap-8 pt-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-400 mb-2">{animatedStats.issues}+</div>
                  <div className="text-blue-200">Issues Resolved</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-400 mb-2">{animatedStats.techs}+</div>
                  <div className="text-blue-200">Technicians</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-400 mb-2">{animatedStats.satisfaction}%</div>
                  <div className="text-blue-200">Satisfaction Rate</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 transform hover:scale-105 transition-all duration-500 border border-white/20">
                <div className="text-center text-white">
                  <div className="text-8xl mb-6 animate-bounce">🤖</div>
                  <h3 className="text-2xl font-bold mb-4">AI-Powered Solutions</h3>
                  <p className="text-blue-100">Smart issue detection and automated workflow management</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600">Everything you need for efficient maintenance management</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border border-gray-100"
              >
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} text-white text-2xl mb-6`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">Simple 4-step process to get your issues resolved</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center group relative">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${step.color} text-white text-xl font-bold mb-6 group-hover:scale-110 transition-transform`}>
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-8 h-0.5 bg-gray-300"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust Fixify.AI for their maintenance needs
          </p>
          <button
            onClick={() => setCurrentPage('auth')}
            className="bg-white text-blue-600 px-12 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transform hover:scale-105 transition-all shadow-lg"
          >
            Join Fixify.AI Today →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Fixify.AI
              </h3>
              <p className="text-gray-400">Smart maintenance management for modern communities</p>
            </div>
            <div className="text-center md:text-right">
              <button
                onClick={() => setCurrentPage('auth')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all"
              >
                Get Started Today
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FixifyLandingPage;