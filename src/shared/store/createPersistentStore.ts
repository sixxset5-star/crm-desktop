// Хелпер для создания persistent stores с унифицированной логикой сохранения/загрузки
// Использование: обернуть существующий store и добавить логику автосохранения
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('PersistentStore');

type SaveFn<T> = (data: T) => Promise<void>;
type HasDataFn<T> = (data: T) => boolean;

interface PersistentStoreConfig<TState, TSlice> {
	store: ReturnType<typeof import('zustand').create<TState>>;
	selectData: (state: TState) => TSlice;
	saveFn: SaveFn<TSlice>;
	debounceMs?: number;
	hasData?: HasDataFn<TSlice>;
	storeName?: string;
}

const storeInstances = new Map<string, {
	hasLoadedOnce: boolean;
	isLoading: boolean;
	saveTimer: ReturnType<typeof setTimeout> | null;
}>();

export function setupPersistentStore<TState, TSlice>(
	config: PersistentStoreConfig<TState, TSlice>
) {
	const {
		store,
		selectData,
		saveFn,
		debounceMs = 300,
		hasData = (data) => {
			if (Array.isArray(data)) return data.length > 0;
			if (typeof data === 'object' && data !== null) {
				return Object.keys(data).length > 0;
			}
			return Boolean(data);
		},
		storeName = 'store'
	} = config;

	const instance = storeInstances.get(storeName) || {
		hasLoadedOnce: false,
		isLoading: false,
		saveTimer: null as ReturnType<typeof setTimeout> | null,
	};
	storeInstances.set(storeName, instance);

	// Автосохранение с debounce
	store.subscribe((state) => {
		if (instance.isLoading) return;
		
		const data = selectData(state);
		
		// Не сохраняем пустые данные, если еще не загружали
		if (!instance.hasLoadedOnce && !hasData(data)) return;
		
		if (instance.saveTimer) {
			clearTimeout(instance.saveTimer);
		}
		
		instance.saveTimer = setTimeout(() => {
			saveFn(data).catch((error) => {
				log.error(`Failed to save ${storeName}`, error);
			});
		}, debounceMs);
	});

	return {
		markAsLoaded: () => {
			instance.hasLoadedOnce = true;
		},
		setLoading: (loading: boolean) => {
			instance.isLoading = loading;
		},
		getHasLoadedOnce: () => instance.hasLoadedOnce,
		getIsLoading: () => instance.isLoading,
	};
}

