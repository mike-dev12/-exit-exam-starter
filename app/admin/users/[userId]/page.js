'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import { deleteUserAccount } from '../../../../lib/deleteUser';

export default function AdminUserDetail() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targetProfile, setTargetProfile] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [studentCourseIds, setStudentCourseIds] = useState(new Set());
  const [lecturerCourseIds, setLecturerCourseIds] = useState(new Set());
  const [role, setRole] = useState('student');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [perf, setPerf] = useState(null);
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

      await loadPerformance(courses || []);

      setLoading(false);
    }
    load();
  }, [userId, router]);

  // Every mock attempt this person has made, across ALL courses and
  // general mocks, rolled up into one overall picture.
  async function loadPerformance(courses) {
    const { data: rows } = await supabase
      .from('results')
      .select('id, mock_id, score, total_questions, taken_at')
      .eq('student_id', userId)
      .order('taken_at', { ascending: false });
    const results = rows || [];

    if (results.length === 0) {
      setPerf({ attempts: 0 });
      return;
    }

    const mockIds = [...new Set(results.map((r) => r.mock_id))];
    const { data: mockRows } = await supabase
      .from('mocks')
      .select('id, title, course_id, is_general')
      .in('id', mockIds);
    const mockById = {};
    (mockRows || []).forEach((m) => {
      mockById[m.id] = m;
    });
    const courseName = {};
    courses.forEach((c) => {
      courseName[c.id] = c.name;
    });

    const attempts = results.map((r) => {
      const m = mockById[r.mock_id];
      const pct = r.total_questions
        ? Math.round((r.score / r.total_questions) * 100)
        : 0;
      const where = !m
        ? 'Deleted mock'
        : m.is_general
        ? 'General mocks'
        : courseName[m.course_id] || 'Unknown course';
      return {
        id: r.id,
        title: m ? m.title : '(deleted mock)',
        where,
        score: r.score,
        total: r.total_questions,
        pct,
        taken_at: r.taken_at,
      };
    });

    const groups = {};
    attempts.forEach((a) => {
      if (!groups[a.where]) groups[a.where] = [];
      groups[a.where].push(a.pct);
    });
    const avgOf = (list) =>
      Math.round(list.reduce((x, y) => x + y, 0) / list.length);
    const byCourse = Object.entries(groups)
      .map(([name, list]) => ({ name, attempts: list.length, avg: avgOf(list) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setPerf({
      attempts: attempts.length,
      avg: avgOf(attempts.map((a) => a.pct)),
      best: Math.max(...attempts.map((a) => a.pct)),
      last: attempts[0].taken_at,
      byCourse,
      recent: attempts.slice(0, 30),
    });
  }

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

  async function handleDeleteUser() {
    const label = targetProfile?.full_name || '(no name)';
    if (
      !window.confirm(
        `Delete ${role} "${label}"?\n\n` +
          'Their login, profile, and all their results will be permanently deleted. ' +
          'This cannot be undone.'
      )
    )
      return;
    setMessage('');
    setDeleting(true);
    const err = await deleteUserAccount(userId);
    setDeleting(false);
    if (err) {
      setMessage('Error: ' + err);
      return;
    }
    router.push('/admin');
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

      <h3 style={{ marginTop: 24 }}>Overall Performance</h3>
      {perf && perf.attempts === 0 && (
        <p className="subtitle">No mock attempts yet.</p>
      )}
      {perf && perf.attempts > 0 && (
        <>
          <p className="subtitle">
            {perf.attempts} attempt{perf.attempts === 1 ? '' : 's'} · {perf.avg}% average ·
            best {perf.best}% · last activity {new Date(perf.last).toLocaleString()}
          </p>
          <div className="progress-bar-track" style={{ marginBottom: 16 }}>
            <div className="progress-bar-fill" style={{ width: `${perf.avg}%` }} />
          </div>

          <h4 style={{ marginTop: 16 }}>By course</h4>
          {perf.byCourse.map((row) => (
            <div
              key={row.name}
              className="question-card"
              style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
            >
              <span>{row.name}</span>
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                {row.attempts} attempt{row.attempts === 1 ? '' : 's'} · {row.avg}%
              </span>
            </div>
          ))}

          <h4 style={{ marginTop: 16 }}>Recent attempts</h4>
          {perf.recent.map((a) => (
            <div
              key={a.id}
              className="question-card"
              style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
            >
              <span>
                <strong>{a.title}</strong>
                <br />
                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  {a.where} · {new Date(a.taken_at).toLocaleString()}
                </span>
              </span>
              <span>
                {a.score}/{a.total} ({a.pct}%)
              </span>
            </div>
          ))}
        </>
      )}

      <h3 style={{ marginTop: 24 }}>Role</h3>
      {message && <div className="subtitle">{message}</div>}
      <select value={role} onChange={(e) => setRole(e.target.value)} style={{ marginBottom: 10 }}>
        <option value="student">student</option>
        <option value="lecturer">lecturer</option>
        <option value="admin">admin</option>
      </select>
      <button onClick={saveRole}>Save Role</button>

      <h3 style={{ marginTop: 24 }}>Student access (every course is added automatically; untick one to hide it from this student)</h3>
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

      {targetProfile?.role !== 'admin' && (
        <>
          <h3 style={{ marginTop: 24 }}>Danger zone</h3>
          {message && <div className="error">{message}</div>}
          <button className="btn-danger" disabled={deleting} onClick={handleDeleteUser}>
            {deleting ? 'Deleting...' : 'Delete this user'}
          </button>
        </>
      )}

      <button
        className="btn-muted"
        style={{ marginTop: 16 }}
        onClick={() => router.push('/admin')}
      >
        Back to Admin Dashboard
      </button>
    </div>
  );
}
