/**
 * Domain-сервис для работы с клиентами
 * Содержит бизнес-логику и валидацию
 * Stateless - не хранит состояние
 */
import { CustomersRepository } from '../repositories/customers-repository.js';
import { validateCreateCustomer, validateUpdateCustomer, validateCustomersArray } from './dto/customer.dto.js';
import { createLogger } from '../services/logger.js';
import { DomainError, DOMAIN_ERROR_CODES, createDomainErrorFromZod, createNotFoundError, createDatabaseError } from './errors.js';

const log = createLogger('CustomersService');

export class CustomersService {
	constructor(repository = null) {
		this.repository = repository || new CustomersRepository();
	}

	/**
	 * Загрузить всех клиентов
	 */
	async getAllCustomers() {
		try {
			return this.repository.findAll();
		} catch (error) {
			throw new Error(`Failed to load customers: ${error.message}`);
		}
	}

	/**
	 * Получить клиента по ID
	 */
	async getCustomerById(id) {
		if (!id) {
			throw new Error('Customer ID is required');
		}

		const customer = this.repository.findById(id);
		if (!customer) {
			throw new Error(`Customer with id ${id} not found`);
		}

		return customer;
	}

	/**
	 * Создать нового клиента
	 * @param {object} customerData - Данные клиента (валидируются через DTO)
	 */
	async createCustomer(customerData) {
		// Валидация через DTO
		let validatedData;
		try {
			validatedData = validateCreateCustomer(customerData);
		} catch (error) {
			log.error('Customer validation failed', { error: error.message, data: customerData });
			// Преобразуем Zod ошибку в DomainError
			if (error.name === 'ZodError') {
				throw createDomainErrorFromZod(error, 'Customer');
			}
			throw new DomainError(DOMAIN_ERROR_CODES.CUSTOMER_VALIDATION_FAILED, error.message);
		}

		try {
			const created = this.repository.create(validatedData);
			log.info('Customer created', { id: created.id, name: created.name });
			return created;
		} catch (error) {
			log.error('Failed to create customer', { error: error.message, customerId: validatedData.id });
			// Преобразуем в DomainError
			if (error instanceof DomainError) {
				throw error;
			}
			throw createDatabaseError(`Failed to create customer: ${error.message}`, { customerId: validatedData.id });
		}
	}

	/**
	 * Обновить клиента
	 * @param {string} id - ID клиента
	 * @param {object} updates - Обновления (валидируются через DTO)
	 */
	async updateCustomer(id, updates) {
		if (!id) {
			throw new Error('Customer ID is required');
		}

		// Валидация через DTO
		let validatedUpdates;
		try {
			validatedUpdates = validateUpdateCustomer({ id, ...updates });
		} catch (error) {
			log.error('Customer update validation failed', { error: error.message, id, updates });
			// Преобразуем Zod ошибку в DomainError
			if (error.name === 'ZodError' || error.issues) {
				throw createDomainErrorFromZod(error, 'Customer');
			}
			throw new DomainError(DOMAIN_ERROR_CODES.CUSTOMER_VALIDATION_FAILED, error.message);
		}

		// Проверяем существование клиента
		const existing = this.repository.findById(id);
		if (!existing) {
			throw new Error(`Customer with id ${id} not found`);
		}

		try {
			const updated = this.repository.update(id, validatedUpdates);
			log.info('Customer updated', { id, changes: Object.keys(updates) });
			return updated;
		} catch (error) {
			log.error('Failed to update customer', { error: error.message, id });
			throw new Error(`Failed to update customer: ${error.message}`);
		}
	}

	/**
	 * Удалить клиента
	 */
	async deleteCustomer(id) {
		if (!id) {
			throw new Error('Customer ID is required');
		}

		const existing = this.repository.findById(id);
		if (!existing) {
			throw createNotFoundError('Customer', id);
		}

		try {
			this.repository.delete(id);
		} catch (error) {
			if (error instanceof DomainError) {
				throw error;
			}
			throw createDatabaseError(`Failed to delete customer: ${error.message}`, { id });
		}
	}

