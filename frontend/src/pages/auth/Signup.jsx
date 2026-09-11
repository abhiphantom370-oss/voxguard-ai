import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/authContext';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password validation checklist
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!agreeTerms) {
      setError('You must accept the Terms of Service & Privacy Policy to continue.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!hasMinLength || !hasNumber) {
      setError('Password must be at least 8 characters and include at least one number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(fullName, email, password);
      // Upon signup, redirect to dashboard (or onboarding modal will pop up)
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-brand-badge">
            <ShieldCheck size={28} />
          </div>
          <h1 className="auth-title">Create Analyst Account</h1>
          <p className="auth-subtitle">Register to deploy real-time voice defense and enroll biometric profiles</p>
        </div>

        {error && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name-input">
              Full Name
            </label>
            <div className="auth-input-wrapper">
              <User size={16} className="auth-input-icon" />
              <input
                id="name-input"
                type="text"
                className="form-input auth-input"
                placeholder="Dr. Alex Vance"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">
              Work / Enterprise Email
            </label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="signup-email"
                type="email"
                className="form-input auth-input"
                placeholder="alex.vance@defense.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-pass">
              Create Password
            </label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="signup-pass"
                type={showPassword ? 'text' : 'password'}
                className="form-input auth-input"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-confirm-pass">
              Confirm Password
            </label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="signup-confirm-pass"
                type={showPassword ? 'text' : 'password'}
                className="form-input auth-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Password criteria hints */}
          {password && (
            <div className="auth-criteria-box">
              <div className={`criteria-item ${hasMinLength ? 'met' : ''}`}>
                <CheckCircle2 size={12} />
                <span>8+ characters</span>
              </div>
              <div className={`criteria-item ${hasNumber ? 'met' : ''}`}>
                <CheckCircle2 size={12} />
                <span>At least 1 number</span>
              </div>
              <div className={`criteria-item ${hasUpper ? 'met' : ''}`}>
                <CheckCircle2 size={12} />
                <span>Uppercase letter</span>
              </div>
              <div className={`criteria-item ${passwordsMatch ? 'met' : ''}`}>
                <CheckCircle2 size={12} />
                <span>Passwords match</span>
              </div>
            </div>
          )}

          {/* Terms Agreement Checkbox */}
          <div className="auth-options-row">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="auth-checkbox"
                required
              />
              <span style={{ fontSize: '0.8rem' }}>
                I acknowledge the <span style={{ color: 'var(--cyan-400)' }}>Security Terms of Use</span> & zero-retention voice privacy policy.
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already registered?</span>{' '}
          <Link to="/login" className="auth-highlight-link">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
