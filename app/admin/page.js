'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { MATERIALS_BUCKET } from '../../lib/materials';
import { deleteUserAccount } from '../../lib/deleteUser';

export default function AdminHome() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [courses, setCourses] = useState([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [courseListError, setCourseListError] = useState('');
  const [generalMocks, setGeneralMocks] = useState([]);
  const [generalCounts, setGeneralCounts] = useState({});
  const [newGeneralTitle, setNewGeneralTitle] = useState('');
  const [newGeneralDuration, setNewGeneralDuration] = useState(60);
  const [generalError, setGeneralError] = useState('');
  const [userError, setUserError] = useState('');
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [myId, setMyId] = useState(null);
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
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileData?.role !== 'admin') {
        setChecking(false);
        return;
      }

      setMyId(userData.user.id);
      setAuthorized(true);
      setChecking(false);
      loadCourses();
      loadUsers();
      loadGeneralMocks();
    }
    load();
  }, [router]);

  async function loadCourses() {
    const { data } = await supabase.from('courses').select('*').order('name');
    setCourses(data || []);
  }

  async function loadGeneralMocks() {
    const { data } = await supabase
      .from('mocks')
      .select('*')
      .eq('is_general', true)
      .order('title');
    const list = data || [];
    setGeneralMocks(list);

    if (list.length === 0) {
      setGeneralCounts({});
      return;
    }
    const { data: qRows } = await supabase
      .from('questions')
      .select('mock_id')
      .in('mock_id', list.map((m) => m.id));
    const counts = {};
    (qRows || []).forEach((q) => {
      counts[q.mock_id] = (counts[q.mock_id] || 0) + 1;
    });
    setGeneralCounts(counts);
  }

  async function handleAddGeneralMock(e) {
    e.preventDefault();
    setGeneralError('');
    if (!newGeneralTitle.trim()) return;

    const { error: insertError } = await supabase.from('mocks').insert({
      title: newGeneralTitle.trim(),
      duration_minutes: Number(newGeneralDuration) || 60,
      is_general: true,
      course_id: null,
    });

    if (insertError) {
      setGeneralError(
        insertError.message +
          ' (If this mentions a column or policy, run supabase/general-mocks-and-files.sql first.)'
      );
      return;
    }
    setNewGeneralTitle('');
    setNewGeneralDuration(60);
    loadGeneralMocks();
  }

  async function handleDeleteGeneralMock(mock) {
    if (
      !window.confirm(
        `Delete "${mock.title}"?\n\nThis also deletes its questions and every student's results for it.`
      )
    )
      return;
    setGeneralError('');

    const { error: deleteError } = await supabase
      .from('mocks')
      .delete()
      .eq('id', mock.id);
    if (deleteError) {
      setGeneralError(deleteError.message);
      return;
    }
    await loadGeneralMocks();
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('role')
      .order('full_name');
    setUsers(data || []);
  }

    async function handleDeleteUser(u) {
    const label = u.full_name || '(no name)';
    if (
      !window.confirm(
        `Delete ${u.role} "${label}"?\n\n` +
          'Their login, profile, and all their results will be permanently deleted. ' +
          'This cannot be undone.'
      )
    )
      return;

    setUserError('');
    setDeletingUserId(u.id);
    const err = await deleteUserAccount(u.id);
    setDeletingUserId(null);
    if (err) {
      setUserError(err);
      return;
    }
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  }
  async function handleAddCourse(e) {
    e.preventDefault();
    setError('');
    if (!newCourseName.trim()) return;

    const { error } = await supabase
      .from('courses')
      .insert({ name: newCourseName.trim() });

    if (error) {
      setError(error.message);
      return;
    }
    setNewCourseName('');
    loadCourses();
  }

  async function handleDeleteCourse(course) {
    const confirmed = window.confirm(
      `Delete "${course.name}"?\n\n` +
        'This also permanently deletes its mock exams, questions, and every ' +
        "student's results for this course. This cannot be undone."
    );
    if (!confirmed) return;

    setCourseListError('');
    setDeletingId(course.id);

    // Remember this course's uploaded files so we can remove them from
    // storage afterwards (the database rows are deleted automatically).
    // If the materials table doesn't exist yet this simply returns nothing.
    const { data: fileRows } = await supabase
      .from('materials')
      .select('file_path')
      .eq('course_id', course.id);

    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', course.id);

    if (deleteError) {
      setDeletingId(null);
      setCourseListError(deleteError.message);
      return;
    }

    // Supabase gives NO error when row-level security silently blocks a
    // delete, so check that the course is really gone before saying so.
    const { data: stillThere } = await supabase
      .from('courses')
      .select('id')
      .eq('id', course.id)
      .maybeSingle();

    setDeletingId(null);

    if (stillThere) {
      setCourseListError(
        'The course was not deleted. Run supabase/auto-enroll-and-delete.sql ' +
          'in the Supabase SQL Editor first, then try again.'
      );
      return;
    }

    if (fileRows && fileRows.length > 0) {
      await supabase.storage
        .from(MATERIALS_BUCKET)
        .remove(fileRows.map((f) => f.file_path));
    }

    setCourses((prev) => prev.filter((c) => c.id !== course.id));
  }

  if (checking) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="container">
        <h1>Not authorized</h1>
        <p className="subtitle">This account does not have admin access.</p>
        <button onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1>Admin Dashboard</h1>
      <p className="subtitle">Manage courses, general mocks, users and roles.</p>

      <h3 style={{ marginTop: 24 }}>Courses</h3>
      <p className="subtitle">
        Students get every course automatically. No approval is needed.
      </p>
      {courseListError && <div className="error">{courseListError}</div>}
      {courses.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">🏫</span>
          <span className="empty-state-title">No courses yet</span>
          <span className="empty-state-desc">Add your first course below.</span>
        </div>
      )}
      {courses.map((course) => (
        <div
          key={course.id}
          className="question-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>{course.name}</span>
          <button
            className="btn-danger"
            style={{ width: 'auto', padding: '8px 14px' }}
            disabled={deletingId === course.id}
            onClick={() => handleDeleteCourse(course)}
          >
            {deletingId === course.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ))}

      <h3 style={{ marginTop: 24 }}>Add a Course</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleAddCourse}>
        <input
          type="text"
          placeholder="Course name"
          value={newCourseName}
          onChange={(e) => setNewCourseName(e.target.value)}
        />
        <button type="submit">Add Course</button>
      </form>

      <h3 style={{ marginTop: 24 }}>General Mock Exams</h3>
      <p className="subtitle">
        Combined exams (Mock 1, Mock 2, ...) that are not tied to one course.
        Every student sees them on the Courses page.
      </p>
      {generalError && <div className="error">{generalError}</div>}
      {generalMocks.length === 0 && (
        <p className="subtitle">No general mocks yet.</p>
      )}
      {generalMocks.map((mock) => (
        <div
          key={mock.id}
          className="question-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>
            <strong>{mock.title}</strong>
            <br />
            <span style={{ color: '#666', fontSize: '0.85rem' }}>
              {generalCounts[mock.id] || 0} questions · {mock.duration_minutes} min
            </span>
          </span>
          <span style={{ display: 'flex', gap: 8 }}>
            <Link href={`/lecturer/mocks/${mock.id}`}>
              <button
                className="btn-outline"
                style={{ width: 'auto', padding: '8px 14px' }}
              >
                Manage
              </button>
            </Link>
            <button
              className="btn-danger"
              style={{ width: 'auto', padding: '8px 14px' }}
              onClick={() => handleDeleteGeneralMock(mock)}
            >
              Delete
            </button>
          </span>
        </div>
      ))}

      <h3 style={{ marginTop: 16 }}>Add a General Mock</h3>
      <form onSubmit={handleAddGeneralMock}>
        <input
          type="text"
          placeholder="Title (e.g. General Mock 1)"
          value={newGeneralTitle}
          onChange={(e) => setNewGeneralTitle(e.target.value)}
        />
        <label>Time limit (minutes): </label>
        <input
          type="number"
          min="1"
          value={newGeneralDuration}
          onChange={(e) => setNewGeneralDuration(e.target.value)}
          style={{ marginBottom: 14 }}
        />
        <button type="submit">Add General Mock</button>
      </form>

            <h3 style={{ marginTop: 24 }}>Users</h3>
      {userError && <div className="error">{userError}</div>}
      {users.map((u) => (
        <div
          key={u.id}
          className="question-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Link
            href={`/admin/users/${u.id}`}
            style={{ flex: 1, display: 'flex', justifyContent: 'space-between', gap: 12 }}
          >
            <span>{u.full_name || '(no name)'}</span>
            <span style={{ color: '#666', fontSize: '0.85rem' }}>{u.role}</span>
          </Link>
          {u.id !== myId && u.role !== 'admin' && (
            <button
              className="btn-danger"
              style={{ width: 'auto', padding: '8px 14px' }}
              disabled={deletingUserId === u.id}
              onClick={() => handleDeleteUser(u)}
            >
              {deletingUserId === u.id ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      ))}

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
