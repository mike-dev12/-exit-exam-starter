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

function BrandMark() {
  return (
    <div className="brand-mark">
      <svg viewBox="0 0 48 48" width="26" height="26">
        <path
          d="M4,24 L13,24 L17,10 L24,40 L29,24 L44,24"
          fill="none"
          stroke="#0F766E"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
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


// ---------- Biomedical decoration (login page, left side) ----------
const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function HeartPulseIcon() {
  return (
    <svg {...svgProps}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
      <path d="M5 12h3l1.5-2.5 2.5 5 1.5-2.5H19" />
    </svg>
  );
}

function MicroscopeIcon() {
  return (
    <svg {...svgProps}>
      <path d="M6 18h8" />
      <path d="M3 22h18" />
      <path d="M14 22a7 7 0 1 0 0-14h-1" />
      <path d="M9 14h2" />
      <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
      <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg {...svgProps}>
      <path d="M11 2v2" />
      <path d="M5 2v2" />
      <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
      <path d="M8 15a6 6 0 0 0 12 0v-3" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  );
}

function AtomIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="1.6" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg {...svgProps}>
      <path d="M9 3h6" />
      <path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3" />
      <path d="M7 15h10" />
    </svg>
  );
}

// Rotating DNA helix: each rung flips in turn, which reads as a 3D twist
function DnaHelix() {
  const rungs = Array.from({ length: 11 }, (_, i) => i);
  return (
    <svg className="bio-dna-svg" viewBox="0 0 80 230" aria-hidden="true">
      {rungs.map((i) => (
        <g
          key={i}
          className="dna-rung"
          style={{ animationDelay: `${-i * 0.32}s`, transformOrigin: `40px ${12 + i * 20}px` }}
        >
          <line x1="14" y1={12 + i * 20} x2="66" y2={12 + i * 20} />
          <circle cx="14" cy={12 + i * 20} r="4.2" className="dna-dot-a" />
          <circle cx="66" cy={12 + i * 20} r="4.2" className="dna-dot-b" />
        </g>
      ))}
    </svg>
  );
}

// One heartbeat = 200 units wide; the monitor repeats it 4 times
const ECG_BEAT = (x) =>
  `L${x + 60},40 L${x + 70},34 L${x + 80},40 L${x + 100},40 L${x + 108},47 L${x + 116},6 ` +
  `L${x + 126},72 L${x + 134},40 L${x + 152},40 L${x + 164},29 L${x + 178},40 L${x + 200},40`;
const ECG_PATH = 'M0,40 ' + [0, 200, 400, 600].map(ECG_BEAT).join(' ');

