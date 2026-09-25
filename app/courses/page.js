'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

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

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h1>Courses</h1>
      <p className="subtitle">Courses assigned to you.</p>

      {courses.length === 0 && (
        <p className="subtitle">
          No courses assigned yet. Ask your administrator to assign you to a
          course.
        </p>
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
        <button style={{ background: '#0f766e', marginTop: 10 }}>
          My Results
        </button>
      </Link>

      <button
        style={{ background: '#666', marginTop: 12 }}
        onClick={() => router.push('/dashboard')}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
