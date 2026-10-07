'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { courseIcon, courseStatus, ACCENTS } from '../../lib/courseMeta';
import EcgStrip from '../components/EcgStrip';

const RING_R = 64;
const RING_C = 2 * Math.PI * RING_R;

function tierFor(p) {
  if (p === null) {
    return {
      label: 'Not started',
      line: 'Take your first mock exam to start tracking your readiness.',
    };
  }
  if (p < 40) {
    return {
      label: 'Building foundations',
      line: 'Every practice session counts. Keep going, one course at a time.',
    };
  }
  if (p < 60) {
    return {
      label: 'Getting there',
      line: 'Good momentum. Target your weaker courses to lift your score.',
    };
  }
  if (p < 80) {
    return {
      label: 'On track',
      line: 'You are on track. Mix in general mocks to simulate exam day.',
    };
  }
  return {
    label: 'Exam ready',
    line: 'Excellent work! Keep revising and stay sharp for exam day.',
  };
}

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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading your dashboard...</span>
      </div>
    );
  }

  const firstName = (profile?.full_name || user.email).split(' ')[0];
  const tier = tierFor(overallProgress);
  const ringValue = overallProgress === null ? 0 : overallProgress;
  const ringOffset = RING_C * (1 - ringValue / 100);

  // Optional exam countdown: set NEXT_PUBLIC_EXAM_DATE=YYYY-MM-DD to show it
  let daysLeft = null;
  const examDate = process.env.NEXT_PUBLIC_EXAM_DATE;
  if (examDate) {
    const d = new Date(examDate);
    if (!Number.isNaN(d.getTime())) {
      const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
      if (diff >= 0) daysLeft = diff;
    }
  }

  const primary = lastMockId
    ? { href: `/quiz/${lastMockId}`, label: 'Continue last mock' }
    : { href: '/courses', label: 'Start practicing' };

  const scored = courses.filter((c) => typeof progressByCourse[c.id] === 'number');
  const coursesStarted = scored.filter((c) => progressByCourse[c.id] > 0).length;
  const weakest = scored
    .slice()
    .sort((a, b) => progressByCourse[a.id] - progressByCourse[b.id])[0];

  let focus = null;
  if (courses.length > 0) {
    if (mocksTaken === 0) {
      focus = {
        title: `Start with ${courses[0].name}`,
        desc: 'Take your first practice mock to set your baseline.',
        href: `/courses/${courses[0].id}`,
        cta: 'Start now',
      };
    } else if (weakest && progressByCourse[weakest.id] < 70) {
      focus = {
        title: `Focus on ${weakest.name}`,
        desc: `Your progress there is ${progressByCourse[weakest.id]}%. A few focused sessions can lift it fast.`,
        href: `/courses/${weakest.id}`,
        cta: 'Practice now',
      };
    } else {
      focus = {
        title: 'Test yourself across all courses',
        desc: 'Your courses look strong. Try a General Mock to simulate the real exam.',
        href: '/general-mocks',
        cta: 'Take a mock',
      };
    }
  }

  return (
    <div className="dash">
      {/* ---------- Hero: welcome + readiness ring + live ECG ---------- */}
      <section className="dash-hero reveal reveal-1">
        <div className="dash-hero-text">
          <span className="dash-eyebrow">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 9L12 4 2 9l10 5 10-5z" />
              <path d="M6 11.5V16c0 1.2 2.7 3 6 3s6-1.8 6-3v-4.5" />
            </svg>
            {profile?.department || 'Biomedical Engineering'} · Exit exam prep
          </span>
          <h1>Welcome back, {firstName}</h1>
          <p className="dash-hero-line">{tier.line}</p>

          <div className="dash-hero-actions">
            <Link href={primary.href} className="dash-btn dash-btn-primary">
              {primary.label} →
            </Link>
            <Link href="/general-mocks" className="dash-btn dash-btn-ghost">
              Take a mock exam
            </Link>
          </div>

          {daysLeft !== null && (
            <span className="dash-countdown">
              🗓 {daysLeft === 0 ? 'Exam day is today!' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} to your exam`}
            </span>
          )}
        </div>

        <div className="dash-ring-wrap">
          <div className="dash-ring">
            <svg viewBox="0 0 160 160">
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5eead4" />
                  <stop offset="55%" stopColor="#67e8f9" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
              <circle className="dash-ring-track" cx="80" cy="80" r={RING_R} />
              <circle
                className="dash-ring-bar"
                cx="80"
                cy="80"
                r={RING_R}
                strokeDasharray={RING_C}
                style={{ '--circ': RING_C, '--off': ringOffset }}
              />
            </svg>
            <div className="dash-ring-center">
              <span className="dash-ring-num">
                {overallProgress === null ? '—' : overallProgress}
                {overallProgress !== null && <small>%</small>}
              </span>
              <span className="dash-ring-label">Readiness</span>
            </div>
          </div>
          <span className="dash-ring-tier">{tier.label}</span>
        </div>

        <EcgStrip className="dash-hero-ecg" />
      </section>

      {/* ---------- Stats ---------- */}
      <section className="dash-stats reveal reveal-2">
        <div className="dash-stat" style={{ '--c': '#2dd4bf' }}>
          <span className="dash-stat-icon">📝</span>
          <span className="dash-stat-num">{questionsPracticed}</span>
          <span className="dash-stat-label">Questions practiced</span>
        </div>
        <div className="dash-stat" style={{ '--c': '#60a5fa' }}>
          <span className="dash-stat-icon">🧪</span>
          <span className="dash-stat-num">{mocksTaken}</span>
          <span className="dash-stat-label">Mock exams taken</span>
        </div>
        <div className="dash-stat" style={{ '--c': '#a78bfa' }}>
          <span className="dash-stat-icon">🎯</span>
          <span className="dash-stat-num">{averageScore !== null ? `${averageScore}%` : '—'}</span>
          <span className="dash-stat-label">Average score</span>
        </div>
        <div className="dash-stat" style={{ '--c': '#fbbf24' }}>
          <span className="dash-stat-icon">📚</span>
          <span className="dash-stat-num">
            {coursesStarted}
            <small>/{courses.length}</small>
          </span>
          <span className="dash-stat-label">Courses started</span>
        </div>
      </section>

      {/* ---------- Smart suggestion ---------- */}
      {focus && (
        <section className="dash-focus reveal reveal-3">
          <span className="dash-focus-icon">🎯</span>
          <div className="dash-focus-text">
            <span className="dash-focus-kicker">Focus next</span>
            <strong>{focus.title}</strong>
            <span>{focus.desc}</span>
          </div>
          <Link href={focus.href} className="dash-btn dash-btn-primary">
            {focus.cta} →
          </Link>
        </section>
      )}

      {/* ---------- Courses ---------- */}
      <h2 className="section-heading">Your courses</h2>
      {courses.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📚</span>
          <span className="empty-state-title">No courses yet</span>
          <span className="empty-state-desc">
            Courses appear here automatically as soon as they are added.
          </span>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map((course, i) => {
            const pct = progressByCourse[course.id];
            const status = courseStatus(pct);
            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="course-card"
                style={{ '--accent': ACCENTS[i % ACCENTS.length] }}
              >
                <div className="course-card-top">
                  <span className="course-card-icon">{courseIcon(course.name)}</span>
                  <span className={`course-chip tone-${status.tone}`}>{status.label}</span>
                </div>
                <div className="course-card-name">{course.name}</div>
                <div className="course-card-bar">
                  <div className="course-card-fill" style={{ width: `${pct || 0}%` }} />
                </div>
                <div className="course-card-foot">
                  <span>{pct !== null && pct !== undefined ? `${pct}% mastered` : 'No mocks yet'}</span>
                  <span className="course-card-go">Continue →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ---------- Quick actions ---------- */}
      <h2 className="section-heading">Quick actions</h2>
      <div className="quick-actions-grid">
        <Link href="/courses" className="quick-action">
          <span className="quick-action-icon">📚</span>
          Browse Courses
        </Link>

        <Link href="/general-mocks" className="quick-action">
          <span className="quick-action-icon">🧪</span>
          General Mocks
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
    </div>
  );
}
