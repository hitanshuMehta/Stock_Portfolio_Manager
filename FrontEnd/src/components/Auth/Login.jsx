import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiLock, FiEye, FiEyeOff, FiTrendingUp, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext.jsx';
import LoadingSpinner from '../UI/LoadingSpinner.jsx';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, googleLogin } = useAuth();

  // Load Google Sign-In SDK
  useEffect(() => {
    const loadGoogleScript = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
          });

          window.google.accounts.id.renderButton(
            document.getElementById('googleSignInButton'),
            {
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
            }
          );
        }
      };
    };

    loadGoogleScript();
  }, []);

  const handleGoogleResponse = async (response) => {
    try {
      setLoading(true);
      setError('');
      await googleLogin(response.credential);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Google login failed';
      setError(getErrorMessage(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error) => {
    const errorLower = error.toLowerCase();
    
    // User not found errors
    if (errorLower.includes('user not found') || errorLower.includes('no user')) {
      return 'We couldn\'t find an account with those credentials. Please check and try again, or sign up for a new account.';
    }
    
    // Invalid credentials
    if (errorLower.includes('invalid credentials') || errorLower.includes('incorrect')) {
      return 'The username/email or password you entered is incorrect. Please try again.';
    }
    
    // Google-specific errors
    if (errorLower.includes('google sign-in')) {
      return 'This account is registered with Google Sign-In. Please use the Google button to login.';
    }
    
    // Account exists with different method
    if (errorLower.includes('already registered') || errorLower.includes('email already')) {
      return 'An account with this email already exists. Please try logging in.';
    }
    
    // Network errors
    if (errorLower.includes('network') || errorLower.includes('timeout')) {
      return 'Unable to connect. Please check your internet connection and try again.';
    }
    
    // Generic fallback
    return 'Unable to sign in. Please check your credentials and try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);

    try {
      await login(username, password);
      // If we reach here, login was successful
      // Don't set loading to false as we'll likely redirect
    } catch (err) {
      console.log('Login error caught:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Login failed';
      const friendlyError = getErrorMessage(errorMsg);
      console.log('Setting error:', friendlyError);
      setError(friendlyError);
      setLoading(false);
    }
  };

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    if (error) {
      setError('');
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) {
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
            <FiTrendingUp className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Stock Portfolio Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your investments
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
                <FiAlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{error}</p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="username" className="sr-only">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={handleUsernameChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <div id="googleSignInButton" className="flex justify-center"></div>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;