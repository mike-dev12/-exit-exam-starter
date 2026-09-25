'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [progressByCourse, setProgressByCourse] = useState({});
  const [overallProgress, setOverallProgress] = useState(null);
  const [questionsPracticed, setQuestionsPracticed] = useState(0);
  const [mocksTaken, setMocksTaken] = useState(0);
  const [averageScore, setAverageScore] = useState(null);
  const [lastMockId, setLastMockId] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }
      setUser(userData.user);
      const studentId = userData.user.id;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .maybeSingle();
      setProfile(profileData);

      const { data: scRows } = await supabase
        .from('student_courses')
        .select('course_id, courses ( id, name )')
        .eq('student_id', studentId);

      const courseList = (scRows || []).map((row) => row.courses).filter(Boolean);
      setCourses(courseList);

      let mocksData = [];
      if (courseList.length > 0) {
        const courseIds = courseList.map((c) => c.id);
        const { data } = await supabase
          .from('mocks')
          .select('id, course_id')
          .in('course_id', courseIds);
        mocksData = data || [];
      }

      const { data: resultsData } = await supabase
        .from('results')
        .select('mock_id, score, total_questions, taken_at')
        .eq('student_id', studentId)
        .order('taken_at', { ascending: false });

      const results = resultsData || [];

      // Overall activity stats (across every attempt, every course)
      if (results.length > 0) {
        const totalQuestions = results.reduce((sum, r) => sum + r.total_questions, 0);
        const avgPct =
          results.reduce((sum, r) => sum + (r.score / r.total_questions) * 100, 0) /
          results.length;

        setQuestionsPracticed(totalQuestions);
        setMocksTaken(results.length);
        setAverageScore(Math.round(avgPct));
        setLastMockId(results[0].mock_id);
      }

      // Best score per mock, for per-course progress
      const bestByMock = {};
      results.forEach((r) => {
        const pct = (r.score / r.total_questions) * 100;
        if (!bestByMock[r.mock_id] || pct > bestByMock[r.mock_id]) {
          bestByMock[r.mock_id] = pct;
        }
      });

      const progress = {};
      courseList.forEach((course) => {
        const mocksInCourse = mocksData.filter((m) => m.course_id === course.id);
        if (mocksInCourse.length === 0) {
          progress[course.id] = null;
          return;
        }
        const total = mocksInCourse.reduce((sum, m) => sum + (bestByMock[m.id] || 0), 0);
        progress[course.id] = Math.round(total / mocksInCourse.length);
      });
      setProgressByCourse(progress);

      const scoredCourses = Object.values(progress).filter((p) => p !== null);
      if (scoredCourses.length > 0) {
        setOverallProgress(
          Math.round(scoredCourses.reduce((sum, p) => sum + p, 0) / scoredCourses.length)
        );
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <div className="container">Loading...</div>;

  const firstName = (profile?.full_name || user.email).split(' ')[0];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {firstName}</h1>
        <p className="subtitle">
          Continue your {profile?.department ? `${profile.department} ` : ''}
          exit exam preparation.
        </p>
      </div>

      <div className="stats-card">
        {overallProgress !== null ? (
          <div className="stats-card-top">
            <span className="stats-big-num">{overallProgress}%</span>
            <span className="stats-big-label">Overall progress</span>
          </div>
        ) : (
          <p className="subtitle" style={{ marginBottom: 20 }}>
            No attempts yet — take your first mock exam to start tracking
            your progress.
          </p>
        )}

        <div className="stats-grid">
          <div>
            <span className="stats-num">{questionsPracticed}</span>
            <span className="stats-label">Questions practiced</span>
          </div>
          <div>
            <span className="stats-num">{mocksTaken}</span>
            <span className="stats-label">Mock exams taken</span>
          </div>
          <div>
            <span className="stats-num">
              {averageScore !== null ? `${averageScore}%` : '—'}
            </span>
            <span className="stats-label">Average score</span>
          </div>
        </div>
      </div>

      <h2 className="section-heading">My Courses</h2>
      {courses.length === 0 ? (
        <p className="subtitle" style={{ marginBottom: 36 }}>
          No courses assigned yet. Ask your administrator to assign you to a
          course.
        </p>
      ) : (
        <div className="course-list">
          {courses.map((course) => {
            const pct = progressByCourse[course.id];
            return (
              <div key={course.id} className="course-row">
                <div className="course-row-top">
                  <div>
                    <div className="course-row-name">{course.name}</div>
                    <div className="course-row-progress">
                      {pct !== null && pct !== undefined
                        ? `${pct}% progress`
                        : 'Not started'}
                    </div>
                  </div>
                  <Link href={`/courses/${course.id}`} className="course-row-link">
                    Continue →
                  </Link>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${pct || 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="section-heading">Quick actions</h2>
      <div className="quick-actions-grid">
        <Link href="/courses" className="quick-action">
          <span className="quick-action-icon">📚</span>
          Browse Courses
        </Link>

        {lastMockId && (
          <Link href={`/quiz/${lastMockId}`} className="quick-action">
            <span className="quick-action-icon">⏱️</span>
            Continue Last Mock
          </Link>
        )}

        <Link href="/results" className="quick-action">
          <span className="quick-action-icon">📊</span>
          My Results
        </Link>

        {(profile?.role === 'lecturer' || profile?.role === 'admin') && (
          <Link href="/lecturer" className="quick-action">
            <span className="quick-action-icon">🎓</span>
            Lecturer Dashboard
          </Link>
        )}

        {profile?.role === 'admin' && (
          <Link href="/admin" className="quick-action">
            <span className="quick-action-icon">⚙️</span>
            Admin Dashboard
          </Link>
        )}
      </div>

      <button className="btn-muted" onClick={handleLogout}>
        Log Out
      </button>
    </div>
  );
}
