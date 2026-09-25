'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

export default function LecturerCourse() {
  const [course, setCourse] = useState(null);
  const [mocks, setMocks] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [roster, setRoster] = useState([]);
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

      const { data: questionsData } = await supabase
        .from('questions')
        .select('id')
        .eq('course_id', courseId);
      setQuestionCount((questionsData || []).length);

      await loadMocks();
      await loadRoster();
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

  async function loadRoster() {
    const { data: scRows } = await supabase
      .from('student_courses')
      .select('student_id, profiles ( id, full_name )')
      .eq('course_id', courseId);

    const students = (scRows || [])
      .map((r) => r.profiles)
      .filter(Boolean);

    const { data: mocksData } = await supabase
      .from('mocks')
      .select('id')
      .eq('course_id', courseId);
    const mockIds = (mocksData || []).map((m) => m.id);

    let results = [];
    if (mockIds.length > 0) {
      const { data } = await supabase
        .from('results')
        .select('student_id, score, total_questions')
        .in('mock_id', mockIds);
      results = data || [];
    }

    const byStudent = {};
    results.forEach((r) => {
      if (!byStudent[r.student_id]) byStudent[r.student_id] = [];
      byStudent[r.student_id].push((r.score / r.total_questions) * 100);
    });

    const rosterWithStats = students.map((s) => {
      const scores = byStudent[s.id] || [];
      const avg =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;
      return {
        id: s.id,
        name: s.full_name || '(no name)',
        attempts: scores.length,
        avg,
      };
    });

    rosterWithStats.sort((a, b) => a.name.localeCompare(b.name));
    setRoster(rosterWithStats);
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
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{course ? course.name : 'Course'}</h1>
        <p className="subtitle">Manage this course.</p>
      </div>

      <div className="hub-grid">
        <a href="#mocks" className="hub-card">
          <span className="hub-card-icon">📝</span>
          <h3>Questions</h3>
          <p>{questionCount} question{questionCount === 1 ? '' : 's'} total</p>
        </a>

        <a href="#mocks" className="hub-card">
          <span className="hub-card-icon">🗂️</span>
          <h3>Mock Exams</h3>
          <p>
            {mocks.length === 0
              ? 'No mock exams yet'
              : `${mocks.length} mock exam${mocks.length === 1 ? '' : 's'}`}
          </p>
        </a>

        <div className="hub-card disabled">
          <span className="hub-card-icon">📖</span>
          <h3>Study Materials</h3>
          <p>Upload notes and key concepts</p>
          <span className="hub-badge">Coming soon</span>
        </div>

        <div className="hub-card disabled">
          <span className="hub-card-icon">🏷️</span>
          <h3>Topics</h3>
          <p>Tag questions by topic</p>
          <span className="hub-badge">Coming soon</span>
        </div>

        <a href="#performance" className="hub-card">
          <span className="hub-card-icon">📊</span>
          <h3>Student Performance</h3>
          <p>
            {roster.length === 0
              ? 'No students enrolled yet'
              : `${roster.length} student${roster.length === 1 ? '' : 's'} enrolled`}
          </p>
        </a>
      </div>

      <h2 className="section-heading" id="mocks">
        Mock Exams
      </h2>
      {mocks.length === 0 && <p className="subtitle">No mocks yet.</p>}
      {mocks.length > 0 && (
        <div className="course-list" style={{ marginBottom: 24 }}>
          {mocks.map((mock) => (
            <div key={mock.id} className="course-row">
              <div className="course-row-top">
                <div>
                  <div className="course-row-name">{mock.title}</div>
                  <div className="course-row-progress">
                    {mock.duration_minutes} min
                  </div>
                </div>
                <Link href={`/lecturer/mocks/${mock.id}`} className="course-row-link">
                  Manage →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: 8 }}>Add a Mock</h3>
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

      <h2 className="section-heading" id="performance" style={{ marginTop: 40 }}>
        Student Performance
      </h2>
      {roster.length === 0 ? (
        <p className="subtitle">No students enrolled in this course yet.</p>
      ) : (
        <div className="course-list">
          {roster.map((s) => (
            <div key={s.id} className="course-row">
              <div className="course-row-top">
                <div>
                  <div className="course-row-name">{s.name}</div>
                  <div className="course-row-progress">
                    {s.attempts > 0
                      ? `${s.attempts} attempt${s.attempts === 1 ? '' : 's'} · ${s.avg}% average`
                      : 'No attempts yet'}
                  </div>
                </div>
              </div>
              {s.attempts > 0 && (
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${s.avg}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        className="btn-muted"
        style={{ marginTop: 24 }}
        onClick={() => router.push('/lecturer')}
      >
        Back to Lecturer Dashboard
      </button>
    </div>
  );
}
