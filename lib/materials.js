import { supabase } from './supabaseClient';

export const MATERIALS_BUCKET = 'course-materials';
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

export const FILE_TYPES = {
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileLabel(type) {
  if (type === 'pdf') return 'PDF';
  if (type === 'ppt' || type === 'pptx') return 'PowerPoint';
  return 'File';
}

// PDFs open in a new tab to read. PowerPoint files cannot be shown by the
// browser, so they download and open in PowerPoint / Google Slides.
// Returns an error message, or null on success.
export async function openMaterial(material) {
  const isPdf = material.file_type === 'pdf';

  // Open the tab right away (inside the click) so pop-up blockers allow it.
  const tab = isPdf ? window.open('', '_blank') : null;

  const { data, error } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .createSignedUrl(
      material.file_path,
      60 * 60,
      isPdf ? undefined : { download: material.file_name }
    );

  if (error || !data?.signedUrl) {
    if (tab) tab.close();
    return error?.message || 'Could not open this file.';
  }

  if (tab) {
    tab.location.href = data.signedUrl;
  } else {
    window.location.href = data.signedUrl;
  }
  return null;
}
