# Стилизация в CRM Desktop

## Принципы стилизации

### 1. CSS модули для компонентов

**Правило:** Все компоненты должны использовать CSS модули (`.module.css`) для своих стилей.

**Пример:**
```typescript
// ✅ Правильно
import styles from './MyComponent.module.css';

export function MyComponent() {
  return <div className={styles.container}>Content</div>;
}
```

```css
/* MyComponent.module.css */
.container {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-lg);
}
```

### 2. CSS токены (Design Tokens)

**Правило:** Все значения цветов, отступов, размеров, типографики должны использовать CSS токены из `src/shared/styles/tokens.css`.

**Запрещено:**
```css
/* ❌ Неправильно - хардкодные значения */
.container {
  padding: 16px;
  color: #6f665a;
  font-size: 14px;
}
```

**Правильно:**
```css
/* ✅ Правильно - использование токенов */
.container {
  padding: var(--space-md);
  color: var(--muted);
  font-size: var(--font-size-sm);
}
```

### 3. Inline стили

**Правило:** Inline стили (`style={{}}`) используются **только** для динамических значений, которые вычисляются во время выполнения.

**Разрешено:**
```typescript
// ✅ Правильно - динамическое значение
<div style={{ width: `${percentage}%` }}>
  Progress: {percentage}%
</div>

// ✅ Правильно - динамическое позиционирование
<div style={{ 
  transform: `translate(${x}px, ${y}px)`,
  opacity: isVisible ? 1 : 0 
}}>
  Content
</div>
```

**Запрещено:**
```typescript
// ❌ Неправильно - статические значения должны быть в CSS модуле
<div style={{ 
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '16px'
}}>
  Content
</div>
```

### 4. Глобальные стили

**Правило:** Глобальные стили используются только для:
- Сброса стилей браузера
- Базовых стилей для HTML элементов (`body`, `a`, и т.д.)
- Утилитарных классов, используемых по всему приложению

Глобальные стили находятся в `src/shared/styles/styles.css`.

## Структура файлов стилей

### CSS модули компонентов

CSS модули должны находиться рядом с компонентом:

```
src/
  components/
    MyComponent.tsx
    MyComponent.module.css
```

Или для сложных компонентов:

```
src/
  components/
    MyComponent/
      index.tsx
      MyComponent.module.css
      SubComponent.tsx
      SubComponent.module.css
```

### Именование классов

Используйте camelCase для имен классов в CSS модулях:

```css
/* ✅ Правильно */
.container { }
.header { }
.contentWrapper { }
.isActive { }
```

```css
/* ❌ Неправильно */
.container-wrapper { }
.header_content { }
```

## Доступные CSS токены

Все токены определены в `src/shared/styles/tokens.css`. Основные категории:

### Цвета
- `--bg`, `--panel`, `--panel-muted`
- `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--accent`, `--green`, `--red`, `--warning`
- `--border`, `--border-strong`, `--border-light`

### Отступы (Spacing)
- `--space-xs` (4px)
- `--space-sm` (8px)
- `--space-md` (16px)
- `--space-lg` (24px)
- `--space-xl` (40px)
- `--space-xxl` (64px)

### Радиусы (Border Radius)
- `--radius-s` (12px)
- `--radius-m` (14px)
- `--radius-md` (8px)
- `--radius-l` (16px)
- `--radius-lg` (24px)
- `--radius-pill` (999px)

### Типографика
- `--font-size-xs` (11px)
- `--font-size-sm` (13px)
- `--font-size-md` (15px)
- `--font-size-lg` (18px)
- `--font-size-xl` (22px)
- `--font-weight-normal`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`

### Размеры контролов
- `--control-xs-height` (28px)
- `--control-sm-height` (32px)
- `--control-md-height` (36px)
- `--control-lg-height` (42px)
- `--control-xl-height` (44px)

Полный список токенов см. в `src/shared/styles/tokens.css`.

## Миграция существующего кода

При рефакторинге компонентов с inline стилями:

1. **Создайте CSS модуль** рядом с компонентом
2. **Перенесите статические стили** в CSS модуль
3. **Используйте CSS токены** вместо хардкодных значений
4. **Оставьте inline стили** только для динамических значений

### Пример миграции

**До:**
```typescript
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    color: 'var(--muted)',
    fontSize: 14
  }}>
    Loading...
  </div>
);
```

**После:**
```typescript
import styles from './LoadingFallback.module.css';

const LoadingFallback = () => (
  <div className={styles.loadingFallback}>
    Loading...
  </div>
);
```

```css
/* LoadingFallback.module.css */
.loadingFallback {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  color: var(--muted);
  font-size: var(--font-size-sm);
}
```

## Проверка соответствия

Перед коммитом проверьте:

- [ ] Нет хардкодных hex-цветов (используются токены)
- [ ] Нет хардкодных значений отступов/размеров (используются токены)
- [ ] Inline стили используются только для динамических значений
- [ ] CSS модули созданы для всех компонентов
- [ ] Имена классов в camelCase

## Дополнительные ресурсы

- [CSS Modules документация](https://github.com/css-modules/css-modules)
- [Design Tokens в CSS](https://css-tricks.com/a-complete-guide-to-custom-properties/)
- Токены проекта: `src/shared/styles/tokens.css`
- Утилиты для работы с токенами: `src/shared/lib/tokens.ts`


