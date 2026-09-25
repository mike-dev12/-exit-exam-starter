'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

export default function LecturerCourse() {
  const [course, setCourse] = useState(null);
  const [mocks, setMocks] = useState([]);
  const [newMockTitle, setNewMockTitle] = useState('');
  const [newMockDuration, setNewMockDuration] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId;

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

      let ok = false;
      if (profileData?.role === 'admin') {
        ok = true;
      } else if (profileData?.role === 'lecturer') {
        const { data: assignment } = await supabase
          .from('lecturer_courses')
          .select('course_id')
          .eq('lecturer_id', userData.user.id)
          .eq('course_id', courseId)
          .maybeSingle();
        ok = !!assignment;
      }

      if (!ok) {
        router.push('/lecturer');
        return;
      }
      setAuthorized(true);

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      setCourse(courseData);

      loadMocks();
      setLoading(false);
    }
    load();
  }, [courseId, router]);

  async function loadMocks() {
    const { data } = await supabase
      .from('mocks')
      .select('*')
      .eq('course_id', courseId)
      .order('title');
    setMocks(data || []);
  }

  async function handleAddMock(e) {
    e.preventDefault();
    setError('');
    if (!newMockTitle.trim()) return;

    const { error } = await supabase.from('mocks').insert({
      course_id: courseId,
      title: newMockTitle.trim(),
      duration_minutes: Number(newMockDuration) || 30,
    });

    if (error) {
      setError(error.message);
      return;
    }
    setNewMockTitle('');
    setNewMockDuration(30);
    loadMocks();
  }

  if (loading || !authorized) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h1>{course ? course.name : 'Course'}</h1>
      <p className="subtitle">Manage mocks for this course.</p>

      <h3 style={{ marginTop: 24 }}>Mocks</h3>
      {mocks.length === 0 && <p className="subtitle">No mocks yet.</p>}
      {mocks.map((mock) => (
        <Link key={mock.id} href={`/lecturer/mocks/${mock.id}`}>
          <button style={{ marginBottom: 10, textAlign: 'left' }}>
            {mock.title}
            <span style={{ float: 'right', fontWeight: 'normal' }}>
              {mock.duration_minutes} min
            </span>
          </button>
        </Link>
      ))}

      <h3 style={{ marginTop: 24 }}>Add a Mock</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleAddMock}>
        <input
          type="text"
          placeholder="Mock title (e.g. Mock 2)"
          value={newMockTitle}
          onChange={(e) => setNewMockTitle(e.target.value)}
        />
        <label>Time limit (minutes): </label>
        <input
          type="number"
          min="1"
          value={newMockDuration}
          onChange={(e) => setNewMockDuration(e.target.value)}
          style={{ marginBottom: 14 }}
        />
        <button type="submit">Add Mock</button>
      </form>

      <button
        className="btn-muted"
        style={{ marginTop: 12 }}
        onClick={() => router.push('/lecturer')}
      >
        Back to Lecturer Dashboard
      </button>
    </div>
  );
}
