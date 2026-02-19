import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, requireAuth, router]);

  return { isAuthenticated, isLoading, user };
}
