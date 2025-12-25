import { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { restoreFromStorage } from '../../store/slices/authSlice';

/**
 * Компонент для инициализации состояния авторизации при загрузке приложения.
 *
 * Лаб7: показываем localStorage → restoreAuth() восстанавливает isAuthenticated/user/token.
 */
export function AuthInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(restoreFromStorage());
  }, [dispatch]);

  return null;
}

