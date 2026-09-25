'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function CourseMocks() {
  const [course, setCourse] = useState(null);
  const [mocks, setMocks] = useState([]);
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

      if (!error) setMocks(mocksData || []);
      setLoading(false);
    }
    load();
  }, [courseId, router]);

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h1>{course ? course.name : 'Course'}</h1>
      <p className="subtitle">Pick a mock exam to practice.</p>

      {mocks.length === 0 && (
        <p className="subtitle">No mocks yet for this course.</p>
      )}

      {mocks.map((mock) => (
        <Link key={mock.id} href={`/quiz/${mock.id}`}>
          <button style={{ marginBottom: 10 }}>{mock.title}</button>
        </Link>
      ))}

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
