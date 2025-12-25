import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../shared/store/hooks';
import { getAsyncUrl } from '../../shared/config/apiConfig';
import { setCurrentOrder, setError, setLoading } from '../../shared/store/slices/ordersSlice';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner/LoadingSpinner';
import { httpClient } from '../../shared/api/httpClient';
import * as logisticRequestsApi from '../../shared/api/manual/logisticRequestsApi';

/**
 * Страница просмотра и редактирования заявки
 * В статусе черновик можно редактировать, в других статусах - только просмотр
 * Использует Redux Toolkit для управления состоянием заявок
 */
export function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentOrder, isLoading, error } = useAppSelector((state) => state.orders);
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [isAsyncStarting, setIsAsyncStarting] = useState(false);
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [formData, setFormData] = useState({
    from_city: '',
    to_city: '',
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
  });

  // Перенаправляем неавторизованных пользователей
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Загружаем заявку при монтировании
  useEffect(() => {
    if (id && isAuthenticated) {
      (async () => {
        dispatch(setLoading(true));
        dispatch(setError(null));
        try {
          const lr = await logisticRequestsApi.getById(Number(id));
          dispatch(setCurrentOrder(lr));
        } catch (err: any) {
          dispatch(setError(err?.message ?? 'Не удалось загрузить заявку'));
          dispatch(setCurrentOrder(null));
        } finally {
          dispatch(setLoading(false));
        }
      })();
    }
  }, [dispatch, id, isAuthenticated]);

  // Long polling деталей заявки — сервер держит соединение открытым до изменения данных.
  useEffect(() => {
    if (!id || !isAuthenticated) return;
    const orderId = Number(id);

    let isMounted = true;
    let lastUpdate: string | undefined = undefined;

    const fetchData = async (isInitial = false) => {
      if (!isMounted) return;

      if (isInitial && !currentOrder) {
        // Первый запрос - загружаем сразу без long polling
        try {
          const lr = await logisticRequestsApi.getById(orderId);
          if (!isMounted) return;
          dispatch(setCurrentOrder(lr));
          setLastUpdateTime(new Date());
          lastUpdate = lr.updated_at;
        } catch (err: any) {
          if (!isMounted) return;
          dispatch(setError(err?.message ?? 'Не удалось загрузить заявку'));
        }
        return;
      }

      setIsPolling(true);
      try {
        const lr = await logisticRequestsApi.getByIdLongPoll(orderId, lastUpdate);
        if (!isMounted) return;

        dispatch(setCurrentOrder(lr));
        setLastUpdateTime(new Date());
        lastUpdate = lr.updated_at;

        // Рекурсивно вызываем long polling после получения ответа
        if (isMounted) {
          setTimeout(() => {
            if (isMounted) {
              fetchData(false);
            }
          }, 100); // Небольшая задержка перед следующим запросом
        }
      } catch (err: any) {
        if (!isMounted) return;
        setIsPolling(false);
        // При ошибке повторяем через 3 секунды
        setTimeout(() => {
          if (isMounted) {
            fetchData(false);
          }
        }, 3000);
      }
    };

    // Первый запрос сразу
    fetchData(true);

    return () => {
      isMounted = false;
    };
  }, [dispatch, id, isAuthenticated]);

  // Обновляем форму при загрузке заявки
  useEffect(() => {
    if (currentOrder) {
      setFormData({
        from_city: currentOrder.from_city || '',
        to_city: currentOrder.to_city || '',
        weight: currentOrder.weight || 0,
        length: currentOrder.length || 0,
        width: currentOrder.width || 0,
        height: currentOrder.height || 0,
      });
    }
  }, [currentOrder]);

  const isDraft = currentOrder?.status === 'draft';
  const canEdit = isDraft && isAuthenticated;

  const handleStartAsync = async () => {
    if (!currentOrder || !currentOrder.services?.length) return;
    setIsAsyncStarting(true);
    setAsyncError(null);
    try {
      const payload = {
        request_id: currentOrder.id,
        services: currentOrder.services.map((s) => ({ transport_service_id: s.transport_service_id })),
      };
      await httpClient.post(getAsyncUrl('/process'), payload, { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      setAsyncError(e?.message ?? 'Не удалось запустить async сервис');
    } finally {
      setIsAsyncStarting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'from_city' || name === 'to_city' ? value : parseFloat(value) || 0,
    });
  };

  const handleUpdateOrder = async () => {
    if (!id) return;
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const lr = await logisticRequestsApi.update(Number(id), formData);
      dispatch(setCurrentOrder(lr));
      setIsEditing(false);
    } catch (err: any) {
      dispatch(setError(err?.message ?? 'Не удалось обновить заявку'));
    } finally {
      dispatch(setLoading(false));
    }
    setIsEditing(false);
  };

  const handleRemoveService = async (transportServiceId: number) => {
    if (!id) return;
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const lr = await logisticRequestsApi.removeService(Number(id), transportServiceId);
      dispatch(setCurrentOrder(lr));
    } catch (err: any) {
      dispatch(setError(err?.message ?? 'Не удалось удалить услугу'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleUpdateServiceQuantity = async (transportServiceId: number, quantity: number) => {
    if (!id || quantity < 1) return;
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const lr = await logisticRequestsApi.updateService(Number(id), transportServiceId, { quantity });
      dispatch(setCurrentOrder(lr));
    } catch (err: any) {
      dispatch(setError(err?.message ?? 'Не удалось обновить количество'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleFormOrder = async () => {
    if (!id || !currentOrder) return;
    
    // Проверяем, что все необходимые данные заполнены
    if (!formData.from_city || !formData.to_city || formData.weight <= 0 || 
        formData.length <= 0 || formData.width <= 0 || formData.height <= 0) {
      alert('Заполните все поля для формирования заявки');
      return;
    }
    
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      await logisticRequestsApi.form(Number(id), {
        from_city: formData.from_city,
        to_city: formData.to_city,
        weight: formData.weight,
        length: formData.length,
        width: formData.width,
        height: formData.height,
      });
      navigate('/logistic-requests');
    } catch (err: any) {
      dispatch(setError(err?.message ?? 'Не удалось сформировать заявку'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading && !currentOrder) {
    return <LoadingSpinner text="Загрузка заявки..." />;
  }

  if (!currentOrder) {
    return (
      <div className="container" style={{ margin: '2rem auto', textAlign: 'center' }}>
        <p>Заявка не найдена</p>
        <button
          onClick={() => navigate('/logistic-requests')}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Вернуться к списку
        </button>
      </div>
    );
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="container" style={{ margin: '2rem auto', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Заявка #{currentOrder.id}</h2>
          {lastUpdateTime && (
            <div style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
              <span>Обновлено: {formatTime(lastUpdateTime)} (long polling - до 30 сек)</span>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/logistic-requests')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Назад к списку
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

      {asyncError && (
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '2rem',
        }}>
          {asyncError}
        </div>
      )}

      {/* Информация о заявке */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem',
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Информация о заявке</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Статус
            </label>
            <span style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: isDraft ? '#6c757d' : '#198754',
              color: 'white',
            }}>
              {isDraft ? 'Черновик' : currentOrder.status}
            </span>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Стоимость
            </label>
            <p>{currentOrder.total_cost ? `${currentOrder.total_cost.toLocaleString('ru-RU')} ₽` : '-'}</p>
          </div>
        </div>

        {/* Lab8: кнопка запуска async-сервиса (можно дернуть и отдельно через Insomnia) */}
        {currentOrder.services?.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={handleStartAsync}
              disabled={isAsyncStarting}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isAsyncStarting ? 'not-allowed' : 'pointer',
                opacity: isAsyncStarting ? 0.7 : 1,
              }}
            >
              {isAsyncStarting ? 'Запуск...' : 'Запустить async-обработку (lab8)'}
            </button>
          </div>
        )}

        {canEdit && !isEditing ? (
          <div>
            <p><strong>Город отправления:</strong> {formData.from_city || 'Не указано'}</p>
            <p><strong>Город назначения:</strong> {formData.to_city || 'Не указано'}</p>
            <p><strong>Вес:</strong> {formData.weight} кг</p>
            <p><strong>Размеры:</strong> {formData.length} × {formData.width} × {formData.height} м</p>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Редактировать
            </button>
          </div>
        ) : canEdit && isEditing ? (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Город отправления</label>
              <input
                type="text"
                name="from_city"
                value={formData.from_city}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Город назначения</label>
              <input
                type="text"
                name="to_city"
                value={formData.to_city}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Вес (кг)</label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Длина (м)</label>
                <input
                  type="number"
                  name="length"
                  value={formData.length}
                  onChange={handleInputChange}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Ширина (м)</label>
                <input
                  type="number"
                  name="width"
                  value={formData.width}
                  onChange={handleInputChange}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Высота (м)</label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                min="0"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleUpdateOrder}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#198754',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Сохранить
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (currentOrder) {
                    setFormData({
                      from_city: currentOrder.from_city || '',
                      to_city: currentOrder.to_city || '',
                      weight: currentOrder.weight || 0,
                      length: currentOrder.length || 0,
                      width: currentOrder.width || 0,
                      height: currentOrder.height || 0,
                    });
                  }
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
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p><strong>Город отправления:</strong> {currentOrder.from_city || 'Не указано'}</p>
            <p><strong>Город назначения:</strong> {currentOrder.to_city || 'Не указано'}</p>
            <p><strong>Вес:</strong> {currentOrder.weight} кг</p>
            <p><strong>Размеры:</strong> {currentOrder.length} × {currentOrder.width} × {currentOrder.height} м</p>
          </div>
        )}
      </div>

      {/* Услуги в заявке */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem',
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Услуги</h3>
        
        {currentOrder.services && currentOrder.services.length > 0 ? (
          <div>
            {currentOrder.services.map((service) => (
              <div
                key={service.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderBottom: '1px solid #dee2e6',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {service.service?.name || `Услуга #${service.transport_service_id}`}
                  </p>
                  {service.service && (
                    <p style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                      {service.service.description}
                    </p>
                  )}
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    <strong>Async результат:</strong>{' '}
                    {service.async_result && service.async_result.trim() ? service.async_result : '— (ещё не рассчитано)'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {canEdit ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleUpdateServiceQuantity(service.transport_service_id, service.quantity - 1)}
                          disabled={service.quantity <= 1}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: service.quantity <= 1 ? 'not-allowed' : 'pointer',
                            opacity: service.quantity <= 1 ? 0.5 : 1,
                          }}
                        >
                          -
                        </button>
                        <span style={{ minWidth: '2rem', textAlign: 'center' }}>{service.quantity}</span>
                        <button
                          onClick={() => handleUpdateServiceQuantity(service.transport_service_id, service.quantity + 1)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveService(service.transport_service_id)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Удалить
                      </button>
                    </>
                  ) : (
                    <span style={{ fontWeight: 'bold' }}>× {service.quantity}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6c757d' }}>Услуги не добавлены</p>
        )}

        {canEdit && currentOrder.services && currentOrder.services.length > 0 && (
          <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
            <button
              onClick={handleFormOrder}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#198754',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Подтвердить заявку
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


