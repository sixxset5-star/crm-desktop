# ⚡ Быстрая настройка Storage для аватаров

## Выполните этот SQL в Supabase SQL Editor:

```sql
-- Создаем bucket для аватаров (если еще не создан)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Политики доступа для чтения (публичный доступ)
CREATE POLICY "Public Access for avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Политики для загрузки (публичная загрузка)
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- Политики для обновления
CREATE POLICY "Anyone can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

-- Политики для удаления
CREATE POLICY "Anyone can delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');
```

---

## Шаги:

1. Откройте **Supabase Dashboard** → **SQL Editor**
2. Скопируйте SQL выше (весь блок)
3. Вставьте в редактор
4. Нажмите **"Run"** или **Ctrl+Enter**
5. Должно появиться сообщение **"Success. No rows returned"**

---

## Альтернативный способ (через UI):

Если SQL не работает, можно создать bucket вручную:

1. **Supabase Dashboard** → **Storage**
2. Нажмите **"New bucket"**
3. Введите:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Включено
4. Нажмите **"Create bucket"**
5. Перейдите в **Storage** → **Policies**
6. Выберите bucket `avatars`
7. Добавьте политики вручную (или они создадутся автоматически для публичного bucket)

