import { supabase } from './supabaseClient';

export const MATERIALS_BUCKET = 'course-materials';
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

export const FILE_TYPES = {
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

// Value for <input type="file" accept="...">
export const ACCEPT = Object.keys(FILE_TYPES).map((e) => `.${e}`).join(',');
export const ALLOWED_TEXT = 'PDF, Word, PowerPoint, Excel, TXT, PNG or JPG';

// Office files can't be shown by the browser itself, so they go through
// Microsoft's online viewer. Everything else opens directly.
const OFFICE_TYPES = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'];

export const CATEGORIES = {
  material: 'Study material',
  practice: 'Practice questions',
};

export function categoryLabel(category) {
  return CATEGORIES[category] || CATEGORIES.material;
}

export function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileLabel(type) {
  if (type === 'pdf') return 'PDF';
  if (type === 'ppt' || type === 'pptx') return 'PowerPoint';
  if (type === 'doc' || type === 'docx') return 'Word';
  if (type === 'xls' || type === 'xlsx') return 'Excel';
  if (type === 'txt') return 'Text';
  if (type === 'png' || type === 'jpg' || type === 'jpeg') return 'Image';
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
// device. PDFs, images and text files render natively in the browser.
// Word / PowerPoint / Excel files are shown through Microsoft's Office
// Viewer instead.
export async function openMaterial(material) {
  const useOfficeViewer = OFFICE_TYPES.includes(material.file_type);

  // Open the tab right away (inside the click) so pop-up blockers allow it.
  const tab = window.open('', '_blank');

  const { url, error } = await getSignedUrl(material, { forDownload: false });

  if (error) {
    if (tab) tab.close();
    return error;
  }

  const viewUrl = useOfficeViewer
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
    : url;

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
