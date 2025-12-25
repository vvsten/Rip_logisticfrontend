import { useEffect, useState } from 'react';
import { httpClient } from '../../shared/api/httpClient';
import { API_V1_PREFIX } from '../../shared/config/apiConfig';

/**
 * Кнопка перехода к расчёту перевозки / черновику заявки
 * Справа вверху, с бэйджем количества
 */
export function CalculatorShortcut() {
  const [count, setCount] = useState<number>(0);
  const [logisticRequestId, setLogisticRequestId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await httpClient.get(`${API_V1_PREFIX}/logistic-requests/draft`);
        const data = res.data;
        if (res.status >= 200 && res.status < 300) {
          const c = typeof data?.count === 'number' ? data.count : 0;
          const id = data?.draft_logistic_request?.id ?? null;
          setCount(c);
          setLogisticRequestId(id);
          return;
        }
      } catch {}
      try {
        const res2 = await httpClient.get(`${API_V1_PREFIX}/logistic-requests/draft/count`);
        const data2 = res2.data;
        if (res2.status >= 200 && res2.status < 300) {
          setCount(typeof data2?.count === 'number' ? data2.count : 0);
        }
      } catch {}
    };
    load();

    // Обновляем счётчик, когда другие компоненты меняют черновик заявки
    const onDraftUpdated = () => {
      load();
    };
    window.addEventListener('draft-logistic-request-updated', onDraftUpdated);
    return () => window.removeEventListener('draft-logistic-request-updated', onDraftUpdated);
  }, []);

  const href = logisticRequestId ? `/logistic-request/quote?request_id=${logisticRequestId}` : '/logistic-request/quote';
  const isDisabled = count <= 0;

  return (
    <div className="calculator-shortcut">
      {isDisabled ? (
        <a className="calculator-btn is-disabled" aria-disabled="true">
          🧮 Расчёт перевозки
          <span className="cart-count" id="cartCount">{count || ''}</span>
        </a>
      ) : (
        <a href={href} className="calculator-btn" style={{ textDecoration: 'none' }}>
          🧮 Расчёт перевозки
          <span className="cart-count" id="cartCount">{count}</span>
        </a>
      )}
    </div>
  );
}


