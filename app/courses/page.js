'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [progressByCourse, setProgressByCourse] = useState({});
  const [generalMocks, setGeneralMocks] = useState([]);
  const [generalBest, setGeneralBest] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }
      const studentId = userData.user.id;

      // General mock exams (combined questions, not tied to a course)
      const { data: generalData } = await supabase
        .from('mocks')
        .select('id, title, duration_minutes')
        .eq('is_general', true)
        .order('title');
      const generalList = generalData || [];
      setGeneralMocks(generalList);

      if (generalList.length > 0) {
        const { data: generalResults } = await supabase
          .from('results')
          .select('mock_id, score, total_questions')
          .eq('student_id', studentId)
          .in('mock_id', generalList.map((m) => m.id));
        const best = {};
        (generalResults || []).forEach((r) => {
          const pct = (r.score / r.total_questions) * 100;
          if (best[r.mock_id] === undefined || pct > best[r.mock_id]) {
            best[r.mock_id] = pct;
          }
        });
        setGeneralBest(best);
      }

      const { data: scRows, error } = await supabase
        .from('student_courses')
        .select('course_id, courses ( id, name )')
        .eq('student_id', studentId);

      if (error) {
        setLoading(false);
        return;
      }

      const courseList = (scRows || []).map((row) => row.courses).filter(Boolean);
      setCourses(courseList);

      if (courseList.length === 0) {
        setLoading(false);
        return;
      }

      const courseIds = courseList.map((c) => c.id);

      const { data: mocksData } = await supabase
        .from('mocks')
        .select('id, course_id')
        .in('course_id', courseIds);

      const mockIds = (mocksData || []).map((m) => m.id);

      let resultsData = [];
      if (mockIds.length > 0) {
        const { data } = await supabase
          .from('results')
          .select('mock_id, score, total_questions, taken_at')
          .eq('student_id', studentId)
          .in('mock_id', mockIds);
        resultsData = data || [];
      }

      // Best score per mock (in case of multiple attempts)
      const bestByMock = {};
      resultsData.forEach((r) => {
        const pct = (r.score / r.total_questions) * 100;
        if (!bestByMock[r.mock_id] || pct > bestByMock[r.mock_id]) {
          bestByMock[r.mock_id] = pct;
        }
      });

      // Average across all mocks in each course (unattempted mocks count as 0%)
      const progress = {};
      courseList.forEach((course) => {
        const mocksInCourse = (mocksData || []).filter((m) => m.course_id === course.id);
        if (mocksInCourse.length === 0) {
          progress[course.id] = null;
          return;
        }
        const total = mocksInCourse.reduce(
          (sum, m) => sum + (bestByMock[m.id] || 0),
          0
        );
        progress[course.id] = Math.round(total / mocksInCourse.length);
      });

      setProgressByCourse(progress);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading your courses...</span>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Courses</h1>
      <p className="subtitle">All available courses.</p>

      {generalMocks.length > 0 && (
        <>
          <h2 className="section-heading" id="general-mocks">
            General Mock Exams
          </h2>
          <p className="subtitle">Questions from all courses combined.</p>
          <div className="course-list" style={{ marginBottom: 28 }}>
            {generalMocks.map((mock) => {
              const best = generalBest[mock.id];
              return (
                <div key={mock.id} className="course-row">
                  <div className="course-row-top">
                    <div>
                      <div className="course-row-name">{mock.title}</div>
                      <div className="course-row-progress">
                        {mock.duration_minutes} min ·{' '}
                        {best !== undefined
                          ? `${Math.round(best)}% best score`
                          : 'Not attempted'}
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
          <h2 className="section-heading">By Course</h2>
        </>
      )}

      {courses.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">📚</span>
          <span className="empty-state-title">No courses yet</span>
          <span className="empty-state-desc">
            Courses appear here automatically as soon as they are added.
          </span>
        </div>
      )}

      {courses.map((course) => {
        const pct = progressByCourse[course.id];
        return (
          <Link key={course.id} href={`/courses/${course.id}`}>
            <button style={{ marginBottom: 10, textAlign: 'left' }}>
              {course.name}
              {pct !== null && pct !== undefined && (
                <span style={{ float: 'right' }}>{pct}%</span>
              )}
            </button>
          </Link>
        );
      })}

      <Link href="/results">
        <button className="btn-outline" style={{ marginTop: 10 }}>
          My Results
        </button>
      </Link>

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
