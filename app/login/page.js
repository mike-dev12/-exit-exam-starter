'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="container">
      <h1>{isSignup ? 'Create Account' : 'Student Login'}</h1>
      <p className="subtitle">
        {isSignup
          ? 'Sign up to start practicing.'
          : 'Log in to continue your exam prep.'}
      </p>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {isSignup && (
          <>
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
            <input
              type="text"
              placeholder="University"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
            />
            <input
              type="text"
              placeholder="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            <input
              type="text"
              placeholder="Year (e.g. 5th Year)"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Log In'}
        </button>
      </form>

      <p style={{ marginTop: 16, fontSize: '0.9rem' }}>
        {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
        <a href="#" onClick={() => setIsSignup(!isSignup)}>
          {isSignup ? 'Log in' : 'Sign up'}
        </a>
      </p>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="container">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
