/**
 * Storage Client для работы с Supabase Storage
 * Заменяет локальную файловую систему для веб-версии
 */
import { supabase } from './supabase-client';
import { createLogger } from '../logger';

const log = createLogger('storage-client');

const AVATARS_BUCKET = 'avatars';

/**
 * Загрузить аватар в Supabase Storage
 * @param file File объект
 * @param fileName Имя файла (без пути)
 * @returns Public URL аватара или null при ошибке
 */
export async function uploadAvatar(file: File, fileName: string): Promise<string | null> {
  try {
    // Очищаем имя файла от пути (для безопасности)
    const cleanFileName = fileName.replace(/^.*[\\\/]/, '');
    
    const { data, error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: true, // Заменяем существующий файл
      });

    if (error) {
      log.error('Failed to upload avatar', error);
      return null;
    }

    // Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(cleanFileName);

    log.debug('Avatar uploaded', { fileName: cleanFileName, publicUrl });
    return publicUrl;
  } catch (error) {
    log.error('Error uploading avatar', error);
    return null;
  }
}

/**
 * Получить публичный URL аватара
 * @param fileName Имя файла
 * @returns Public URL
 */
export function getAvatarUrl(fileName: string | null | undefined): string | null {
  if (!fileName) return null;

  // Если это уже полный URL (http/https) - возвращаем как есть
  if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
    return fileName;
  }

  // Если это crm:// протокол - извлекаем имя файла
  let cleanFileName = fileName;
  if (fileName.startsWith('crm://')) {
    cleanFileName = fileName.replace('crm://', '');
  }

  // Если это путь с / - берем только имя файла
  cleanFileName = cleanFileName.replace(/^.*[\\\/]/, '');

  // Возвращаем публичный URL из Supabase Storage
  const { data: { publicUrl } } = supabase.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(cleanFileName);

  return publicUrl;
}

/**
 * Удалить аватар из Storage
 * @param fileName Имя файла
 */
export async function deleteAvatar(fileName: string): Promise<boolean> {
  try {
    // Извлекаем имя файла
    let cleanFileName = fileName;
    if (fileName.startsWith('crm://')) {
      cleanFileName = fileName.replace('crm://', '');
    }
    cleanFileName = cleanFileName.replace(/^.*[\\\/]/, '');

    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .remove([cleanFileName]);

    if (error) {
      log.error('Failed to delete avatar', error);
      return false;
    }

    return true;
  } catch (error) {
    log.error('Error deleting avatar', error);
    return false;
  }
}

