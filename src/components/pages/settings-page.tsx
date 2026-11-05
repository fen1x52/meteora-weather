'use client';

import { useState, useSyncExternalStore } from 'react';
import { Bell, Check, Globe2, Heart, Palette, SlidersHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMeteora } from '@/components/providers';
import { PageHeading, Panel, SourceNote } from '@/components/ui';
import { clearApiCache } from '@/lib/api';
import type { Settings } from '@/lib/types';

type NotificationState = NotificationPermission | 'unsupported' | 'insecure' | 'unknown';
function notificationState(): NotificationState {
  if (typeof window === 'undefined') return 'unknown';
  if (!('Notification' in window)) return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  return Notification.permission;
}
function subscribePermission(callback: () => void) {
  window.addEventListener('focus', callback);
  window.addEventListener('meteora-notification-permission', callback);
  return () => {
    window.removeEventListener('focus', callback);
    window.removeEventListener('meteora-notification-permission', callback);
  };
}
const serverPermission = (): NotificationState => 'unknown';

export default function SettingsPage() {
  const { t, settings, setSettings, clearData, favorites } = useMeteora();
  const permission = useSyncExternalStore(subscribePermission, notificationState, serverPermission);
  const [requesting, setRequesting] = useState(false);
  const [notificationError, setNotificationError] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  async function toggleNotifications() {
    setNotificationError(false);
    if (settings.notifications) { setSettings({ notifications: false }); return; }
    const current = notificationState();
    if (current === 'unsupported' || current === 'insecure' || current === 'denied') return;
    setRequesting(true);
    try {
      const result = current === 'granted' ? 'granted' : await Notification.requestPermission();
      setSettings({ notifications: result === 'granted' });
      window.dispatchEvent(new Event('meteora-notification-permission'));
    } catch { setNotificationError(true); }
    finally { setRequesting(false); }
  }

  function resetData() {
    clearApiCache();
    clearData();
    try {
      const keys = Object.keys(sessionStorage).filter(key => key.startsWith('meteora.notice:'));
      keys.forEach(key => sessionStorage.removeItem(key));
    } catch { /* Browser storage may be disabled; in-memory preferences were reset. */ }
    setConfirmClear(false);
    setCleared(true);
  }

  const notificationDetail = permission === 'unsupported'
    ? t('Этот браузер не поддерживает уведомления. Предупреждения доступны в приложении.', 'This browser does not support notifications. Alerts remain available in the app.')
    : permission === 'insecure'
      ? t('Для уведомлений откройте сайт по HTTPS или на localhost.', 'Open the site over HTTPS or on localhost to use notifications.')
      : permission === 'denied'
        ? t('Уведомления заблокированы браузером. Изменить разрешение можно в настройках сайта в браузере.', 'Notifications are blocked. You can change permission in your browser’s site settings.')
        : t('Предупреждения о заметных погодных условиях, пока приложение открыто. Браузер спросит ваше разрешение.', 'Alerts about notable weather conditions while the app is open. Your browser will ask for permission.');

  return <div className="stack">
    <PageHeading eyebrow={t('ВАША METEORA', 'YOUR METEORA')} title={t('Всё по-вашему', 'Make it yours')} description={t('Настройте пространство, в котором удобно следить за погодой.', 'Create a comfortable space for following the weather.')} />

    <div className="grid-2">
      <Panel>
        <h2 className="section-title"><Globe2 size={20} /> {t('Язык и единицы', 'Language & units')}</h2>
        <div className="settings-row"><label htmlFor="language"><strong>{t('Язык интерфейса', 'Interface language')}</strong><small>{t('Изменения применяются сразу', 'Changes apply immediately')}</small></label><select id="language" className="select" value={settings.language} onChange={event => setSettings({ language: event.target.value as Settings['language'] })}><option value="ru">Русский</option><option value="en">English</option></select></div>
        <div className="settings-row"><label htmlFor="temperature"><strong>{t('Температура', 'Temperature')}</strong></label><select id="temperature" className="select" value={settings.temperature} onChange={event => setSettings({ temperature: event.target.value as Settings['temperature'] })}><option value="celsius">°C · {t('Цельсий', 'Celsius')}</option><option value="fahrenheit">°F · {t('Фаренгейт', 'Fahrenheit')}</option></select></div>
        <div className="settings-row"><label htmlFor="wind"><strong>{t('Скорость ветра', 'Wind speed')}</strong></label><select id="wind" className="select" value={settings.wind} onChange={event => setSettings({ wind: event.target.value as Settings['wind'] })}><option value="ms">{t('Метры в секунду · м/с', 'Metres per second · m/s')}</option><option value="kmh">{t('Километры в час · км/ч', 'Kilometres per hour · km/h')}</option><option value="mph">{t('Мили в час · миль/ч', 'Miles per hour · mph')}</option></select></div>
        <div className="settings-row"><label htmlFor="pressure"><strong>{t('Давление', 'Pressure')}</strong></label><select id="pressure" className="select" value={settings.pressure} onChange={event => setSettings({ pressure: event.target.value as Settings['pressure'] })}><option value="hpa">{t('Гектопаскали · гПа', 'Hectopascals · hPa')}</option><option value="mmhg">{t('Миллиметры рт. ст.', 'Millimetres of mercury')}</option></select></div>
      </Panel>

      <Panel>
        <h2 className="section-title"><Palette size={20} /> {t('Внешний вид', 'Appearance')}</h2>
        <div className="settings-row"><label htmlFor="theme"><strong>{t('Тема оформления', 'Color theme')}</strong><small>{t('Авто следует настройке устройства', 'Auto follows your device')}</small></label><select id="theme" className="select" value={settings.theme} onChange={event => setSettings({ theme: event.target.value as Settings['theme'] })}><option value="auto">{t('Автоматически', 'Automatic')}</option><option value="light">{t('Светлая', 'Light')}</option><option value="dark">{t('Ночная', 'Midnight')}</option><option value="aurora">{t('Северное сияние', 'Aurora')}</option><option value="ocean">{t('Океан', 'Ocean')}</option><option value="sunset">{t('Закат', 'Sunset')}</option></select></div>
        <div className="settings-row"><label htmlFor="density"><strong>{t('Плотность карточек', 'Card spacing')}</strong><small>{t('Выберите больше воздуха или компактный вид', 'Choose more breathing room or a compact view')}</small></label><select id="density" className="select" value={settings.density} onChange={event => setSettings({ density: event.target.value as Settings["density"] })}><option value="comfortable">{t('Просторно', 'Comfortable')}</option><option value="compact">{t('Компактно', 'Compact')}</option></select></div>
        <div className="settings-row"><div id="animations-label"><strong>{t('Живая атмосфера', 'Animated atmosphere')}</strong><small>{t('Погодные сцены и плавные переходы', 'Weather scenes and smooth transitions')}</small></div><button type="button" role="switch" aria-checked={settings.animations} aria-labelledby="animations-label" className={`switch ${settings.animations ? 'on' : ''}`} onClick={() => setSettings({ animations: !settings.animations })}><span /></button></div>
        <SourceNote>{t('Системное предпочтение уменьшения движения также учитывается. Данные и навигация работают при отключённых анимациях.', 'Your device’s reduced-motion preference is respected. Data and navigation work with animations turned off.')}</SourceNote>
        <div className="settings-row"><div><strong><Heart size={16} /> {t('Избранные места', 'Favorite places')}</strong><small>{favorites.length} {t('из 20 сохранённых мест', 'of 20 saved places')}</small></div><Link href="/favorites" className="button secondary">{t('Управлять', 'Manage')}</Link></div>
      </Panel>
    </div>

    <Panel>
      <h2 className="section-title"><Bell size={20} /> {t('Будьте в курсе', 'Stay informed')}</h2>
      <div className="settings-row"><div id="notifications-label"><strong>{t('Браузерные уведомления', 'Browser notifications')}</strong><small>{notificationDetail}</small></div><button type="button" role="switch" aria-checked={settings.notifications && permission === 'granted'} aria-labelledby="notifications-label" className={`switch ${settings.notifications && permission === 'granted' ? 'on' : ''}`} onClick={() => void toggleNotifications()} disabled={requesting || (!settings.notifications && ['unsupported', 'insecure', 'denied'].includes(permission))}><span /></button></div>
      {requesting && <p role="status" className="muted">{t('Ожидаем решение в окне браузера…', 'Waiting for your choice in the browser…')}</p>}
      {notificationError && <p role="alert">{t('Браузер не разрешил включить уведомления. Предупреждения остаются доступны на сайте.', 'The browser could not enable notifications. Alerts remain available on the site.')}</p>}
      <SourceNote>{t('Уведомления работают только при открытом приложении и поддержке браузера. Доставка при закрытой вкладке не предусмотрена. Погодные советы по правилам отделены от официальных предупреждений.', 'Notifications require an open app and browser support. Delivery with the tab closed is not provided. Rule-based weather advice is separate from official alerts.')}</SourceNote>
      <Link href="/alerts" className="text-link">{t('Перейти к предупреждениям', 'View alerts')} →</Link>
    </Panel>

    <Panel>
      <h2 className="section-title"><SlidersHorizontal size={20} /> {t('Ваши данные', 'Your data')}</h2>
      <p className="muted">{t('Выбранное место, избранное, недавние поиски и предпочтения сохраняются в этом браузере. Координаты и поисковые запросы передаются соответствующим поставщикам данных. Между устройствами настройки не синхронизируются.', 'Your selected place, favorites, recent searches, and preferences are saved in this browser. Coordinates and searches are sent to the relevant data providers. Settings are not synced between devices.')}</p>
      {confirmClear ? <div className="stack" style={{ gap: 12 }}><p>{t('Сбросить настройки, избранное и недавние места в этом браузере?', 'Reset settings, favorites, and recent places in this browser?')}</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button className="button" type="button" onClick={resetData}><Trash2 size={16} />{t('Сбросить локальные данные', 'Reset local data')}</button><button className="button secondary" type="button" onClick={() => setConfirmClear(false)}>{t('Отмена', 'Cancel')}</button></div></div> : <button className="button secondary" type="button" onClick={() => { setConfirmClear(true); setCleared(false); }}><Trash2 size={16} />{t('Очистить локальные данные', 'Clear local data')}</button>}
      {cleared && <p role="status"><Check size={16} /> {t('Локальные данные сброшены. Восстановлены исходные настройки.', 'Local data cleared. Default settings restored.')}</p>}
      <SourceNote>{t('Очистка не отзывает разрешения геолокации и уведомлений: ими управляет браузер.', 'Clearing data does not revoke location or notification permissions; those are managed by your browser.')}</SourceNote>
    </Panel>

    <Panel>
      <h2 className="section-title">{t('Прозрачно о данных', 'Know your sources')}</h2>
      <p className="muted">{t('Текущая погода и прогноз — расчёты погодных моделей Open-Meteo. Качество воздуха — модели Copernicus CAMS. Эти значения не являются показаниями датчика в выбранной точке.', 'Current weather and forecasts are Open-Meteo weather-model estimates. Air quality uses Copernicus CAMS models. These values are not sensor readings at the selected location.')}</p>
      <div className="source-links" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a><a href="https://atmosphere.copernicus.eu/" target="_blank" rel="noreferrer">Copernicus CAMS</a><a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a><a href="https://earthquake.usgs.gov/" target="_blank" rel="noreferrer">USGS</a><a href="https://eonet.gsfc.nasa.gov/" target="_blank" rel="noreferrer">NASA EONET</a><a href="https://www.weather.gov/" target="_blank" rel="noreferrer">NOAA / NWS</a></div>
      <SourceNote>Meteora 1.0 · {t('Веб-версия. Доступность и покрытие зависят от источников. Бесплатные API используются на условиях поставщиков, включая ограничения некоммерческого использования.', 'Web edition. Availability and coverage depend on the data sources. Free APIs are used under provider terms, including noncommercial-use restrictions.')}</SourceNote>
    </Panel>
  </div>;
}



