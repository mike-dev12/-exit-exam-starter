'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function CourseHub() {
  const [course, setCourse] = useState(null);
  const [mocks, setMocks] = useState([]);
  const [bestByMock, setBestByMock] = useState({});
  const [courseProgress, setCourseProgress] = useState(null);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [avgScore, setAvgScore] = useState(null);
  const [loading, setLoading] = useState(true);
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
      const studentId = userData.user.id;

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      setCourse(courseData);

      const { data: mocksData, error } = await supabase
        .from('mocks')
        .select('*')
        .eq('course_id', courseId)
        .order('title');

      const mocksList = !error ? mocksData || [] : [];
      setMocks(mocksList);

      if (mocksList.length > 0) {
        const mockIds = mocksList.map((m) => m.id);
        const { data: resultsData } = await supabase
          .from('results')
          .select('mock_id, score, total_questions')
          .eq('student_id', studentId)
          .in('mock_id', mockIds);

        const results = resultsData || [];

        const best = {};
        results.forEach((r) => {
          const pct = (r.score / r.total_questions) * 100;
          if (!best[r.mock_id] || pct > best[r.mock_id]) {
            best[r.mock_id] = pct;
          }
        });
        setBestByMock(best);

        const total = mocksList.reduce((sum, m) => sum + (best[m.id] || 0), 0);
        setCourseProgress(Math.round(total / mocksList.length));

        if (results.length > 0) {
          setAttemptsCount(results.length);
          const avgPct =
            results.reduce((sum, r) => sum + (r.score / r.total_questions) * 100, 0) /
            results.length;
          setAvgScore(Math.round(avgPct));
        }
      }

      setLoading(false);
    }
    load();
  }, [courseId, router]);

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{course ? course.name : 'Course'}</h1>
        <p className="subtitle">
          {courseProgress !== null
            ? `Your progress: ${courseProgress}%`
            : 'Not started yet'}
        </p>
      </div>

      <div className="hub-grid">
        <div className="hub-card disabled">
          <span className="hub-card-icon">📖</span>
          <h3>Study Materials</h3>
          <p>Review notes and key concepts</p>
          <span className="hub-badge">Coming soon</span>
        </div>

        <div className="hub-card disabled">
          <span className="hub-card-icon">🔬</span>
          <h3>Practical &amp; Practice</h3>
          <p>Practice questions, cases, calculations and scenarios</p>
          <span className="hub-badge">Coming soon</span>
        </div>

        <a href="#mock-exams" className="hub-card">
          <span className="hub-card-icon">📝</span>
          <h3>Mock Exams</h3>
          <p>
            {mocks.length === 0
              ? 'No mock exams yet'
              : `${mocks.length} mock exam${mocks.length === 1 ? '' : 's'} available`}
          </p>
        </a>

        <Link href="/results" className="hub-card">
          <span className="hub-card-icon">📊</span>
          <h3>My Performance</h3>
          <p>
            {attemptsCount > 0
              ? `${attemptsCount} attempt${attemptsCount === 1 ? '' : 's'} · ${avgScore}% average`
              : 'No attempts yet'}
          </p>
        </Link>
      </div>

      <h2 className="section-heading" id="mock-exams">
        Mock Exams
      </h2>

      {mocks.length === 0 ? (
        <p className="subtitle" style={{ marginBottom: 36 }}>
          No mocks yet for this course.
        </p>
      ) : (
        <div className="course-list">
          {mocks.map((mock) => {
            const best = bestByMock[mock.id];
            return (
              <div key={mock.id} className="course-row">
                <div className="course-row-top">
                  <div>
                    <div className="course-row-name">{mock.title}</div>
                    <div className="course-row-progress">
                      {best !== undefined ? `${Math.round(best)}% best score` : 'Not attempted'}
                    </div>
                  </div>
                  <Link href={`/quiz/${mock.id}`} className="course-row-link">
                    {best !== undefined ? 'Retake →' : 'Start →'}
                  </Link>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${best || 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        className="btn-muted"
        style={{ marginTop: 12 }}
        onClick={() => router.push('/courses')}
      >
        Back to My Courses
      </button>
    </div>
  );
}
