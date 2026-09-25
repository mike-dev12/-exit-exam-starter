'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

const emptyForm = {
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
  explanation: '',
};

export default function LecturerMock() {
  const [mock, setMock] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const router = useRouter();
  const params = useParams();
  const mockId = params.mockId;

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }

      const { data: mockData } = await supabase
        .from('mocks')
        .select('*')
        .eq('id', mockId)
        .single();

      if (!mockData) {
        router.push('/lecturer');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      let ok = false;
      if (profileData?.role === 'admin') {
        ok = true;
      } else if (profileData?.role === 'lecturer') {
        const { data: assignment } = await supabase
          .from('lecturer_courses')
          .select('course_id')
          .eq('lecturer_id', userData.user.id)
          .eq('course_id', mockData.course_id)
          .maybeSingle();
        ok = !!assignment;
      }

      if (!ok) {
        router.push('/lecturer');
        return;
      }

      setAuthorized(true);
      setMock(mockData);
      loadQuestions();
      setLoading(false);
    }
    load();
  }, [mockId, router]);

  async function loadQuestions() {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('mock_id', mockId)
      .order('created_at');
    setQuestions(data || []);
  }

  async function handleAddQuestion(e) {
    e.preventDefault();
    setError('');

    if (!form.question_text.trim() || !form.option_a.trim() || !form.option_b.trim()) {
      setError('Question text, Option A, and Option B are required.');
      return;
    }

    const { data: mockRow } = await supabase
      .from('mocks')
      .select('course_id')
      .eq('id', mockId)
      .single();

    const { error } = await supabase.from('questions').insert({
      ...form,
      mock_id: mockId,
      course_id: mockRow.course_id,
    });

    if (error) {
      setError(error.message);
      return;
    }
    setForm(emptyForm);
    loadQuestions();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this question?')) return;
    await supabase.from('questions').delete().eq('id', id);
    loadQuestions();
  }

  function startEdit(q) {
    setEditingId(q.id);
    setEditValues({
      correct_option: q.correct_option,
      explanation: q.explanation || '',
    });
  }

  async function saveEdit(id) {
    await supabase
      .from('questions')
      .update({
        correct_option: editValues.correct_option,
        explanation: editValues.explanation,
      })
      .eq('id', id);
    setEditingId(null);
    loadQuestions();
  }

  if (loading || !authorized) return <div className="container">Loading...</div>;

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1>{mock ? mock.title : 'Mock'}</h1>
      <p className="subtitle">Manage questions for this mock.</p>

      <h3 style={{ marginTop: 24 }}>
        Questions ({questions.length})
      </h3>

      {questions.map((q, i) => (
        <div key={q.id} className="question-card">
          <p>
            <strong>{i + 1}. {q.question_text}</strong>
          </p>
          <p>A. {q.option_a}</p>
          <p>B. {q.option_b}</p>
          {q.option_c && <p>C. {q.option_c}</p>}
          {q.option_d && <p>D. {q.option_d}</p>}

          {editingId === q.id ? (
            <div style={{ marginTop: 8 }}>
              <label>Correct option: </label>
              <select
                value={editValues.correct_option}
                onChange={(e) =>
                  setEditValues({ ...editValues, correct_option: e.target.value })
                }
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
              <input
                type="text"
                placeholder="Short explanation (shown when a student gets it wrong)"
                value={editValues.explanation}
                onChange={(e) =>
                  setEditValues({ ...editValues, explanation: e.target.value })
                }
                style={{ marginTop: 8 }}
              />
              <button onClick={() => saveEdit(q.id)} style={{ marginTop: 8 }}>
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                style={{ background: '#666', marginTop: 8 }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <p>
                <strong>Correct: {q.correct_option}</strong>
              </p>
              {q.explanation && <p style={{ fontStyle: 'italic' }}>{q.explanation}</p>}
              <button onClick={() => startEdit(q)}>Edit Answer/Explanation</button>
              <button
                onClick={() => handleDelete(q.id)}
                style={{ background: '#dc2626', marginTop: 8 }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      ))}

      <h3 style={{ marginTop: 24 }}>Add a Question</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleAddQuestion}>
        <input
          type="text"
          placeholder="Question text"
          value={form.question_text}
          onChange={(e) => setForm({ ...form, question_text: e.target.value })}
        />
        <input
          type="text"
          placeholder="Option A"
          value={form.option_a}
          onChange={(e) => setForm({ ...form, option_a: e.target.value })}
        />
        <input
          type="text"
          placeholder="Option B"
          value={form.option_b}
          onChange={(e) => setForm({ ...form, option_b: e.target.value })}
        />
        <input
          type="text"
          placeholder="Option C (optional)"
          value={form.option_c}
          onChange={(e) => setForm({ ...form, option_c: e.target.value })}
        />
        <input
          type="text"
          placeholder="Option D (optional)"
          value={form.option_d}
          onChange={(e) => setForm({ ...form, option_d: e.target.value })}
        />
        <label>Correct option: </label>
        <select
          value={form.correct_option}
          onChange={(e) => setForm({ ...form, correct_option: e.target.value })}
          style={{ marginBottom: 14 }}
        >
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
        <input
          type="text"
          placeholder="Short explanation (optional, shown when wrong)"
          value={form.explanation}
          onChange={(e) => setForm({ ...form, explanation: e.target.value })}
        />
        <button type="submit">Add Question</button>
      </form>

      <button
        style={{ background: '#666', marginTop: 12 }}
        onClick={() => router.back()}
      >
        Back
      </button>
    </div>
  );
}
