import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../shared/store/hooks';
import { clearError, loginSuccess, setError, setLoading } from '../../shared/store/slices/authSlice';
import * as authApi from '../../shared/api/manual/authApi';

/**
 * Страница входа пользователя
 * Использует Redux Toolkit для управления состоянием авторизации
 */
export function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  // Если пользователь уже авторизован, перенаправляем на главную
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Очищаем ошибку при размонтировании
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    dispatch(setLoading(true));
    try {
      const res = await authApi.login(login, password);
      dispatch(loginSuccess(res));
      navigate('/');
    } catch (err: any) {
      dispatch(setError(err?.message ?? 'Не удалось войти'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Вход</h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="login" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Логин
          </label>
          <input
            id="login"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Пароль
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        {error && (
          <div style={{
            background: '#f8d7da',
            color: '#721c24',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Вход...' : 'Войти'}
        </button>
      </form>

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p>
          Нет аккаунта? <Link to="/register" style={{ color: '#0d6efd' }}>Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}


