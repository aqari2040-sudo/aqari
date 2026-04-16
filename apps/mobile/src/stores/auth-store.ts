import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email?: string;
  phone?: string;
  role: string;
  name?: string;
  tenant_id?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const u = data.session.user;
        set({
          user: {
            id: u.id,
            email: u.email,
            phone: u.phone,
            role: u.user_metadata?.role || 'tenant',
            name: u.user_metadata?.full_name,
            tenant_id: u.user_metadata?.tenant_id,
          },
        });
      } else {
        set({ user: null });
      }
    } catch {
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
