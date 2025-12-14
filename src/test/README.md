# Тестирование

Этот проект использует [Vitest](https://vitest.dev/) для unit-тестов и [Testing Library](https://testing-library.com/) для тестирования React компонентов.

## Запуск тестов

```bash
# Запустить тесты в watch режиме
npm run test

# Запустить тесты один раз
npm run test:run

# Запустить тесты с UI
npm run test:ui

# Запустить тесты с покрытием кода
npm run test:coverage
```

## Структура тестов

Тесты находятся рядом с исходными файлами в папках `__tests__`:

```
src/
  hooks/
    useTaskForm.ts
    __tests__/
      useTaskForm.test.ts
  shared/
    lib/
      format.ts
      __tests__/
        format.test.ts
```

## Написание тестов

### Пример теста для хука

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('должен работать корректно', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.doSomething();
    });
    
    expect(result.current.value).toBe(expected);
  });
});
```

### Пример теста для компонента

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('должен отображать контент', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Моки

Моки для Electron API находятся в `src/test/setup.ts`. Если нужно добавить новые моки, обновите этот файл.

## Покрытие кода

Цель покрытия кода: минимум 70% для критичных модулей (store, hooks, utils).

Исключения из покрытия:
- Конфигурационные файлы
- Типы и интерфейсы
- Моки и тестовые данные















