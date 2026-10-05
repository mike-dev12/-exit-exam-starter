'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import { openMaterial, downloadMaterial, formatSize, fileLabel } from '../../../../lib/materials';

export default function PracticeQuestions() {
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');
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
        .select('id, name')
        .eq('id', courseId)
        .single();
      setCourse(courseData);

      const { data, error: loadError } = await supabase
        .from('materials')
        .select('*')
        .eq('course_id', courseId)
        .eq('category', 'practice')
        .order('created_at', { ascending: false });

      if (loadError) setError(loadError.message);
      setMaterials(data || []);
      setLoading(false);
    }
    load();
  }, [courseId, router]);

  async function handleOpen(material) {
    setError('');
    setOpeningId(material.id);
    const message = await openMaterial(material);
    setOpeningId(null);
    if (message) setError(message);
  }

  async function handleDownload(material) {
    setError('');
    setDownloadingId(material.id);
    const message = await downloadMaterial(material);
    setDownloadingId(null);
    if (message) setError(message);
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading practice questions...</span>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 680 }}>
      <h1>Practice Questions</h1>
      <p className="subtitle">{course ? course.name : 'Course'}</p>

      {error && <div className="error">{error}</div>}

      {materials.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📝</span>
          <span className="empty-state-title">No practice questions yet</span>
          <span className="empty-state-desc">
            Question papers (PDF, Word and more) will appear here when your lecturer uploads them.
          </span>
        </div>
      ) : (
        <div className="course-list">
          {materials.map((m) => (
            <div key={m.id} className="course-row">
              <div className="course-row-top">
                <div>
                  <div className="course-row-name">{m.title}</div>
                  <div className="course-row-progress">
                    {[fileLabel(m.file_type), formatSize(m.file_size)]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-outline"
                    style={{ width: 'auto', padding: '8px 14px' }}
                    disabled={openingId === m.id}
                    onClick={() => handleOpen(m)}
                  >
                    {openingId === m.id ? 'Opening...' : 'Open'}
                  </button>
                  <button
                    className="btn-outline"
                    style={{ width: 'auto', padding: '8px 14px' }}
                    disabled={downloadingId === m.id}
                    onClick={() => handleDownload(m)}
                  >
                    {downloadingId === m.id ? 'Downloading...' : 'Download'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn-muted"
        style={{ marginTop: 16 }}
        onClick={() => router.push(`/courses/${courseId}`)}
      >
        Back to Course
      </button>
    </div>
  );
}
