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

const TEMPLATE = `Q: What is the SI unit of force?
A: Newton
B: Joule
C: Pascal
D: Watt
Answer: A
Explanation: Force is measured in newtons (N).

Q: Which organ produces insulin?
A: Liver
B: Pancreas
C: Kidney
D: Spleen
Answer: B
Explanation: Beta cells of the pancreas make insulin.
`;

// Turns pasted text into question objects. One question per block;
// a blank line ends a question. Labels are forgiving (Q:/1./1) , A:/A./A) ,
// Answer:/Ans:/Correct: , Explanation:/Exp:).
function parseQuestions(raw) {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/);
  const out = [];
  let cur = null;
  let last = null;

  const startQ = (txt) => {
    cur = {
      question_text: txt,
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: '',
      explanation: '',
    };
    last = 'question_text';
    out.push(cur);
  };

  const reAnswer = /^(?:answer|ans|correct(?:\s*(?:answer|option))?)\s*[:=\-]\s*\(?([A-Da-d])\)?/i;
  const reExp = /^(?:explanation|exp|rationale)\s*[:\-]\s*(.*)$/i;
  const reOpt = /^\(?([A-Da-d])\s*[.):]\s*(.*)$/;
  const reQ = /^(?:q(?:uestion)?\s*\d*\s*[:.)\-]|\d+\s*[.):\-])\s*(.*)$/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (cur && cur.correct_option) {
        cur = null;
        last = null;
      }
      continue;
    }

    let m = line.match(reAnswer);
    if (m) {
      const target = cur || out[out.length - 1];
      if (target) target.correct_option = m[1].toUpperCase();
      last = null;
      continue;
    }

    m = line.match(reExp);
    if (m) {
      const target = cur || out[out.length - 1];
      if (target) {
        target.explanation = m[1].trim();
        cur = target;
        last = 'explanation';
      }
      continue;
    }

    m = line.match(reOpt);
    if (m) {
      if (!cur) startQ('');
      last = `option_${m[1].toLowerCase()}`;
      cur[last] = m[2].trim();
      continue;
    }

    m = line.match(reQ);
    if (m) {
      startQ(m[1].trim());
      continue;
    }

    // Plain line: continues the previous field, or starts a new question.
    if (cur && last) {
      cur[last] = (cur[last] + ' ' + line).trim();
    } else {
      startQ(line);
    }
  }

  return out.map((q, i) => {
    const errors = [];
    if (!q.question_text) errors.push('missing question text');
    if (!q.option_a) errors.push('missing option A');
    if (!q.option_b) errors.push('missing option B');
    if (!q.correct_option) {
      errors.push('missing answer (add a line like "Answer: B")');
    } else if (!q[`option_${q.correct_option.toLowerCase()}`]) {
      errors.push(`answer is ${q.correct_option} but option ${q.correct_option} is empty`);
    }
    return { ...q, number: i + 1, errors };
  });
}

