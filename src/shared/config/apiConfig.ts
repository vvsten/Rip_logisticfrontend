/**
 * Конфигурация API для приложения
 * 
 * Поддерживает два режима:
 * - Web: использует относительные пути (/api) для работы через прокси
 * - Tauri: использует IP адрес локальной сети для прямого подключения
 */

// Определяем, запущено ли приложение в Tauri
// В Tauri v2 проверяем через window.__TAURI__ или userAgent
const isTauri = typeof window !== 'undefined' && (
  '__TAURI__' in window || 
  '__TAURI_INTERNALS__' in window ||
  (window as any).__TAURI_METADATA__ !== undefined ||
  navigator.userAgent.includes('Tauri')
);

// IP адрес сервера для Tauri (можно изменить через переменную окружения или конфиг)
// По умолчанию используется localhost, но в Tauri нужно указать IP локальной сети
const getServerIP = (): string => {
  // Проверяем переменную окружения для production (GitHub Pages)
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    return envApiUrl;
  }

  // В Tauri приложении можно использовать переменную окружения или конфиг
  if (isTauri) {
    // Для Tauri используем IP из localStorage или переменной окружения
    const savedIP = localStorage.getItem('api_server_ip');
    if (savedIP) {
      // Автоматически исправляем HTTPS на HTTP (для разработки)
      if (savedIP.startsWith('https://')) {
        const correctedIP = savedIP.replace('https://', 'http://');
        localStorage.setItem('api_server_ip', correctedIP);
        console.log(`[Config] Auto-corrected HTTPS to HTTP: ${savedIP} -> ${correctedIP}`);
        return correctedIP;
      }
      return savedIP;
    }
    // Автоматически устанавливаем IP по умолчанию при первом запуске
    // Используем IP локальной сети (192.168.1.64) для доступа к бэкенду
    const defaultIP = 'http://192.168.1.64:8083';
    localStorage.setItem('api_server_ip', defaultIP);
    console.log(`[Config] Auto-set default IP: ${defaultIP}`);
    return defaultIP;
  }
  
  // Для веб-версии используем относительные пути (работает через прокси в dev)
  // В production на GitHub Pages нужно указать VITE_API_BASE_URL
  return '';
};

/**
 * Базовый URL для API запросов
 */
export const API_BASE_URL = getServerIP();

/**
 * Версионированный префикс API (идея со слайда: /api/.../v1)
 * Сохраняем ваши названия ресурсов, добавляем только версию.
 */
export const API_VERSION = 'v1';
export const API_V1_PREFIX = `/api/${API_VERSION}`;

/**
 * Полный URL для API запроса
 * @param path - путь API (например, '/api/services')
 */
export const getApiUrl = (path: string): string => {
  if (isTauri && API_BASE_URL) {
    // Для Tauri используем полный URL с IP адресом
    return `${API_BASE_URL}${path}`;
  }
  // Для веб-версии используем относительный путь (работает через прокси)
  return path;
};

/**
 * Lab8: URL второго (async) сервиса.
 * - Web (vite dev): используем прокси `/async` -> http://localhost:8090
 * - Tauri: используем тот же IP, но порт 8090
 */
export const getAsyncUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL) {
    // Меняем порт на 8090 (если порт в конце указан)
    const asyncBase = API_BASE_URL.replace(/:\d+$/, ':8090');
    return `${asyncBase}${normalizedPath}`;
  }
  return `/async${normalizedPath}`;
};

/**
 * Установка IP адреса сервера для Tauri
 * @param ip - IP адрес сервера (например, 'http://192.168.1.100:8083')
 */
export const setServerIP = (ip: string): void => {
  if (isTauri) {
    localStorage.setItem('api_server_ip', ip);
    // Перезагружаем страницу для применения изменений
    window.location.reload();
  }
};

/**
 * Получение текущего IP адреса сервера
 */
export const getServerIPAddress = (): string => {
  return API_BASE_URL;
};

/**
 * Проверка, запущено ли приложение в Tauri
 */
export const isTauriApp = (): boolean => {
  return isTauri;
};

