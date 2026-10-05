import { supabase } from './supabaseClient';

// Asks the server to delete a user (admin only). Returns an error string or null.
export async function deleteUserAccount(userId) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return 'You are not logged in.';

  const res = await fetch('/api/admin/delete-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId }),
  });
  const body = await res.json().catch(() => ({}));
  return res.ok ? null : body.error || 'Could not delete the user.';
}