function VitalsMonitor() {
  return (
    <div className="vitals reveal reveal-5" aria-hidden="true">
      <div className="vitals-top">
        <span className="vitals-heart">
          <HeartPulseIcon />
        </span>
        <div className="vitals-read">
          <span className="vitals-num">72</span>
          <span className="vitals-unit">BPM</span>
        </div>
        <span className="vitals-sep" />
        <div className="vitals-read">
          <span className="vitals-num">98</span>
          <span className="vitals-unit">SpO₂ %</span>
        </div>
        <span className="vitals-sep" />
        <div className="vitals-read">
          <span className="vitals-num">120/80</span>
          <span className="vitals-unit">mmHg</span>
        </div>
      </div>
      <div className="ecg-window">
        <div className="ecg-track">
          {[0, 1].map((k) => (
            <svg key={k} viewBox="0 0 800 80" preserveAspectRatio="none">
              <path d={ECG_PATH} />
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [otp, setOtp] = useState('');
  // mode: 'login' | 'signup' | 'reset'
  const [mode, setMode] = useState('login');
  // step (signup/reset only): 'details' -> 'otp' -> 'password'
  const [step, setStep] = useState('details');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setMode('signup');
    }
  }, [searchParams]);

  // Count down the "resend code" timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function switchMode(next) {
    setMode(next);
    setStep('details');
    setError('');
    setInfo('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
  }

  // Step 1: send a one-time code to the student's email
  async function sendCode() {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: isSignup },
    });
    if (error) {
      setError(
        error.message.toLowerCase().includes('signups not allowed')
          ? 'No account found for this email. Please sign up first.'
          : error.message
      );
      return false;
    }
    setCooldown(60);
    return true;
  }

  async function handleResend() {
    setError('');
    setInfo('');
    setLoading(true);
    const ok = await sendCode();
    setLoading(false);
    if (ok) setInfo('A new code has been sent to your email.');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    // ---------- Normal sign in ----------
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push('/dashboard');
      return;
    }

    // ---------- Sign up / reset: step 1 (email -> send code) ----------
    if (step === 'details') {
      const ok = await sendCode();
      setLoading(false);
      if (ok) {
        setStep('otp');
        setInfo(`We sent a verification code to ${email.trim()}.`);
      }
      return;
    }

    // ---------- Step 2 (verify the code) ----------
    if (step === 'otp') {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email',
      });
      setLoading(false);
      if (error) {
        setError('That code is invalid or has expired. Please try again.');
        return;
      }
      setStep('password');
      setInfo('Email verified. Now choose a password.');
      return;
    }

    // ---------- Step 3 (create the password) ----------
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const { data: updated, error: pwError } = await supabase.auth.updateUser({ password });
    if (pwError) {
      setError(pwError.message);
      setLoading(false);
      return;
    }

    if (isSignup) {
      const userId = updated.user.id;
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existing) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
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
    }

    setLoading(false);
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

        <div className="bio-strip" aria-hidden="true">
          <span className="bio-chip" style={{ animationDelay: '0s' }}>
            <HeartPulseIcon />
          </span>
          <span className="bio-chip" style={{ animationDelay: '-1s' }}>
            <MicroscopeIcon />
          </span>
          <span className="bio-chip" style={{ animationDelay: '-2s' }}>
            <StethoscopeIcon />
          </span>
          <span className="bio-chip" style={{ animationDelay: '-3s' }}>
            <AtomIcon />
          </span>
          <span className="bio-chip" style={{ animationDelay: '-4s' }}>
            <FlaskIcon />
          </span>
        </div>

        <div className="bio-dna" aria-hidden="true">
          <DnaHelix />
        </div>

        <div className="auth-brand-content">
          <div className="auth-logo reveal reveal-1">
            <BrandMark />
            <div>
              <span className="auth-wordmark">
                Bio<span>Path</span>
              </span>
              <div className="auth-logo-tag">Biomedical Engineering</div>
            </div>
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

        <VitalsMonitor />

        <div className="auth-brand-footer">© 2026 BioPath. All rights reserved.</div>
      </div>

      <div className="auth-panel">
        <div className="auth-card reveal reveal-6">
          <h2>
            {mode === 'login' && 'Sign in'}
            {isSignup && step === 'details' && 'Create account'}
            {isSignup && step === 'otp' && 'Verify your email'}
            {isSignup && step === 'password' && 'Create your password'}
            {isReset && step === 'details' && 'Reset password'}
            {isReset && step === 'otp' && 'Verify your email'}
            {isReset && step === 'password' && 'Choose a new password'}
          </h2>
          <p className="auth-card-subtitle">
            {mode === 'login' && 'Enter your credentials to continue your prep.'}
            {mode !== 'login' &&
              step === 'details' &&
              (isSignup
                ? "Enter your details. We'll email you a verification code."
                : "Enter your email and we'll send you a verification code.")}
            {mode !== 'login' && step === 'otp' && 'Type the code we just emailed you.'}
            {mode !== 'login' && step === 'password' && 'You will use this password to sign in.'}
          </p>

          {error && <div className="error">{error}</div>}
          {info && !error && <div className="success">{info}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {isSignup && step === 'details' && (
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

            {(mode === 'login' || step === 'details') && (
              <>
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
                    placeholder="you@biopath.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {mode !== 'login' && step === 'otp' && (
              <>
                <label className="auth-label" htmlFor="otp">
                  Verification code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  placeholder="Enter the code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.2rem' }}
                  required
                />
              </>
            )}

            {(mode === 'login' || step === 'password') && (
              <>
                <label className="auth-label" htmlFor="password">
                  {mode === 'login' ? 'Password' : 'New password'}
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <LockIcon />
                  </span>
                  <input
                    id="password"
                    className="has-icon has-icon-right"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'login' ? '••••••••' : 'At least 8 characters'}
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
              </>
            )}

            {mode !== 'login' && step === 'password' && (
              <>
                <label className="auth-label" htmlFor="confirmPassword">
                  Confirm password
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <LockIcon />
                  </span>
                  <input
                    id="confirmPassword"
                    className="has-icon"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat the password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign in'
                : step === 'details'
                ? 'Send verification code'
                : step === 'otp'
                ? 'Verify code'
                : isSignup
                ? 'Create account'
                : 'Save new password'}
            </button>

            {mode !== 'login' && step === 'otp' && (
              <button
                type="button"
                className="btn-muted"
                style={{ marginTop: 10 }}
                disabled={loading || cooldown > 0}
                onClick={handleResend}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            )}
          </form>

          {mode === 'login' && (
            <p className="auth-toggle" style={{ marginBottom: 0 }}>
              <a href="#" onClick={(e) => { e.preventDefault(); switchMode('reset'); }}>
                Forgot password?
              </a>
            </p>
          )}

          <p className="auth-toggle">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                switchMode(mode === 'login' ? 'signup' : 'login');
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
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
