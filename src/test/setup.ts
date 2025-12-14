/**
 * Настройка тестового окружения
 * Этот файл выполняется перед каждым тестом
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Расширяем expect matchers из @testing-library/jest-dom
expect.extend(matchers);

// Очищаем DOM после каждого теста
afterEach(() => {
	cleanup();
});

// Моки для Electron API (если нужно)
if (typeof window !== 'undefined') {
	(window as any).electron = {
		selectFiles: vi.fn(),
		copyFileToTaskDir: vi.fn(),
		getTaskFilesDir: vi.fn(),
		getFileSize: vi.fn(),
		openFile: vi.fn(),
		downloadFile: vi.fn(),
		renameFile: vi.fn(),
		openExternalUrl: vi.fn(),
	};
}

