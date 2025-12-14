# Как запушить workflow файлы в GitHub

## Проблема
GitHub не позволяет пушить workflow файлы через Personal Access Token без права `workflow`.

## Решение 1: Через веб-интерфейс (самый простой)

1. Откройте https://github.com/sixxset5-star/crm-desktop
2. Если увидите предложение "1 commit ahead" или "This branch is X commits ahead" - нажмите на это
3. GitHub может предложить создать Pull Request или напрямую запушить
4. Если есть кнопка "Sync fork" или "Update branch" - используйте её

ИЛИ

1. Откройте https://github.com/sixxset5-star/crm-desktop
2. Перейдите во вкладку **"Actions"**
3. GitHub может показать, что есть локальные изменения - там может быть кнопка для синхронизации

## Решение 2: Создать новый токен с правами workflow

1. Откройте https://github.com/settings/tokens
2. Нажмите **"Generate new token"** → **"Generate new token (classic)"**
3. Дайте название токену (например "CRM Desktop")
4. Выберите срок действия (например "No expiration")
5. **ВАЖНО**: Отметьте права:
   - ✅ `repo` (все подпункты)
   - ✅ `workflow` (для workflow файлов)
6. Нажмите **"Generate token"** внизу
7. **СКОПИРУЙТЕ токен** (он показывается только один раз!)
8. Обновите URL в git:
   ```bash
   git remote set-url origin https://ВАШ_НОВЫЙ_ТОКЕН@github.com/sixxset5-star/crm-desktop.git
   git push
   ```

## Решение 3: Использовать GitHub CLI

Если установлен GitHub CLI:
```bash
gh auth login
git push
```

## Что делать после успешного push

После успешного push:
1. Перейдите во вкладку **"Actions"** на GitHub
2. Убедитесь, что workflow "Deploy to GitHub Pages" запустился
3. Подождите 1-2 минуты
4. Откройте https://sixxset5-star.github.io/crm-desktop/

