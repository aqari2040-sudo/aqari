import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  role: string;
  name?: string;
  tenant_id?: string;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email,
    phone: data.user.phone,
    role: data.user.user_metadata?.role || 'tenant',
    name: data.user.user_metadata?.full_name,
    tenant_id: data.user.user_metadata?.tenant_id,
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}