	/**
	 * Сохранить всех клиентов (для синхронизации)
	 * Использует транзакцию для атомарности
	 * @param {Array} customers - Массив клиентов
	 */
	async saveAllCustomers(customers) {
		if (!Array.isArray(customers)) {
			log.error('saveAllCustomers: customers is not an array', { type: typeof customers, customers });
			throw new DomainError(DOMAIN_ERROR_CODES.CUSTOMER_VALIDATION_FAILED, 'Customers must be an array');
		}
		
		// Дополнительная проверка перед вызовом map
		if (customers === null || customers === undefined) {
			log.error('saveAllCustomers: customers is null or undefined', { customers });
			throw new DomainError(DOMAIN_ERROR_CODES.CUSTOMER_VALIDATION_FAILED, 'Customers cannot be null or undefined');
		}
		
		// Нормализация данных перед валидацией
		const normalizedCustomers = customers.map((customer, index) => {
			// Создаем новый объект, чтобы не мутировать исходный
			const normalizedCustomer = { ...customer };
			
			// Преобразуем null в undefined для поля contact
			if (normalizedCustomer.contact === null) {
				log.debug('Normalizing customer contact from null to undefined', { 
					customerIndex: index,
					customerId: customer.id 
				});
				normalizedCustomer.contact = undefined;
			}
			
			// Преобразуем null в undefined для поля comment
			if (normalizedCustomer.comment === null) {
				log.debug('Normalizing customer comment from null to undefined', { 
					customerIndex: index,
					customerId: customer.id 
				});
				normalizedCustomer.comment = undefined;
			}
			
			// Преобразуем null в undefined для поля avatar
			if (normalizedCustomer.avatar === null) {
				log.debug('Normalizing customer avatar from null to undefined', { 
					customerIndex: index,
					customerId: customer.id 
				});
				normalizedCustomer.avatar = undefined;
			}
			
			return normalizedCustomer;
		});

		// ВАЖНО: Валидация через DTO происходит ПОСЛЕ нормализации
		// К этому моменту все null значения должны быть преобразованы в undefined
		let validatedCustomers;
		try {
			log.debug('Starting DTO validation after normalization', { 
				customersCount: normalizedCustomers.length,
				sampleCustomer: normalizedCustomers[0] ? {
					id: normalizedCustomers[0].id,
					name: normalizedCustomers[0].name,
					hasContact: normalizedCustomers[0].contact !== undefined,
					contactValue: normalizedCustomers[0].contact,
					hasComment: normalizedCustomers[0].comment !== undefined,
					commentValue: normalizedCustomers[0].comment,
					commentType: typeof normalizedCustomers[0].comment,
				} : null
			});
			validatedCustomers = validateCustomersArray(normalizedCustomers);
			
			// Проверяем, что валидация вернула массив
			if (!Array.isArray(validatedCustomers)) {
				log.error('validateCustomersArray returned non-array', { 
					type: typeof validatedCustomers, 
					validatedCustomers,
					inputCount: normalizedCustomers.length
				});
				throw new Error('validateCustomersArray returned invalid result (not an array)');
			}
			
			log.debug('Validation successful', { count: validatedCustomers.length });
		} catch (error) {
			log.error('Customers array validation failed', { 
				error: error.message, 
				count: customers?.length,
				errorName: error.name,
				errorDetails: error.details,
				firstCustomer: normalizedCustomers[0] ? {
					id: normalizedCustomers[0].id,
					comment: normalizedCustomers[0].comment,
					commentType: typeof normalizedCustomers[0].comment,
				} : null
			});
			// Преобразуем Zod ошибку в DomainError
			if (error.name === 'ZodError' || error.issues) {
				throw createDomainErrorFromZod(error, 'Customers');
			}
			throw new DomainError(DOMAIN_ERROR_CODES.CUSTOMER_VALIDATION_FAILED, error.message);
		}

		try {
			// Дополнительная проверка перед сохранением
			if (!Array.isArray(validatedCustomers)) {
				log.error('saveAllCustomers: validatedCustomers is not an array', { 
					type: typeof validatedCustomers, 
					validatedCustomers 
				});
				throw new Error('validatedCustomers must be an array');
			}
			
			// Используем транзакцию для атомарности
			// Проверяем наличие метода runInTransaction
			if (typeof this.repository.runInTransaction === 'function') {
				this.repository.runInTransaction(() => {
					this.repository.saveAll(validatedCustomers);
				});
			} else {
				// Fallback: если runInTransaction отсутствует, используем transaction напрямую
				log.warn('[CustomersService] runInTransaction not found, using transaction directly');
				if (typeof this.repository.transaction === 'function') {
					this.repository.transaction(() => {
						this.repository.saveAll(validatedCustomers);
					});
				} else {
					// Последний fallback: сохраняем без транзакции
					log.warn('[CustomersService] transaction not found, saving without transaction');
					this.repository.saveAll(validatedCustomers);
				}
			}
			
			log.info('Customers saved', { count: validatedCustomers.length });
		} catch (error) {
			log.error('Failed to save customers', { 
				error: error.message, 
				count: validatedCustomers?.length ?? 'unknown',
				hasValidatedCustomers: validatedCustomers !== undefined
			});
			throw new Error(`Failed to save customers: ${error.message}`);
		}
	}
}

