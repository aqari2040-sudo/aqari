import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email?: string;
  phone?: string;
  role: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,

      setUser: (user) => set({ user }),

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

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null });
      },
    }),
    {
      name: 'aqari-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
