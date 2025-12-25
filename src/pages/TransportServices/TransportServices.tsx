import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../shared/store/hooks';
import { setFilters } from '../../shared/store/slices/filtersSlice';
import { Filters } from '../../widgets/Filters/Filters';
import { ServiceCard } from '../../widgets/ServiceCard/ServiceCard';
import { fetchTransportServices } from '../../shared/api/servicesApi';
import type { TransportService, TransportServiceFilters } from '../../shared/types/TransportService';

/**
 * Страница транспортных услуг с фильтрацией
 */
export function TransportServices() {
  const filters = useAppSelector((state) => state.filters.filters);
  const dispatch = useAppDispatch();

  const [services, setServices] = useState<TransportService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServices(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadServices = async (filtersToApply: TransportServiceFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchTransportServices(filtersToApply);
      setServices(data);
    } catch (err) {
      setError('Не удалось загрузить услуги');
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: TransportServiceFilters) => {
    dispatch(setFilters(newFilters));
  };

  return (
    <div className="container">
      <h2 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>
        Транспортные услуги
      </h2>

      <Filters onFilterChange={handleFilterChange} />

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div
            style={{
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #0d6efd',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }}
          />
          <p style={{ marginTop: '1rem', color: '#6c757d' }}>Загрузка...</p>
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#f8d7da',
            color: '#721c24',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '2rem',
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        services.length > 0 ? (
          <div className="services-grid">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="no-services">
            <h2>Услуги не найдены</h2>
            <p>Попробуйте изменить параметры фильтрации</p>
          </div>
        )
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}


