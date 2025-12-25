import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../shared/store/hooks';
import { setError, setLoading, setOrders } from '../../shared/store/slices/ordersSlice';
import { httpClient } from '../../shared/api/httpClient';
import { API_V1_PREFIX } from '../../shared/config/apiConfig';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner/LoadingSpinner';
import * as logisticRequestsApi from '../../shared/api/manual/logisticRequestsApi';

export function ModeratorOrders() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { orders, isLoading, error } = useAppSelector((s) => s.orders);
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  const isModerator = user?.role === 'manager' || user?.role === 'admin' || user?.role === 'moderator';

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [creatorFilter, setCreatorFilter] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  // Long polling + фильтры на стороне бэкенда (status/date range)
  useEffect(() => {
    if (!isAuthenticated || !isModerator) return;

    let isMounted = true;
    let lastUpdate: string | undefined = undefined;
    let isFetching = false; // Флаг для предотвращения параллельных запросов

    const buildParams = () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (lastUpdate) params.last_update = lastUpdate;
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
  }, [dispatch, isAuthenticated, isModerator, statusFilter, dateFrom, dateTo]);

  const filteredOrders = useMemo(() => {
    const q = creatorFilter.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const creatorLogin = (o.creator?.login ?? '').toLowerCase();
      const creatorName = (o.creator?.name ?? '').toLowerCase();
      const creatorEmail = (o.creator?.email ?? '').toLowerCase();
      return creatorLogin.includes(q) || creatorName.includes(q) || creatorEmail.includes(q);
    });
  }, [orders, creatorFilter]);

  const complete = async (id: number, status: 'completed' | 'rejected') => {
    setActionError(null);
    try {
      await httpClient.put(`${API_V1_PREFIX}/logistic-requests/${id}/complete`, { status });
    } catch (e: any) {
      setActionError(e?.response?.data?.message ?? e?.message ?? 'Не удалось изменить статус');
    }
  };

  const startAsync = async (id: number) => {
    setActionError(null);
    try {
      await httpClient.post(`${API_V1_PREFIX}/logistic-requests/${id}/async/start`);
    } catch (e: any) {
      setActionError(e?.response?.data?.message ?? e?.message ?? 'Не удалось запустить async');
    }
  };

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

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (!isAuthenticated) return null;
  if (!isModerator) {
    return (
      <div className="container" style={{ margin: '2rem auto' }}>
        <h2>Модератор</h2>
        <p>Недостаточно прав. Нужна роль manager/admin.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ margin: '2rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Модератор: заявки</h2>
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
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label htmlFor="status" style={{ display: 'block', marginBottom: '0.5rem' }}>Статус (бек)</label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">Все</option>
            <option value="formed">Сформирован</option>
            <option value="completed">Завершен</option>
            <option value="rejected">Отклонен</option>
          </select>
        </div>

        <div>
          <label htmlFor="dateFrom" style={{ display: 'block', marginBottom: '0.5rem' }}>Дата от (бек)</label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label htmlFor="dateTo" style={{ display: 'block', marginBottom: '0.5rem' }}>Дата до (бек)</label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label htmlFor="creator" style={{ display: 'block', marginBottom: '0.5rem' }}>Создатель (фронт)</label>
          <input
            id="creator"
            type="text"
            value={creatorFilter}
            onChange={(e) => setCreatorFilter(e.target.value)}
            placeholder="login / name / email"
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <button
          onClick={() => {
            setStatusFilter('');
            setDateFrom('');
            setDateTo('');
            setCreatorFilter('');
          }}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Сбросить
        </button>
      </div>

      {actionError && (
        <div style={{ background: '#fff3cd', color: '#856404', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {actionError}
        </div>
      )}

      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner text="Загрузка заявок..." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Статус</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Создатель</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Дата формирования</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Результатов</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '1rem' }}>{o.id}</td>
                  <td style={{ padding: '1rem' }}>{getStatusLabel(o.status)}</td>
                  <td style={{ padding: '1rem' }}>{o.creator?.login ?? o.creator_id}</td>
                  <td style={{ padding: '1rem' }}>{formatDate(o.formed_at)}</td>
                  <td style={{ padding: '1rem' }}>{o.async_results_filled_count ?? 0}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate(`/logistic-requests/${o.id}`)}
                        style={{ padding: '0.5rem 0.75rem', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Открыть
                      </button>

                      {o.status === 'formed' && (
                        <>
                          <button
                            onClick={() => complete(o.id, 'completed')}
                            style={{ padding: '0.5rem 0.75rem', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Одобрить
                          </button>
                          <button
                            onClick={() => complete(o.id, 'rejected')}
                            style={{ padding: '0.5rem 0.75rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Отклонить
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => startAsync(o.id)}
                        style={{ padding: '0.5rem 0.75rem', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Async
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '1rem', textAlign: 'center' }}>Заявки не найдены</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


