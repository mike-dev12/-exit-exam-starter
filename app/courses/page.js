'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { courseIcon, courseStatus, ACCENTS } from '../../lib/courseMeta';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [progressByCourse, setProgressByCourse] = useState({});
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
    <div className="container" style={{ maxWidth: 820 }}>
      <h1>Courses</h1>
      <p className="subtitle">Pick a course to practice questions, read materials or take a mock exam.</p>

      {courses.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">📚</span>
          <span className="empty-state-title">No courses yet</span>
          <span className="empty-state-desc">
            Courses appear here automatically as soon as they are added.
          </span>
        </div>
      )}

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
                <span className="course-card-go">Open →</span>
              </div>
            </Link>
          );
        })}
      </div>

      <Link href="/results">
        <button className="btn-outline" style={{ marginTop: 18 }}>
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
