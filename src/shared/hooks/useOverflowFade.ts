import React from 'react';

type OverflowFadeHook<T extends HTMLElement> = {
	ref: React.RefCallback<T>;
	isOverflowing: boolean;
};

export function useOverflowFade<T extends HTMLElement>(): OverflowFadeHook<T> {
	const [element, setElement] = React.useState<T | null>(null);
	const [isOverflowing, setIsOverflowing] = React.useState(false);

	const updateOverflowState = React.useCallback(() => {
		if (!element) return;
		const next = element.scrollHeight - element.clientHeight > 1;
		setIsOverflowing(next);
	}, [element]);

	React.useEffect(() => {
		const el = element;
		if (!el) return;

		let frame: number | null = null;
		const requestUpdate = () => {
			if (frame != null) return;
			frame = window.requestAnimationFrame(() => {
				frame = null;
				updateOverflowState();
			});
		};

		updateOverflowState();

		const resizeObserver = new ResizeObserver(requestUpdate);
		resizeObserver.observe(el);

		const mutationObserver = new MutationObserver(requestUpdate);
		mutationObserver.observe(el, { childList: true, subtree: true, characterData: true });

		el.addEventListener('scroll', requestUpdate);

		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			el.removeEventListener('scroll', requestUpdate);
			if (frame != null) {
				cancelAnimationFrame(frame);
			}
		};
	}, [element, updateOverflowState]);

	const ref = React.useCallback((node: T | null) => {
		setElement(node);
		updateOverflowState();
	}, [updateOverflowState]);

	return { ref, isOverflowing };
}

