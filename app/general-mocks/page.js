'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function GeneralMocks() {
  const [mocks, setMocks] = useState([]);
  const [bestByMock, setBestByMock] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('mocks')
        .select('id, title, duration_minutes')
        .eq('is_general', true)
        .order('title');
      const list = data || [];
      setMocks(list);

      if (list.length > 0) {
        const { data: resultsData } = await supabase
          .from('results')
          .select('mock_id, score, total_questions')
          .eq('student_id', userData.user.id)
          .in('mock_id', list.map((m) => m.id));

        const best = {};
        (resultsData || []).forEach((r) => {
          const pct = (r.score / r.total_questions) * 100;
          if (best[r.mock_id] === undefined || pct > best[r.mock_id]) {
            best[r.mock_id] = pct;
          }
        });
        setBestByMock(best);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading general mocks...</span>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>General Mock Exams</h1>
      <p className="subtitle">
        Full exams with questions from all courses combined.
      </p>

      {mocks.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🧪</span>
          <span className="empty-state-title">No general mocks yet</span>
          <span className="empty-state-desc">
            They will appear here when your administrator adds them.
          </span>
        </div>
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
      )}

      <button
        className="btn-muted"
        style={{ marginTop: 16 }}
        onClick={() => router.push('/dashboard')}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
