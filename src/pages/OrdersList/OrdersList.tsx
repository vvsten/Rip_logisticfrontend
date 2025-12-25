import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../shared/store/hooks';
import { setError, setLoading, setOrders } from '../../shared/store/slices/ordersSlice';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner/LoadingSpinner';
import * as logisticRequestsApi from '../../shared/api/manual/logisticRequestsApi';

/**
 * Страница списка заявок пользователя в виде таблицы
 * Использует Redux Toolkit для управления состоянием заявок
 */
export function OrdersList() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { orders, isLoading, error } = useAppSelector((state) => state.orders);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  
  // Проверяем, является ли пользователь админом/менеджером/модератором
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'moderator';

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Перенаправляем неавторизованных пользователей
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Long polling списка заявок - сервер держит соединение открытым до изменения данных (lab8).
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    let lastUpdate: string | undefined = undefined;
    let isFetching = false; // Флаг для предотвращения параллельных запросов

    const buildParams = () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (lastUpdate) {
        params.last_update = lastUpdate;
        console.log('[LongPoll] Sending request with last_update:', lastUpdate);
      } else {
        console.log('[LongPoll] Sending first request (no last_update)');
      }
      return params;
    };

    const fetchData = async (isInitial = false) => {
      if (!isMounted || isFetching) return; // Предотвращаем параллельные запросы
      isFetching = true;

      if (isInitial) {
        dispatch(setLoading(true));
        dispatch(setError(null));
      } else {
        setIsPolling(true);
      }

      try {
        const data = await logisticRequestsApi.listLongPoll(buildParams());
        if (!isMounted) {
          isFetching = false;
          return;
        }

        dispatch(setOrders(data));
        setLastUpdateTime(new Date());
        dispatch(setLoading(false)); // Убираем спиннер после первого запроса
        
        // Сохраняем timestamp последнего обновления для следующего запроса
        // ВАЖНО: используем текущее время сервера (время получения ответа), а не updated_at из данных
        // Это гарантирует, что сервер будет ждать реальных изменений
        const now = new Date();
        // Используем текущее время минус 1 секунда, чтобы учесть возможные задержки
        now.setSeconds(now.getSeconds() - 1);
        lastUpdate = now.toISOString();
        console.log('[LongPoll] Set lastUpdate to current time:', lastUpdate, 'data.length:', data.length);

        isFetching = false;
        setIsPolling(false);

        // Рекурсивно вызываем long polling после получения ответа с задержкой
        if (isMounted) {
          setTimeout(() => {
            if (isMounted && !isFetching) {
              fetchData(false);
            }
          }, 500); // Увеличиваем задержку до 500 мс
        }
      } catch (err: any) {
        isFetching = false;
        if (!isMounted) return;

        if (isInitial) {
          dispatch(setError(err?.message ?? 'Не удалось загрузить заявки'));
          dispatch(setLoading(false));
        } else {
          setIsPolling(false);
          // При ошибке повторяем через 3 секунды
          setTimeout(() => {
            if (isMounted && !isFetching) {
              fetchData(false);
            }
          }, 3000);
        }
      }
    };

    // Первый запрос сразу
    fetchData(true);

    return () => {
      isMounted = false;
      isFetching = false;
    };
  }, [dispatch, isAuthenticated, statusFilter, dateFrom, dateTo]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      formed: 'Сформирован',
      completed: 'Завершен',
      rejected: 'Отклонен',
      deleted: 'Удален',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6c757d',
      formed: '#0d6efd',
      completed: '#198754',
      rejected: '#dc3545',
      deleted: '#6c757d',
    };
    return colors[status] || '#6c757d';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="container" style={{ margin: '2rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>{isAdmin ? 'Все заявки' : 'Мои заявки'}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6c757d' }}>
          {isPolling && (
            <span style={{ 
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#0d6efd',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.3; }
                }
              `}</style>
            </span>
          )}
          {lastUpdateTime && (
            <span>
              Обновлено: {formatTime(lastUpdateTime)} (long polling - до 30 сек)
            </span>
          )}
        </div>
      </div>

      {/* Фильтры */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
      }}>
        <div>
          <label htmlFor="status" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Статус
          </label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          >
            <option value="">Все</option>
            <option value="draft">Черновик</option>
            <option value="formed">Сформирован</option>
            <option value="completed">Завершен</option>
            <option value="rejected">Отклонен</option>
          </select>
        </div>

        <div>
          <label htmlFor="dateFrom" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Дата от
          </label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>

        <div>
          <label htmlFor="dateTo" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Дата до
          </label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>

        <button
          onClick={() => {
            setStatusFilter('');
            setDateFrom('');
            setDateTo('');
          }}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Сбросить
        </button>
      </div>

      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '2rem',
        }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner text="Загрузка заявок..." />
      ) : (
        <>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Заявки не найдены</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Статус</th>
                    {isAdmin && (
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Создатель</th>
                    )}
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Маршрут</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Услуг</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Результатов</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Стоимость</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Создано</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '1rem' }}>{order.id}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: getStatusColor(order.status),
                          color: 'white',
                          fontSize: '0.875rem',
                        }}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '1rem' }}>
                          {order.creator ? (
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{order.creator.name || order.creator.login}</div>
                              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>{order.creator.login}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#6c757d' }}>—</span>
                          )}
                        </td>
                      )}
                      <td style={{ padding: '1rem' }}>
                        {order.from_city && order.to_city ? (
                          `${order.from_city} → ${order.to_city}`
                        ) : (
                          'Не указано'
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>{order.services?.length || 0}</td>
                      <td style={{ padding: '1rem' }}>{order.async_results_filled_count ?? 0}</td>
                      <td style={{ padding: '1rem' }}>
                        {order.total_cost ? `${order.total_cost.toLocaleString('ru-RU')} ₽` : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>{formatDate(order.created_at)}</td>
                      <td style={{ padding: '1rem' }}>
                        <button
                          onClick={() => navigate(`/logistic-requests/${order.id}`)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#0d6efd',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Просмотр
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}


