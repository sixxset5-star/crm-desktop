/**
 * Сервис миграции старых кредитов в новый формат
 * Обнаруживает кредиты без графика и предлагает их обновить
 */
import { CreditsRepository } from '../repositories/credits-repository.js';
import { getDatabase } from './db-service.js';
import { buildSchedule } from '../domain/credits-service.js';
import { createLogger } from './logger.js';

const log = createLogger('CreditsMigration');

/**
 * Найти кредиты, которые нужно мигрировать (старые кредиты без графика)
 */
export function findCreditsNeedingMigration() {
	try {
		const db = getDatabase();
		const repository = new CreditsRepository();
		
		// Находим все кредиты
		const allCredits = repository.findAll();
		
		// Фильтруем те, у которых нет графика или недостаточно данных для построения графика
		const needsMigration = allCredits.filter(credit => {
			const schedule = repository.findScheduleByCreditId(credit.id);
			
			// Если есть график - не нужна миграция
			if (schedule && schedule.length > 0) {
				return false;
			}
			
			// Если есть базовые данные (сумма, ставка, срок) - можно мигрировать
			if (credit.amount && credit.interestRate && credit.termMonths && credit.startDate) {
				return true;
			}
			
			// Если есть хотя бы название - показываем для обновления
			return !!credit.name;
		});
		
		return needsMigration;
	} catch (error) {
		log.error('Error finding credits needing migration:', error);
		return [];
	}
}

/**
 * Мигрировать кредит в новый формат
 * Строит график платежей если есть достаточно данных
 */
export function migrateCredit(creditId, options = {}) {
	try {
		const repository = new CreditsRepository();
		const credit = repository.findById(creditId);
		
		if (!credit) {
			throw new Error(`Credit ${creditId} not found`);
		}
		
		// Проверяем, есть ли уже график
		const existingSchedule = repository.findScheduleByCreditId(creditId);
		if (existingSchedule && existingSchedule.length > 0) {
			log.info(`Credit ${creditId} already has schedule, skipping migration`);
			return credit;
		}
		
		// Если есть достаточно данных - строим график
		if (credit.amount && credit.interestRate && credit.termMonths && credit.startDate) {
			const scheduleType = credit.scheduleType || 'annuity';
			const paymentDay = credit.paymentDate ? parseInt(credit.paymentDate) : undefined;
			
			// Строим график
			const schedule = buildSchedule({
				scheduleType,
				amount: credit.amount,
				annualRate: credit.interestRate,
				termMonths: credit.termMonths,
				startDate: credit.startDate,
				paymentDay: paymentDay && paymentDay >= 1 && paymentDay <= 31 ? paymentDay : undefined,
			});
			
			// Сохраняем график
			repository.saveSchedule(creditId, schedule);
			
			// Пересчитываем остаток
			const { recalculateCurrentBalance } = require('../domain/credits-service.js');
			const updatedCredit = recalculateCurrentBalance(credit, schedule);
			
			// Обновляем кредит
			repository.save(updatedCredit);
			
			log.info(`Migrated credit ${creditId} with ${schedule.length} schedule items`);
			return updatedCredit;
		} else {
			// Если недостаточно данных - просто обновляем статус и поля
			const updatedCredit = {
				...credit,
				status: credit.status || 'active',
				scheduleType: credit.scheduleType || 'annuity',
				currentBalance: credit.currentBalance || credit.amount || 0,
			};
			
			repository.save(updatedCredit);
			log.info(`Updated credit ${creditId} metadata (insufficient data for schedule)`);
			return updatedCredit;
		}
	} catch (error) {
		log.error(`Error migrating credit ${creditId}:`, error);
		throw error;
	}
}

/**
 * Мигрировать все кредиты, которые нуждаются в миграции
 */
export function migrateAllCredits() {
	try {
		const creditsToMigrate = findCreditsNeedingMigration();
		const results = {
			success: [],
			failed: [],
		};
		
		for (const credit of creditsToMigrate) {
			try {
				const migrated = migrateCredit(credit.id);
				results.success.push(migrated);
			} catch (error) {
				results.failed.push({
					credit,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		
		log.info(`Migration complete: ${results.success.length} succeeded, ${results.failed.length} failed`);
		return results;
	} catch (error) {
		log.error('Error in migrateAllCredits:', error);
		throw error;
	}
}

