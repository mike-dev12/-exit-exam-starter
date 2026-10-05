import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (and Vercel) and restart.' },
      { status: 500 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Who is calling? Verify their login token.
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller?.user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }

  // 2) Are they an admin?
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.user.id)
    .maybeSingle();
  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  // 3) Which user?
  let userId;
  try {
    ({ userId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  }
  if (userId === caller.user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  const { data: target } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (target?.role === 'admin') {
    return NextResponse.json(
      { error: 'Admins cannot be deleted. Change their role to student/lecturer first.' },
      { status: 400 }
    );
  }

  // 4) Remove their data, then the login itself.
  const steps = [
    ['results', admin.from('results').delete().eq('student_id', userId)],
    ['student_courses', admin.from('student_courses').delete().eq('student_id', userId)],
    ['lecturer_courses', admin.from('lecturer_courses').delete().eq('lecturer_id', userId)],
    ['materials', admin.from('materials').update({ uploaded_by: null }).eq('uploaded_by', userId)],
    ['profiles', admin.from('profiles').delete().eq('id', userId)],
  ];
  for (const [name, query] of steps) {
    const { error } = await query;
    if (error) console.error(`DELETE USER: cleanup of ${name} failed:`, error.message);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('DELETE USER ERROR:', deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}