'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function LecturerHome() {
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [courses, setCourses] = useState([]);
  const [questionCounts, setQuestionCounts] = useState({});
  const [mockCounts, setMockCounts] = useState({});
  const [totalStudents, setTotalStudents] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (!profileData || (profileData.role !== 'lecturer' && profileData.role !== 'admin')) {
        setChecking(false);
        return;
      }

      setProfile(profileData);
      setChecking(false);

      let courseList = [];
      if (profileData.role === 'admin') {
        const { data } = await supabase.from('courses').select('*').order('name');
        courseList = data || [];
      } else {
        const { data } = await supabase
          .from('lecturer_courses')
          .select('course_id, courses ( id, name )')
          .eq('lecturer_id', userData.user.id);
        courseList = (data || []).map((row) => row.courses).filter(Boolean);
      }
      setCourses(courseList);

      if (courseList.length === 0) return;
      const courseIds = courseList.map((c) => c.id);

      const { data: mocksData } = await supabase
        .from('mocks')
        .select('id, course_id')
        .in('course_id', courseIds);

      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, course_id')
        .in('course_id', courseIds);

      const { data: studentRows } = await supabase
        .from('student_courses')
        .select('student_id, course_id')
        .in('course_id', courseIds);

      const mCounts = {};
      (mocksData || []).forEach((m) => {
        mCounts[m.course_id] = (mCounts[m.course_id] || 0) + 1;
      });
      setMockCounts(mCounts);

      const qCounts = {};
      (questionsData || []).forEach((q) => {
        qCounts[q.course_id] = (qCounts[q.course_id] || 0) + 1;
      });
      setQuestionCounts(qCounts);

      const uniqueStudents = new Set((studentRows || []).map((r) => r.student_id));
      setTotalStudents(uniqueStudents.size);
    }
    load();
  }, [router]);

  if (checking) return <div className="container">Loading...</div>;

  if (!profile) {
    return (
      <div className="container">
        <h1>Not authorized</h1>
        <p className="subtitle">
          This account does not have lecturer access.
        </p>
        <button onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const totalQuestions = Object.values(questionCounts).reduce((a, b) => a + b, 0);
  const totalMocks = Object.values(mockCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Lecturer Dashboard</h1>
        <p className="subtitle">
          {profile.role === 'admin'
            ? 'All courses (admin view).'
            : 'Your assigned courses.'}
        </p>
      </div>

      <div className="stats-card">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', borderTop: 'none', paddingTop: 0 }}>
          <div>
            <span className="stats-num">{courses.length}</span>
            <span className="stats-label">My Courses</span>
          </div>
          <div>
            <span className="stats-num">{totalQuestions}</span>
            <span className="stats-label">Questions</span>
          </div>
          <div>
            <span className="stats-num">{totalMocks}</span>
            <span className="stats-label">Mock Exams</span>
          </div>
          <div>
            <span className="stats-num">{totalStudents}</span>
            <span className="stats-label">Students</span>
          </div>
        </div>
      </div>

      <h2 className="section-heading">My Courses</h2>
      {courses.length === 0 ? (
        <p className="subtitle" style={{ marginBottom: 36 }}>
          No courses assigned to you yet. Ask your administrator.
        </p>
      ) : (
        <div className="course-list">
          {courses.map((course) => (
            <div key={course.id} className="course-row">
              <div className="course-row-top">
                <div>
                  <div className="course-row-name">{course.name}</div>
                  <div className="course-row-progress">
                    {questionCounts[course.id] || 0} questions ·{' '}
                    {mockCounts[course.id] || 0} mock exams
                  </div>
                </div>
                <Link href={`/lecturer/courses/${course.id}`} className="course-row-link">
                  Manage →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

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
