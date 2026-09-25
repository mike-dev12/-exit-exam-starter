'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function AdminHome() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [courses, setCourses] = useState([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
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
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileData?.role !== 'admin') {
        setChecking(false);
        return;
      }

      setAuthorized(true);
      setChecking(false);
      loadCourses();
      loadUsers();
    }
    load();
  }, [router]);

  async function loadCourses() {
    const { data } = await supabase.from('courses').select('*').order('name');
    setCourses(data || []);
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('role')
      .order('full_name');
    setUsers(data || []);
  }

  async function handleAddCourse(e) {
    e.preventDefault();
    setError('');
    if (!newCourseName.trim()) return;

    const { error } = await supabase
      .from('courses')
      .insert({ name: newCourseName.trim() });

    if (error) {
      setError(error.message);
      return;
    }
    setNewCourseName('');
    loadCourses();
  }

  if (checking) return <div className="container">Loading...</div>;

  if (!authorized) {
    return (
      <div className="container">
        <h1>Not authorized</h1>
        <p className="subtitle">This account does not have admin access.</p>
        <button onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1>Admin Dashboard</h1>
      <p className="subtitle">Manage courses and assign users to them.</p>

      <h3 style={{ marginTop: 24 }}>Courses</h3>
      {courses.length === 0 && <p className="subtitle">No courses yet.</p>}
      {courses.map((course) => (
        <div key={course.id} className="question-card">
          {course.name}
        </div>
      ))}

      <h3 style={{ marginTop: 24 }}>Add a Course</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleAddCourse}>
        <input
          type="text"
          placeholder="Course name"
          value={newCourseName}
          onChange={(e) => setNewCourseName(e.target.value)}
        />
        <button type="submit">Add Course</button>
      </form>

      <h3 style={{ marginTop: 24 }}>Users</h3>
      {users.map((u) => (
        <Link key={u.id} href={`/admin/users/${u.id}`}>
          <div
            className="question-card"
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
          >
            <span>{u.full_name || '(no name)'}</span>
            <span style={{ color: '#666', fontSize: '0.85rem' }}>{u.role}</span>
          </div>
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
