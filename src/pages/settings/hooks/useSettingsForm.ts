import { useState, useEffect } from 'react';
import { useSettingsStore, type Settings } from '@/store/settings';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';

export function useSettingsForm() {
	const settings = useShallowSelector(useSettingsStore, (s) => s.settings);
	const updateSettings = useSettingsStore((s) => s.updateSettings);
	const loadSettings = useSettingsStore((s) => s.loadFromDisk);
	
	const [localSettings, setLocalSettings] = useState<Settings>(settings);
	const [hasChanges, setHasChanges] = useState(false);
	
	useEffect(() => { 
		loadSettings().then(() => {
			const currentSettings = useSettingsStore.getState().settings;
			setLocalSettings(currentSettings);
			setHasChanges(false);
		});
	}, [loadSettings]);
	
	useEffect(() => {
		setHasChanges(JSON.stringify(localSettings) !== JSON.stringify(settings));
	}, [localSettings, settings]);
	
	const handleUpdateSettings = (updates: Partial<Settings>) => {
		const newSettings = { ...localSettings, ...updates };
		setLocalSettings(newSettings);
	};
	
	const handleSave = () => {
		updateSettings(localSettings);
		setHasChanges(false);
	};
	
	const handleReload = async () => {
		await loadSettings();
		const currentSettings = useSettingsStore.getState().settings;
		setLocalSettings(currentSettings);
		setHasChanges(false);
	};
	
	return {
		localSettings,
		hasChanges,
		handleUpdateSettings,
		handleSave,
		handleReload,
	};
}






