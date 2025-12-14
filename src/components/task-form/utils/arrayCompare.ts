/**
 * Быстрые функции сравнения массивов и объектов
 * Замена для медленного JSON.stringify
 */

/**
 * Shallow compare двух массивов по значениям (без учёта порядка)
 */
export function shallowCompareArrays<T>(a: T[], b: T[]): boolean {
	if (a.length !== b.length) return false;
	
	const setA = new Set(a);
	for (const item of b) {
		if (!setA.has(item)) return false;
	}
	return true;
}

/**
 * Сравнение массивов объектов по ID (для массивов с уникальными ID)
 */
export function compareArraysById<T extends { id: string }>(a: T[], b: T[]): boolean {
	if (a.length !== b.length) return false;
	
	const mapA = new Map(a.map(item => [item.id, item]));
	for (const item of b) {
		const itemA = mapA.get(item.id);
		if (!itemA || !shallowEqual(itemA, item)) {
			return false;
		}
	}
	return true;
}

/**
 * Shallow compare объектов (первый уровень)
 */
export function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	
	if (keysA.length !== keysB.length) return false;
	
	for (const key of keysA) {
		if (a[key] !== b[key]) return false;
	}
	return true;
}

/**
 * Deep compare для объектов (рекурсивный, но быстрее JSON.stringify)
 */
export function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	
	if (a == null || b == null) return false;
	if (typeof a !== typeof b) return false;
	
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}
	
	if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);
		
		if (keysA.length !== keysB.length) return false;
		
		for (const key of keysA) {
			if (!keysB.includes(key)) return false;
			const objA = a as Record<string, unknown>;
			const objB = b as Record<string, unknown>;
			if (!deepEqual(objA[key], objB[key])) return false;
		}
		return true;
	}
	
	return false;
}






