#!/usr/bin/env node

/**
 * Скрипт для принудительного удаления всех старых записей настроек,
 * кроме записи с key='main'
 * 
 * Использование:
 *   VITE_SUPABASE_URL="..." VITE_SUPABASE_ANON_KEY="..." node scripts/force-delete-old-settings.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('❌ Не указаны ключи Supabase');
	console.error('Используйте: VITE_SUPABASE_URL="..." VITE_SUPABASE_ANON_KEY="..." node scripts/force-delete-old-settings.mjs');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceDeleteOldSettings() {
	console.log('🗑️  Принудительное удаление старых записей настроек...\n');

	try {
		// Сначала получаем все записи
		const { data: allSettings, error: fetchError } = await supabase
			.from('settings')
			.select('key');

		if (fetchError) {
			console.error('❌ Ошибка при получении записей:', fetchError);
			process.exit(1);
		}

		if (!allSettings || allSettings.length === 0) {
			console.log('✅ Записей настроек не найдено');
			return;
		}

		console.log(`📋 Найдено записей: ${allSettings.length}`);
		
		// Фильтруем записи, которые нужно удалить (все кроме 'main')
		const keysToDelete = allSettings
			.map(s => s.key)
			.filter(key => key !== 'main');

		if (keysToDelete.length === 0) {
			console.log('✅ Нет старых записей для удаления (только "main" существует)');
			return;
		}

		console.log(`🗑️  Будут удалены записи: ${keysToDelete.join(', ')}\n`);

		// Удаляем каждую запись по отдельности
		let deleted = 0;
		let errors = 0;

		for (const key of keysToDelete) {
			const { error: deleteError } = await supabase
				.from('settings')
				.delete()
				.eq('key', key);

			if (deleteError) {
				console.error(`❌ Ошибка при удалении "${key}":`, deleteError);
				errors++;
			} else {
				console.log(`✅ Удалена запись: "${key}"`);
				deleted++;
			}
		}

		console.log(`\n📊 Итого: ${deleted} удалено, ${errors} ошибок`);

		// Проверяем результат
		const { data: remaining, error: checkError } = await supabase
			.from('settings')
			.select('key');

		if (checkError) {
			console.error('❌ Ошибка при проверке результата:', checkError);
		} else {
			console.log(`\n✅ Осталось записей: ${remaining?.length || 0}`);
			if (remaining && remaining.length > 0) {
				const keys = remaining.map(r => r.key).join(', ');
				console.log(`   Записи: ${keys}`);
			}

			if (remaining && remaining.length === 1 && remaining[0].key === 'main') {
				console.log('\n✅ Успешно! Теперь осталась только запись "main"');
			} else if (remaining && remaining.length > 1) {
				console.log('\n⚠️  Все еще остались старые записи. Возможно, проблема с RLS политиками.');
				console.log('   Попробуйте удалить их напрямую через SQL в Supabase Dashboard:');
				console.log('   DELETE FROM settings WHERE key != \'main\';');
			}
		}

	} catch (error) {
		console.error('❌ Критическая ошибка:', error);
		process.exit(1);
	}
}

forceDeleteOldSettings();

