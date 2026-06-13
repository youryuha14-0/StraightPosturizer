import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Mock local auth storage helper to support offline sandbox mode out of the box
export interface UserSession {
  id: string;
  email: string;
  isMock: boolean;
}

export function getLocalUserSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('straight_posture_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function setLocalUserSession(user: UserSession | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('straight_posture_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('straight_posture_user');
  }
}
