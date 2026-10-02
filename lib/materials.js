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

async function getSignedUrl(material, { forDownload } = {}) {
  const { data, error } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .createSignedUrl(
      material.file_path,
      60 * 60,
      forDownload ? { download: material.file_name } : undefined
    );

  if (error || !data?.signedUrl) {
    return { url: null, error: error?.message || 'Could not access this file.' };
  }
  return { url: data.signedUrl, error: null };
}

// Opens the file for reading in a new tab, with nothing saved to the
// device. PDFs render natively in the browser. PowerPoint files can't be
// shown by the browser directly, so they're shown through Microsoft's
// Office Viewer instead.
export async function openMaterial(material) {
  const isPdf = material.file_type === 'pdf';

  // Open the tab right away (inside the click) so pop-up blockers allow it.
  const tab = window.open('', '_blank');

  const { url, error } = await getSignedUrl(material, { forDownload: false });

  if (error) {
    if (tab) tab.close();
    return error;
  }

  const viewUrl = isPdf
    ? url
    : `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;

  if (tab) {
    tab.location.href = viewUrl;
  } else {
    window.location.href = viewUrl;
  }
  return null;
}

// Forces the file to save to the device instead of opening it.
export async function downloadMaterial(material) {
  const { url, error } = await getSignedUrl(material, { forDownload: true });
  if (error) return error;
  window.location.href = url;
  return null;
}
