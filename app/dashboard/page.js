'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/login');
        return;
      }
      setUser(data.user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      setProfile(profileData);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h1>Welcome back</h1>
      <p className="subtitle">
        {profile?.full_name || user.email}
        {profile?.role && ` — ${profile.role}`}
      </p>

      <Link href="/courses">
        <button>Courses</button>
      </Link>

      <Link href="/results">
        <button style={{ background: '#0f766e', marginTop: 10 }}>
          My Results
        </button>
      </Link>

      {(profile?.role === 'lecturer' || profile?.role === 'admin') && (
        <Link href="/lecturer">
          <button style={{ background: '#0f766e', marginTop: 10 }}>
            Lecturer Dashboard
          </button>
        </Link>
      )}

      {profile?.role === 'admin' && (
        <Link href="/admin">
          <button style={{ background: '#7c3aed', marginTop: 10 }}>
            Admin Dashboard
          </button>
        </Link>
      )}

      <button
        style={{ background: '#666', marginTop: 12 }}
        onClick={handleLogout}
      >
        Log Out
      </button>
    </div>
  );
}
