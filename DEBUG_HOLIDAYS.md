# Отладка: праздники не отображаются

## Диагностика

После выполнения SQL запроса `DELETE FROM settings WHERE key != 'main';` в Supabase Dashboard, выполните следующие шаги:

### 1. Очистить кеш браузера полностью

**Chrome/Edge:**
1. Откройте DevTools (F12 или Cmd+Option+I)
2. Правый клик на кнопке обновления
3. Выберите "Очистить кеш и жесткая перезагрузка"

**Или через настройки:**
1. Settings → Privacy → Clear browsing data
2. Выберите "Cached images and files"
3. Нажмите "Clear data"

### 2. Проверить консоль браузера

Откройте консоль (F12) и проверьте логи:

**Должны быть сообщения:**
- `[api-client] Settings loaded` с информацией о праздниках и выходных
- `[Settings] Settings loaded into store` с теми же данными

**Не должно быть:**
- Ошибок `Failed to parse setting currency`
- Предупреждений о старых записях

### 3. Проверить данные в React DevTools

1. Установите React DevTools (если еще нет)
2. Откройте DevTools → вкладка "⚛️ Components"
3. Найдите компонент `Workload` или любой компонент, использующий `useSettingsStore`
4. В правой панели найдите `settings` в props/state
5. Проверьте `settings.holidays` - должен быть массив с 11 элементами
6. Проверьте `settings.customWeekends` - должен быть массив с 6 элементами

### 4. Проверить через консоль браузера

В консоли браузера выполните:

```javascript
// Вариант 1: через window (если Zustand экспортирует store)
const store = window.__ZUSTAND_STORE__;
const settings = store?.getState?.()?.settings;
console.log('Holidays:', settings?.holidays);
console.log('Custom weekends:', settings?.customWeekends);

// Вариант 2: через React DevTools API (если установлен)
// Найдите компонент Workload в DevTools и используйте $r
```

### 5. Проверить текущий месяц

Праздники отображаются только для **текущего месяца**. Убедитесь, что:
- Вы смотрите на правильный месяц в календаре
- В этом месяце действительно есть праздники

Проверьте данные:
```bash
cd /Users/rafael/crm-desktop
node scripts/check-settings.mjs
```

Посмотрите на даты праздников - они должны попадать в текущий месяц.

### 6. Если данные не загружаются

Проверьте переменные окружения в Vercel:
- `VITE_SUPABASE_URL` - должен быть правильный URL
- `VITE_SUPABASE_ANON_KEY` - должен быть правильный ключ

Проверьте, что Vercel развернул последнюю версию кода (после добавления логирования).

### 7. Принудительная перезагрузка настроек

Если ничего не помогает, можно попробовать перезагрузить настройки вручную:

1. Откройте консоль браузера
2. Если у вас есть доступ к store, выполните:
   ```javascript
   // Это зависит от того, как экспортирован store
   // Попробуйте найти способ получить доступ к useSettingsStore.getState()
   ```

Или просто:
1. Выполните `./run-migration.sh fix-settings` еще раз
2. Очистите кеш браузера
3. Перезагрузите страницу
