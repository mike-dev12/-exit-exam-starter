'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const brandPills = ['Course Practice', 'Mock Exams', 'Progress Tracking', 'Biomedical Focus'];

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path
        d="M10.6 5.2A11.6 11.6 0 0 1 12 5c7 0 11 7 11 7a14.7 14.7 0 0 1-3.4 4.1M6.5 6.7C3.4 8.6 1 12 1 12s4 7 11 7a10.6 10.6 0 0 0 4.2-.85M9.9 9.9a3 3 0 0 0 4.2 4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsSignup(true);
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          student_id: studentId,
          university,
          department,
          year,
        });

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      router.push('/dashboard');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-rings" aria-hidden="true">
          <span className="auth-ring auth-ring-1" />
          <span className="auth-ring auth-ring-2" />
          <span className="auth-ring auth-ring-3" />
          <span className="auth-ring auth-ring-4" />
        </div>

        <div className="auth-brand-content">
          <div className="auth-logo reveal reveal-1">
            <span className="auth-wordmark">
              Exit<span>Prep</span>
            </span>
            <div className="auth-logo-tag">Biomedical Engineering</div>
          </div>

          <div className="auth-eyebrow reveal reveal-2">Exam Preparation Platform</div>

          <h1 className="auth-headline reveal reveal-3">
            Prepare with confidence,
            <br />
            <span>be ready on exam day.</span>
          </h1>

          <p className="auth-brand-text reveal reveal-4">
            Practice course-based questions, work through practical scenarios, take
            realistic mock exams, and track your readiness — built for final-year
            Biomedical Engineering students.
          </p>

          <div className="auth-pills reveal reveal-5">
            {brandPills.map((p) => (
              <span className="auth-pill" key={p}>
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="auth-signal" aria-hidden="true">
          <svg viewBox="0 0 400 50" preserveAspectRatio="none">
            <path
              className="ecg-path"
              d="M0,25 L130,25 L142,6 L156,44 L168,25 L260,25 L272,10 L284,40 L296,25 L400,25"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="auth-brand-footer">© 2026 ExitPrep. All rights reserved.</div>
      </div>

      <div className="auth-panel">
        <div className="auth-card reveal reveal-6">
          <h2>{isSignup ? 'Create account' : 'Sign in'}</h2>
          <p className="auth-card-subtitle">
            {isSignup
              ? 'Set up your account to start practicing.'
              : 'Enter your credentials to continue your prep.'}
          </p>

          {error && <div className="error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {isSignup && (
              <div className="auth-extra-fields">
                <label className="auth-label" htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <label className="auth-label" htmlFor="studentId">
                  Student ID
                </label>
                <input
                  id="studentId"
                  type="text"
                  placeholder="e.g. BME-2021-014"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />

                <label className="auth-label" htmlFor="university">
                  University
                </label>
                <input
                  id="university"
                  type="text"
                  placeholder="Your university"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                />

                <label className="auth-label" htmlFor="department">
                  Department
                </label>
                <input
                  id="department"
                  type="text"
                  placeholder="Biomedical Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />

                <label className="auth-label" htmlFor="year">
                  Year
                </label>
                <input
                  id="year"
                  type="text"
                  placeholder="e.g. 5th Year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
            )}

            <label className="auth-label" htmlFor="email">
              Email address
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <MailIcon />
              </span>
              <input
                id="email"
                className="has-icon"
                type="email"
                placeholder="you@exitprep.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <LockIcon />
              </span>
              <input
                id="password"
                className="has-icon has-icon-right"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-input-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Sign in'}
            </button>
          </form>

          <p className="auth-toggle">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <a href="#" onClick={() => setIsSignup(!isSignup)}>
              {isSignup ? 'Log in' : 'Sign up'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="auth-page auth-loading">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
