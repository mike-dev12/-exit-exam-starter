'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';
import {
  MATERIALS_BUCKET,
  MAX_FILE_BYTES,
  FILE_TYPES,
  ACCEPT,
  ALLOWED_TEXT,
  CATEGORIES,
  categoryLabel,
  formatSize,
  fileLabel,
  openMaterial,
  downloadMaterial,
} from '../../../../lib/materials';

export default function LecturerCourse() {
  const [course, setCourse] = useState(null);
  const [mocks, setMocks] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [roster, setRoster] = useState([]);
  const [newMockTitle, setNewMockTitle] = useState('');
  const [newMockDuration, setNewMockDuration] = useState(30);
  const [error, setError] = useState('');
  const [materials, setMaterials] = useState([]);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialFile, setMaterialFile] = useState(null);
  const [materialCategory, setMaterialCategory] = useState('material');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [editCategory, setEditCategory] = useState('material');
  const [editFileInputKey, setEditFileInputKey] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [materialError, setMaterialError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
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
          .eq('course_id', courseId)
          .maybeSingle();
        ok = !!assignment;
      }

      if (!ok) {
        router.push('/lecturer');
        return;
      }
      setAuthorized(true);

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      setCourse(courseData);

      const { data: questionsData } = await supabase
        .from('questions')
        .select('id')
        .eq('course_id', courseId);
      setQuestionCount((questionsData || []).length);

      await loadMocks();
      await loadRoster();
      await loadMaterials();
      setLoading(false);
    }
    load();
  }, [courseId, router]);

  async function loadMocks() {
    const { data } = await supabase
      .from('mocks')
      .select('*')
      .eq('course_id', courseId)
      .order('title');
    setMocks(data || []);
  }

  async function loadMaterials() {
    const { data } = await supabase
      .from('materials')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    setMaterials(data || []);
    return data || [];
  }

  async function handleUploadMaterial(e) {
    e.preventDefault();
    setMaterialError('');

    if (!materialFile) {
      setMaterialError('Choose a file first.');
      return;
    }
    const ext = materialFile.name.split('.').pop().toLowerCase();
    if (!FILE_TYPES[ext]) {
      setMaterialError(`Only ${ALLOWED_TEXT} files are allowed.`);
      return;
    }
    if (materialFile.size > MAX_FILE_BYTES) {
      setMaterialError('This file is bigger than 50 MB. Compress it and try again.');
      return;
    }

    setUploading(true);
    const safeName = materialFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${courseId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .upload(path, materialFile, { contentType: FILE_TYPES[ext] });

    if (uploadError) {
      setUploading(false);
      setMaterialError(
        uploadError.message +
          ' (If this mentions a policy, run supabase/materials.sql in Supabase first.)'
      );
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('materials').insert({
      course_id: courseId,
      title: materialTitle.trim() || materialFile.name.replace(/\.[^.]+$/, ''),
      file_path: path,
      file_name: materialFile.name,
      file_type: ext,
      file_size: materialFile.size,
      category: materialCategory,
      uploaded_by: userData.user?.id,
    });

    if (insertError) {
      // don't leave an orphan file behind
      await supabase.storage.from(MATERIALS_BUCKET).remove([path]);
      setUploading(false);
      setMaterialError(
        insertError.message +
          ' (If this mentions a policy or a missing table, run supabase/materials.sql first.)'
      );
      return;
    }

    setUploading(false);
    setMaterialTitle('');
    setMaterialFile(null);
    setMaterialCategory('material');
    setFileInputKey((k) => k + 1); // clears the file picker
    loadMaterials();
  }

  async function handleDeleteMaterial(m) {
    if (!window.confirm(`Delete "${m.title}"? Students will no longer see it.`)) return;
    setMaterialError('');

    const { error: deleteError } = await supabase
      .from('materials')
      .delete()
      .eq('id', m.id);
    if (deleteError) {
      setMaterialError(deleteError.message);
      return;
    }

    // Row-level security blocks silently, so confirm it is really gone.
    const remaining = await loadMaterials();
    if (remaining.some((x) => x.id === m.id)) {
      setMaterialError('Could not delete this file. Run supabase/materials.sql first.');
      return;
    }
    await supabase.storage.from(MATERIALS_BUCKET).remove([m.file_path]);
  }

  async function handleOpenMaterial(m) {
    setMaterialError('');
    const message = await openMaterial(m);
    if (message) setMaterialError(message);
  }

  async function handleDownloadMaterial(m) {
    setMaterialError('');
    setDownloadingId(m.id);
    const message = await downloadMaterial(m);
    setDownloadingId(null);
    if (message) setMaterialError(message);
  }

  function startEditMaterial(m) {
    setMaterialError('');
    setEditingId(m.id);
    setEditTitle(m.title);
    setEditCategory(m.category || 'material');
    setEditFile(null);
    setEditFileInputKey((k) => k + 1);
  }

  function cancelEditMaterial() {
    setEditingId(null);
    setEditFile(null);
  }

  async function handleSaveEditMaterial(m) {
    setMaterialError('');

    if (!editTitle.trim()) {
      setMaterialError('Title cannot be empty.');
      return;
    }

    let updates = { title: editTitle.trim(), category: editCategory };
    let oldPath = null;

    if (editFile) {
      const ext = editFile.name.split('.').pop().toLowerCase();
      if (!FILE_TYPES[ext]) {
        setMaterialError(`Only ${ALLOWED_TEXT} files are allowed.`);
        return;
      }
      if (editFile.size > MAX_FILE_BYTES) {
        setMaterialError('This file is bigger than 50 MB. Compress it and try again.');
        return;
      }

      setSavingEdit(true);
      const safeName = editFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${courseId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(MATERIALS_BUCKET)
        .upload(path, editFile, { contentType: FILE_TYPES[ext] });

      if (uploadError) {
        setSavingEdit(false);
        setMaterialError(uploadError.message);
        return;
      }

      updates = {
        ...updates,
        file_path: path,
        file_name: editFile.name,
        file_type: ext,
        file_size: editFile.size,
      };
      oldPath = m.file_path;
    } else {
      setSavingEdit(true);
    }

    const { error: updateError } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', m.id);

    if (updateError) {
      // clean up the newly uploaded file if the row update failed
      if (updates.file_path) {
        await supabase.storage.from(MATERIALS_BUCKET).remove([updates.file_path]);
      }
      setSavingEdit(false);
      setMaterialError(updateError.message);
      return;
    }

    if (oldPath) {
      await supabase.storage.from(MATERIALS_BUCKET).remove([oldPath]);
    }

    setSavingEdit(false);
    setEditingId(null);
    setEditFile(null);
    loadMaterials();
  }

  async function loadRoster() {
    const { data: scRows } = await supabase
      .from('student_courses')
      .select('student_id, profiles ( id, full_name )')
      .eq('course_id', courseId);

    const students = (scRows || [])
      .map((r) => r.profiles)
      .filter(Boolean);

    const { data: mocksData } = await supabase
      .from('mocks')
      .select('id')
      .eq('course_id', courseId);
    const mockIds = (mocksData || []).map((m) => m.id);

    let results = [];
    if (mockIds.length > 0) {
      const { data } = await supabase
        .from('results')
        .select('student_id, score, total_questions')
        .in('mock_id', mockIds);
      results = data || [];
    }

    const byStudent = {};
    results.forEach((r) => {
      if (!byStudent[r.student_id]) byStudent[r.student_id] = [];
      byStudent[r.student_id].push((r.score / r.total_questions) * 100);
    });

    const rosterWithStats = students.map((s) => {
      const scores = byStudent[s.id] || [];
      const avg =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;
      return {
        id: s.id,
        name: s.full_name || '(no name)',
        attempts: scores.length,
        avg,
      };
    });

    rosterWithStats.sort((a, b) => a.name.localeCompare(b.name));
    setRoster(rosterWithStats);
  }

  async function handleAddMock(e) {
    e.preventDefault();
    setError('');
    if (!newMockTitle.trim()) return;

    const { error } = await supabase.from('mocks').insert({
      course_id: courseId,
      title: newMockTitle.trim(),
      duration_minutes: Number(newMockDuration) || 30,
    });

    if (error) {
      setError(error.message);
      return;
    }
    setNewMockTitle('');
    setNewMockDuration(30);
    loadMocks();
  }

  if (loading || !authorized) return <div className="container">Loading...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{course ? course.name : 'Course'}</h1>
        <p className="subtitle">Manage this course.</p>
      </div>

      <div className="hub-grid">
        <a href="#mocks" className="hub-card">
          <span className="hub-card-icon">📝</span>
          <h3>Questions</h3>
          <p>{questionCount} question{questionCount === 1 ? '' : 's'} total</p>
        </a>

        <a href="#mocks" className="hub-card">
          <span className="hub-card-icon">🗂️</span>
          <h3>Mock Exams</h3>
          <p>
            {mocks.length === 0
              ? 'No mock exams yet'
              : `${mocks.length} mock exam${mocks.length === 1 ? '' : 's'}`}
          </p>
        </a>

        <a href="#materials" className="hub-card">
          <span className="hub-card-icon">📖</span>
          <h3>Study Materials</h3>
          <p>
            {materials.length === 0
              ? 'Upload PDF, Word or PowerPoint files'
              : `${materials.length} file${materials.length === 1 ? '' : 's'} uploaded`}
          </p>
        </a>

        <div className="hub-card disabled">
          <span className="hub-card-icon">🏷️</span>
          <h3>Topics</h3>
          <p>Tag questions by topic</p>
          <span className="hub-badge">Coming soon</span>
        </div>

        <a href="#performance" className="hub-card">
          <span className="hub-card-icon">📊</span>
          <h3>Student Performance</h3>
          <p>
            {roster.length === 0
              ? 'No students enrolled yet'
              : `${roster.length} student${roster.length === 1 ? '' : 's'} enrolled`}
          </p>
        </a>
      </div>

      <h2 className="section-heading" id="materials">
        Study Materials
      </h2>
      {materials.length === 0 && (
        <p className="subtitle">No files uploaded yet.</p>
      )}
      {materials.length > 0 && (
        <div className="course-list" style={{ marginBottom: 24 }}>
          {materials.map((m) =>
            editingId === m.id ? (
              <div key={m.id} className="course-row">
                <input
                  type="text"
                  placeholder="Title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ marginBottom: 10 }}
                />
                <label className="course-row-progress" style={{ display: 'block', marginBottom: 6 }}>
                  Section students see it in
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  style={{ marginBottom: 12 }}
                >
                  {Object.entries(CATEGORIES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <label className="course-row-progress" style={{ display: 'block', marginBottom: 6 }}>
                  Replace file (optional) — leave empty to keep "{m.file_name}"
                </label>
                <input
                  key={editFileInputKey}
                  type="file"
                  accept={ACCEPT}
                  onChange={(e) => setEditFile(e.target.files[0] || null)}
                  style={{ marginBottom: 12 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    style={{ width: 'auto', padding: '8px 14px' }}
                    disabled={savingEdit}
                    onClick={() => handleSaveEditMaterial(m)}
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="btn-muted"
                    style={{ width: 'auto', padding: '8px 14px' }}
                    disabled={savingEdit}
                    onClick={cancelEditMaterial}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={m.id} className="course-row">
                <div className="course-row-top">
                  <div>
                    <div className="course-row-name">{m.title}</div>
                    <div className="course-row-progress">
                      {[categoryLabel(m.category), fileLabel(m.file_type), formatSize(m.file_size)]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="btn-outline"
                      style={{ width: 'auto', padding: '8px 14px' }}
                      onClick={() => handleOpenMaterial(m)}
                    >
                      Open
                    </button>
                    <button
                      className="btn-outline"
                      style={{ width: 'auto', padding: '8px 14px' }}
                      disabled={downloadingId === m.id}
                      onClick={() => handleDownloadMaterial(m)}
                    >
                      {downloadingId === m.id ? 'Downloading...' : 'Download'}
                    </button>
                    <button
                      className="btn-outline"
                      style={{ width: 'auto', padding: '8px 14px' }}
                      onClick={() => startEditMaterial(m)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-danger"
                      style={{ width: 'auto', padding: '8px 14px' }}
                      onClick={() => handleDeleteMaterial(m)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <h3 style={{ marginTop: 8 }}>Upload a File</h3>
      <p className="subtitle">
        Accepted: {ALLOWED_TEXT}. Choose "Practice questions" for question papers.
      </p>
      {materialError && <div className="error">{materialError}</div>}
      <form onSubmit={handleUploadMaterial} style={{ marginBottom: 32 }}>
        <input
          type="text"
          placeholder="Title (optional, e.g. Chapter 3 Slides)"
          value={materialTitle}
          onChange={(e) => setMaterialTitle(e.target.value)}
        />
        <label>Where should students find it? </label>
        <select
          value={materialCategory}
          onChange={(e) => setMaterialCategory(e.target.value)}
          style={{ marginBottom: 14 }}
        >
          {Object.entries(CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          key={fileInputKey}
          type="file"
          accept={ACCEPT}
          onChange={(e) => setMaterialFile(e.target.files[0] || null)}
          style={{ marginBottom: 14 }}
        />
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      <h2 className="section-heading" id="mocks">
        Mock Exams
      </h2>
      {mocks.length === 0 && <p className="subtitle">No mocks yet.</p>}
      {mocks.length > 0 && (
        <div className="course-list" style={{ marginBottom: 24 }}>
          {mocks.map((mock) => (
            <div key={mock.id} className="course-row">
              <div className="course-row-top">
                <div>
                  <div className="course-row-name">{mock.title}</div>
                  <div className="course-row-progress">
                    {mock.duration_minutes} min
                  </div>
                </div>
                <Link href={`/lecturer/mocks/${mock.id}`} className="course-row-link">
                  Manage →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: 8 }}>Add a Mock</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleAddMock}>
        <input
          type="text"
          placeholder="Mock title (e.g. Mock 2)"
          value={newMockTitle}
          onChange={(e) => setNewMockTitle(e.target.value)}
        />
        <label>Time limit (minutes): </label>
        <input
          type="number"
          min="1"
          value={newMockDuration}
          onChange={(e) => setNewMockDuration(e.target.value)}
          style={{ marginBottom: 14 }}
        />
        <button type="submit">Add Mock</button>
      </form>

      <h2 className="section-heading" id="performance" style={{ marginTop: 40 }}>
        Student Performance
      </h2>
      {roster.length === 0 ? (
        <p className="subtitle">No students enrolled in this course yet.</p>
      ) : (
        <div className="course-list">
          {roster.map((s) => (
            <div key={s.id} className="course-row">
              <div className="course-row-top">
                <div>
                  <div className="course-row-name">{s.name}</div>
                  <div className="course-row-progress">
                    {s.attempts > 0
                      ? `${s.attempts} attempt${s.attempts === 1 ? '' : 's'} · ${s.avg}% average`
                      : 'No attempts yet'}
                  </div>
                </div>
              </div>
              {s.attempts > 0 && (
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${s.avg}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        className="btn-muted"
        style={{ marginTop: 24 }}
        onClick={() => router.push('/lecturer')}
      >
        Back to Lecturer Dashboard
      </button>
    </div>
  );
}
