function initializeTechFastTooltip() {
	if (window.__techFastTooltipInitialized) {
		return;
	}

	var techIcons = document.querySelectorAll('[data-tech-tooltip]');
	if (techIcons.length === 0) {
		return;
	}

	window.__techFastTooltipInitialized = true;

	var tooltip = document.querySelector('.technology-fast-tooltip');
	if (!tooltip) {
		tooltip = document.createElement('div');
		tooltip.className = 'technology-fast-tooltip';
		document.body.appendChild(tooltip);
	}

	var activeIcon = null;

	function moveTooltip(event) {
		if (!activeIcon) {
			return;
		}

		tooltip.style.left = event.clientX + 12 + 'px';
		tooltip.style.top = event.clientY - 12 + 'px';
	}

	function showTooltip(icon, event) {
		activeIcon = icon;
		tooltip.textContent = icon.getAttribute('data-tech-tooltip') || '';
		tooltip.classList.add('is-visible');
		moveTooltip(event);
	}

	function hideTooltip() {
		activeIcon = null;
		tooltip.classList.remove('is-visible');
	}

	techIcons.forEach(function (icon) {
		icon.addEventListener('mouseenter', function (event) {
			showTooltip(icon, event);
		});
		icon.addEventListener('mousemove', moveTooltip);
		icon.addEventListener('mouseleave', hideTooltip);
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeTechFastTooltip);
} else {
	initializeTechFastTooltip();
}
