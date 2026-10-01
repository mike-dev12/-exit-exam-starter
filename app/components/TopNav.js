'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

// Pages where the nav bar should NOT appear
const HIDDEN_ON = ['/', '/login'];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (HIDDEN_ON.includes(pathname)) return;

    let active = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (active) setLoaded(true);
        return;
      }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle();
      if (active) {
        setProfile({ ...profileData, email: userData.user.email });
        setLoaded(true);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [pathname]);

  if (HIDDEN_ON.includes(pathname)) return null;
  if (!loaded) return <div className="topnav-placeholder" />;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="topnav">
      <div className="topnav-inner">
        <Link href="/dashboard" className="topnav-logo">
          Bio<span>Path</span>
        </Link>

        <div className="topnav-links">
          <Link href="/dashboard" className="topnav-link">
            Dashboard
          </Link>
          <Link href="/courses" className="topnav-link">
            Courses
          </Link>
          <Link href="/results" className="topnav-link">
            Results
          </Link>
          {(profile?.role === 'lecturer' || profile?.role === 'admin') && (
            <Link href="/lecturer" className="topnav-link">
              Lecturer
            </Link>
          )}
          {profile?.role === 'admin' && (
            <Link href="/admin" className="topnav-link">
              Admin
            </Link>
          )}
        </div>

        <div className="topnav-right">
          <span className="topnav-user">
            {profile?.full_name || profile?.email}
          </span>
          <button className="topnav-logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