export default function LecturerMock() {
  const [mock, setMock] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsMinutes, setSettingsMinutes] = useState(30);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importMsg, setImportMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const [importFileKey, setImportFileKey] = useState(0);
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
      } else if (mockData.is_general) {
        // General mocks belong to no course, so only admins manage them.
        ok = false;
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
      setSettingsTitle(mockData.title || '');
      setSettingsMinutes(mockData.duration_minutes ?? 30);
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

  async function saveSettings() {
    setSettingsMsg('');
    const minutes = Number(settingsMinutes);
    if (!settingsTitle.trim()) {
      setSettingsMsg('Error: the title cannot be empty.');
      return;
    }
    if (!minutes || minutes < 1) {
      setSettingsMsg('Error: the time limit must be at least 1 minute.');
      return;
    }
    setSavingSettings(true);
    const { data, error: updateError } = await supabase
      .from('mocks')
      .update({ title: settingsTitle.trim(), duration_minutes: minutes })
      .eq('id', mockId)
      .select();
    setSavingSettings(false);

    if (updateError) {
      setSettingsMsg('Error: ' + updateError.message);
      return;
    }
    // Row-level security can block an update without an error, so check.
    if (!data || data.length === 0) {
      setSettingsMsg(
        'Error: not saved. Run supabase/admin-edit-and-tracking.sql in the Supabase SQL Editor first.'
      );
      return;
    }
    setMock(data[0]);
    setSettingsMsg('Saved. Students will get the new time limit the next time they start this mock.');
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-template.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    setImportPreview(parseQuestions(text));
    setImportMsg('');
  }

  function handlePreview() {
    setImportMsg('');
    if (!importText.trim()) {
      setImportPreview(null);
      setImportMsg('Paste your questions or choose a .txt file first.');
      return;
    }
    const parsed = parseQuestions(importText);
    setImportPreview(parsed);
    if (parsed.length === 0) setImportMsg('No questions were found in that text.');
  }

  async function handleImport() {
    if (!importPreview) return;
    const valid = importPreview.filter((q) => q.errors.length === 0);
    if (valid.length === 0) return;

    setImporting(true);
    setImportMsg('');

    // Give each row its own increasing timestamp so the questions stay in
    // the same order as the file (a batch would otherwise share one time).
    const base = Date.now();
    const rows = valid.map((q, i) => ({
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      explanation: q.explanation,
      mock_id: mockId,
      course_id: mock?.course_id ?? null,
      created_at: new Date(base + i).toISOString(),
    }));

    for (let i = 0; i < rows.length; i += 100) {
      const { error: insertError } = await supabase
        .from('questions')
        .insert(rows.slice(i, i + 100));
      if (insertError) {
        setImporting(false);
        setImportMsg(
          `Error after ${i} question${i === 1 ? '' : 's'}: ${insertError.message}`
        );
        loadQuestions();
        return;
      }
    }

    setImporting(false);
    setImportText('');
    setImportPreview(null);
    setImportFileKey((k) => k + 1);
    setImportMsg(`Imported ${valid.length} question${valid.length === 1 ? '' : 's'}.`);
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
      <p className="subtitle">
        {mock?.is_general
          ? 'General mock: add questions from any course, mixed together.'
          : 'Manage questions for this mock.'}
      </p>

      <h3 style={{ marginTop: 24 }}>Mock Settings</h3>
      {settingsMsg && (
        <div className={settingsMsg.startsWith('Error') ? 'error' : 'subtitle'}>
          {settingsMsg}
        </div>
      )}
      <input
        type="text"
        placeholder="Mock title"
        value={settingsTitle}
        onChange={(e) => setSettingsTitle(e.target.value)}
      />
      <label>Time limit (minutes): </label>
      <input
        type="number"
        min="1"
        value={settingsMinutes}
        onChange={(e) => setSettingsMinutes(e.target.value)}
        style={{ marginBottom: 14 }}
      />
      <button onClick={saveSettings} disabled={savingSettings}>
        {savingSettings ? 'Saving...' : 'Save Settings'}
      </button>

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
                className="btn-muted"
                style={{ marginTop: 8 }}
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
                className="btn-danger"
                style={{ marginTop: 8 }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      ))}

      <h3 style={{ marginTop: 24 }}>Bulk Import Questions</h3>
      <p className="subtitle">
        Paste many questions at once (you can copy them straight from Word) or
        upload a .txt file. Use this layout, with a blank line between questions:
      </p>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: '0.85rem',
          color: 'var(--muted)',
          marginBottom: 12,
        }}
      >{`Q: Question text
A: Option A
B: Option B
C: Option C
D: Option D
Answer: B
Explanation: Why B is correct (optional)`}</pre>
      <button
        type="button"
        className="btn-outline"
        style={{ width: 'auto', padding: '8px 14px', marginBottom: 12 }}
        onClick={downloadTemplate}
      >
        Download template
      </button>
      {importMsg && (
        <div className={importMsg.startsWith('Imported') ? 'subtitle' : 'error'}>
          {importMsg}
        </div>
      )}
      <input
        key={importFileKey}
        type="file"
        accept=".txt,text/plain"
        onChange={handleImportFile}
        style={{ marginBottom: 12 }}
      />
      <textarea
        rows={10}
        placeholder="Or paste your questions here..."
        value={importText}
        onChange={(e) => {
          setImportText(e.target.value);
          setImportPreview(null);
        }}
        style={{ width: '100%', marginBottom: 12 }}
      />
      <button type="button" onClick={handlePreview}>
        Check questions
      </button>

      {importPreview && importPreview.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p className="subtitle">
            Found {importPreview.length} question{importPreview.length === 1 ? '' : 's'}:{' '}
            {importPreview.filter((q) => q.errors.length === 0).length} ready,{' '}
            {importPreview.filter((q) => q.errors.length > 0).length} with problems
            (problems are skipped).
          </p>
          <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 12 }}>
            {importPreview.map((q) => (
              <div key={q.number} className="question-card">
                <p>
                  <strong>
                    {q.number}. {q.question_text || '(no question text)'}
                  </strong>
                </p>
                {q.option_a && <p>A. {q.option_a}</p>}
                {q.option_b && <p>B. {q.option_b}</p>}
                {q.option_c && <p>C. {q.option_c}</p>}
                {q.option_d && <p>D. {q.option_d}</p>}
                {q.correct_option && <p><strong>Correct: {q.correct_option}</strong></p>}
                {q.explanation && <p style={{ fontStyle: 'italic' }}>{q.explanation}</p>}
                {q.errors.length > 0 && (
                  <div className="error">Problem: {q.errors.join('; ')}</div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleImport}
            disabled={
              importing || importPreview.every((q) => q.errors.length > 0)
            }
          >
            {importing
              ? 'Importing...'
              : `Import ${importPreview.filter((q) => q.errors.length === 0).length} questions`}
          </button>
        </div>
      )}

      <h3 style={{ marginTop: 32 }}>Add a Question</h3>
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
        className="btn-muted"
        style={{ marginTop: 12 }}
        onClick={() => router.back()}
      >
        Back
      </button>
    </div>
  );
}
