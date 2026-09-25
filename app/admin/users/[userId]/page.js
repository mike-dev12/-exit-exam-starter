'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

export default function AdminUserDetail() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targetProfile, setTargetProfile] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [studentCourseIds, setStudentCourseIds] = useState(new Set());
  const [lecturerCourseIds, setLecturerCourseIds] = useState(new Set());
  const [role, setRole] = useState('student');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const params = useParams();
  const userId = params.userId;

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (myProfile?.role !== 'admin') {
        setLoading(false);
        return;
      }
      setAuthorized(true);

      const { data: target } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setTargetProfile(target);
      setRole(target?.role || 'student');

      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .order('name');
      setAllCourses(courses || []);

      const { data: sc } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', userId);
      setStudentCourseIds(new Set((sc || []).map((r) => r.course_id)));

      const { data: lc } = await supabase
        .from('lecturer_courses')
        .select('course_id')
        .eq('lecturer_id', userId);
      setLecturerCourseIds(new Set((lc || []).map((r) => r.course_id)));

      setLoading(false);
    }
    load();
  }, [userId, router]);

  async function toggleStudentCourse(courseId) {
    const isAssigned = studentCourseIds.has(courseId);
    if (isAssigned) {
      await supabase
        .from('student_courses')
        .delete()
        .eq('student_id', userId)
        .eq('course_id', courseId);
    } else {
      await supabase
        .from('student_courses')
        .insert({ student_id: userId, course_id: courseId });
    }
    const next = new Set(studentCourseIds);
    isAssigned ? next.delete(courseId) : next.add(courseId);
    setStudentCourseIds(next);
  }

  async function toggleLecturerCourse(courseId) {
    const isAssigned = lecturerCourseIds.has(courseId);
    if (isAssigned) {
      await supabase
        .from('lecturer_courses')
        .delete()
        .eq('lecturer_id', userId)
        .eq('course_id', courseId);
    } else {
      await supabase
        .from('lecturer_courses')
        .insert({ lecturer_id: userId, course_id: courseId });
    }
    const next = new Set(lecturerCourseIds);
    isAssigned ? next.delete(courseId) : next.add(courseId);
    setLecturerCourseIds(next);
  }

  async function saveRole() {
    setMessage('');
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Role updated.');
    }
  }

  if (loading) return <div className="container">Loading...</div>;

  if (!authorized) {
    return (
      <div className="container">
        <h1>Not authorized</h1>
        <button onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1>{targetProfile?.full_name || '(no name)'}</h1>
      <p className="subtitle">
        Student ID: {targetProfile?.student_id || '—'} | University:{' '}
        {targetProfile?.university || '—'} | Department:{' '}
        {targetProfile?.department || '—'} | Year: {targetProfile?.year || '—'}
      </p>

      <h3 style={{ marginTop: 24 }}>Role</h3>
      {message && <div className="subtitle">{message}</div>}
      <select value={role} onChange={(e) => setRole(e.target.value)} style={{ marginBottom: 10 }}>
        <option value="student">student</option>
        <option value="lecturer">lecturer</option>
        <option value="admin">admin</option>
      </select>
      <button onClick={saveRole}>Save Role</button>

      <h3 style={{ marginTop: 24 }}>Assign as Student (courses they can practice)</h3>
      {allCourses.map((c) => (
        <label key={c.id} style={{ display: 'block', marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={studentCourseIds.has(c.id)}
            onChange={() => toggleStudentCourse(c.id)}
            style={{ width: 'auto', marginRight: 8 }}
          />
          {c.name}
        </label>
      ))}

      <h3 style={{ marginTop: 24 }}>Assign as Lecturer (courses they can manage)</h3>
      {allCourses.map((c) => (
        <label key={c.id} style={{ display: 'block', marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={lecturerCourseIds.has(c.id)}
            onChange={() => toggleLecturerCourse(c.id)}
            style={{ width: 'auto', marginRight: 8 }}
          />
          {c.name}
        </label>
      ))}

      <button
        style={{ background: '#666', marginTop: 16 }}
        onClick={() => router.push('/admin')}
      >
        Back to Admin Dashboard
      </button>
    </div>
  );
}
