import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchTransportService } from '../../shared/api/servicesApi';
import type { TransportService } from '../../shared/types/TransportService';

export function TransportServiceDetails() {
  const params = useParams();
  const id = Number(params.id ?? 0);

  const [service, setService] = useState<TransportService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = import.meta.env.BASE_URL || '/';
  const defaultImageUrl = `${baseUrl}assets/default.svg`;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!id) {
          throw new Error('Некорректный ID услуги');
        }
        const res = await fetchTransportService(id);
        if (!alive) return;
        if (!res) throw new Error('Услуга не найдена');
        setService(res);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? 'Не удалось загрузить услугу');
        setService(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const imageUrl = useMemo(() => {
    return service?.imageUrl || defaultImageUrl;
  }, [service?.imageUrl, defaultImageUrl]);

  if (loading) {
    return (
      <div className="container" style={{ margin: '2rem auto' }}>
        <p>Загрузка услуги...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ margin: '2rem auto' }}>
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '6px' }}>
          {error}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/transport-services" className="home-btn">← Назад к услугам</Link>
        </div>
      </div>
    );
  }

  if (!service) return null;

  return (
    <div className="container" style={{ margin: '2rem auto', maxWidth: '900px' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/transport-services" className="home-btn">← Назад к услугам</Link>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>{service.name}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', alignItems: 'start' }}>
        <img
          src={imageUrl}
          alt={service.name}
          style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', maxHeight: '380px' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultImageUrl;
          }}
        />

        <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <p style={{ marginTop: 0 }}>{service.description}</p>

          <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
            <div><b>Цена:</b> {service.price} ₽</div>
            <div><b>Срок доставки:</b> {service.deliveryDays} дн.</div>
            <div><b>Макс. вес:</b> {service.maxWeight} кг</div>
            <div><b>Макс. объём:</b> {service.maxVolume} м³</div>
          </div>
        </div>
      </div>
    </div>
  );
}


