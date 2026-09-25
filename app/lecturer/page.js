'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function LecturerHome() {
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [courses, setCourses] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (!profileData || (profileData.role !== 'lecturer' && profileData.role !== 'admin')) {
        setChecking(false);
        return;
      }

      setProfile(profileData);
      setChecking(false);

      if (profileData.role === 'admin') {
        // Admins see every course
        const { data } = await supabase.from('courses').select('*').order('name');
        setCourses(data || []);
      } else {
        // Lecturers see only their assigned courses
        const { data } = await supabase
          .from('lecturer_courses')
          .select('course_id, courses ( id, name )')
          .eq('lecturer_id', userData.user.id);
        setCourses((data || []).map((row) => row.courses).filter(Boolean));
      }
    }
    load();
  }, [router]);

  if (checking) return <div className="container">Loading...</div>;

  if (!profile) {
    return (
      <div className="container">
        <h1>Not authorized</h1>
        <p className="subtitle">
          This account does not have lecturer access.
        </p>
        <button onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Lecturer Dashboard</h1>
      <p className="subtitle">
        {profile.role === 'admin'
          ? 'All courses (admin view).'
          : 'Your assigned courses.'}
      </p>

      <h3 style={{ marginTop: 24 }}>Courses</h3>
      {courses.length === 0 && (
        <p className="subtitle">
          No courses assigned to you yet. Ask your administrator.
        </p>
      )}
      {courses.map((course) => (
        <Link key={course.id} href={`/lecturer/courses/${course.id}`}>
          <button style={{ marginBottom: 10 }}>{course.name}</button>
        </Link>
      ))}

      <button
        className="btn-muted"
        style={{ marginTop: 12 }}
        onClick={() => router.push('/dashboard')}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
