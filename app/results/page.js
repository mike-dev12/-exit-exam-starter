'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function MyResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('results')
        .select('*, mocks ( title, course_id, courses ( name ) )')
        .eq('student_id', userData.user.id)
        .order('taken_at', { ascending: false });

      if (!error) setResults(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1>My Results</h1>
      <p className="subtitle">Your past quiz attempts.</p>

      {results.length === 0 && (
        <p className="subtitle">No attempts yet. Take a quiz to see results here.</p>
      )}

      {results.map((r) => {
        const pct = Math.round((r.score / r.total_questions) * 100);
        const date = new Date(r.taken_at).toLocaleDateString();
        return (
          <div key={r.id} className="question-card">
            <p>
              <strong>{r.mocks?.courses?.name || 'Course'} — {r.mocks?.title || 'Mock'}</strong>
            </p>
            <p>
              Score: {r.score} / {r.total_questions} ({pct}%)
            </p>
            <p style={{ color: '#666', fontSize: '0.85rem' }}>{date}</p>
          </div>
        );
      })}

      <button
        style={{ background: '#666', marginTop: 12 }}
        onClick={() => router.push('/dashboard')}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
