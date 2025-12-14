/**
 * Версионирование IPC контракта
 * Обеспечивает совместимость между main и renderer процессами
 */

// Версия контракта (увеличивать при изменении структуры)
// Формат: MAJOR.MINOR.PATCH (semver)
export const IPC_CONTRACT_VERSION = '1.0.0';

/**
 * Парсить версию в компоненты
 */
function parseVersion(version) {
	const parts = version.split('.').map(Number);
	return {
		major: parts[0] || 0,
		minor: parts[1] || 0,
		patch: parts[2] || 0,
	};
}

/**
 * Проверить совместимость версий контракта по semver правилам
 * @param {string} rendererVersion - Версия контракта из renderer
 * @returns {object} Результат проверки
 */
export function checkContractCompatibility(rendererVersion) {
	if (!rendererVersion) {
		return {
			compatible: false,
			severity: 'blocking',
			error: 'Renderer contract version not provided'
		};
	}

	const main = parseVersion(IPC_CONTRACT_VERSION);
	const renderer = parseVersion(rendererVersion);

	// MAJOR не совпадает → блокирующая несовместимость
	if (main.major !== renderer.major) {
		return {
			compatible: false,
			severity: 'blocking',
			error: `Major version mismatch: main=${IPC_CONTRACT_VERSION}, renderer=${rendererVersion}. Application must be updated.`,
			mainVersion: IPC_CONTRACT_VERSION,
			rendererVersion
		};
	}

	// MINOR больше в main → предупреждение (новые каналы могут быть недоступны)
	if (main.minor > renderer.minor) {
		return {
			compatible: true,
			severity: 'warning',
			warning: `Minor version mismatch: main=${IPC_CONTRACT_VERSION}, renderer=${rendererVersion}. Some features may be unavailable.`,
			mainVersion: IPC_CONTRACT_VERSION,
			rendererVersion
		};
	}

	// PATCH больше → игнорируем (обратная совместимость)
	if (main.patch > renderer.patch) {
		return {
			compatible: true,
			severity: 'info',
			info: `Patch version mismatch: main=${IPC_CONTRACT_VERSION}, renderer=${rendererVersion}. Update recommended.`,
			mainVersion: IPC_CONTRACT_VERSION,
			rendererVersion
		};
	}

	// Версии совпадают
	return {
		compatible: true,
		severity: 'ok',
		mainVersion: IPC_CONTRACT_VERSION,
		rendererVersion
	};
}

/**
 * Handshake между main и renderer
 * Renderer должен вызвать этот канал при инициализации
 */
export function initContractHandshake(ipcMain) {
	ipcMain.handle('ipc:handshake', async (event, rendererVersion) => {
		const result = checkContractCompatibility(rendererVersion);
		
		if (!result.compatible) {
			console.error('[IPC] Contract version mismatch:', result.error);
			return {
				ok: false,
				code: 'IPC_CONTRACT_VERSION_MISMATCH',
				message: result.error,
				severity: result.severity,
				mainVersion: result.mainVersion,
				rendererVersion: result.rendererVersion
			};
		}

		// Логируем предупреждения и информацию
		if (result.severity === 'warning') {
			console.warn('[IPC] Contract version warning:', result.warning);
		} else if (result.severity === 'info') {
			console.info('[IPC] Contract version info:', result.info);
		} else {
			console.log('[IPC] Contract handshake successful:', {
				main: result.mainVersion,
				renderer: result.rendererVersion
			});
		}

		return {
			ok: true,
			severity: result.severity,
			mainVersion: result.mainVersion,
			rendererVersion: result.rendererVersion,
			...(result.warning && { warning: result.warning }),
			...(result.info && { info: result.info })
		};
	});
}

