import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/authContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, demoCredentials } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password, rememberMe);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    const demoEmail = demoCredentials?.email || 'admin@voxguard.ai';
    const demoPass = demoCredentials?.password || 'VoxGuard2026!';
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setIsSubmitting(true);

    try {
      await login(demoEmail, demoPass, true);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header with Brand */}
        <div className="auth-header">
          <div className="auth-brand-badge">
            <ShieldCheck size={28} />
          </div>
          <h1 className="auth-title">Welcome to VoxGuard AI</h1>
          <p className="auth-subtitle">Sign in to access real-time acoustic telemetry and speech verification</p>
        </div>

        {/* Demo Login Banner for quick SIH testing */}
        <div className="auth-demo-banner">
          <div className="auth-demo-content">
            <div className="auth-demo-title">
              <Sparkles size={14} color="var(--cyan-400)" />
              <span>SIH Presentation Demo Access</span>
            </div>
            <p className="auth-demo-text">Pre-loaded with official SecOps credentials:</p>
            <div className="auth-demo-creds">
              <code>{demoCredentials.email}</code> / <code>{demoCredentials.password}</code>
            </div>
          </div>
          <button
            type="button"
            className="auth-demo-btn"
            onClick={handleDemoLogin}
            disabled={isSubmitting}
          >
            <span>One-Click Login</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {error && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Email field */}
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              Email Address
            </label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="email-input"
                type="email"
                className="form-input auth-input"
                placeholder="name@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="form-group">
            <div className="auth-label-row">
              <label className="form-label" htmlFor="password-input">
                Password
              </label>
              <Link to="/forgot-password" className="auth-link-text">
                Forgot password?
              </Link>
            </div>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input auth-input"
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me option */}
          <div className="auth-options-row">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="auth-checkbox"
              />
              <span>Keep me signed in on this device</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Authenticating Session...</span>
            ) : (
              <>
                <span>Sign In to Console</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Don't have an analyst account?</span>{' '}
          <Link to="/signup" className="auth-highlight-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
