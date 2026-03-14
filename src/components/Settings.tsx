import { useEffect, useRef, useState } from "react";
import { ThemeSwitch } from "./ThemeSwitch";

const ThemeIcon = () => (
	<svg
		viewBox="0 0 24 24"
		className="settings__icon"
		aria-hidden="true"
	>
		<path d="M19 15.5A7.5 7.5 0 0 1 8.5 5 8 8 0 1 0 19 15.5Z" />
	</svg>
);

const SettingsIcon = () => (
	<svg
		viewBox="0 0 24 24"
		className="settings__icon"
		aria-hidden="true"
	>
		<path d="M4 7h10" />
		<path d="M4 17h16" />
		<path d="M18 7h2" />
		<path d="M4 12h16" />
		<circle cx="16" cy="7" r="2" />
		<circle cx="10" cy="12" r="2" />
		<circle cx="16" cy="17" r="2" />
	</svg>
);

interface SettingsProps {
	isDarkMode: boolean;
	setIsDarkMode: (isDarkMode: boolean) => void;
	onExportTimeline: () => void;
	onDeleteAllData: () => void;
}

export function Settings({
	isDarkMode,
	setIsDarkMode,
	onExportTimeline,
	onDeleteAllData,
}: SettingsProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handlePointerDown = (event: PointerEvent) => {
			if (
				containerRef.current &&
				event.target instanceof Node &&
				!containerRef.current.contains(event.target)
			) {
				setIsOpen(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		window.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	useEffect(() => {
		if (isOpen) {
			return;
		}

		setIsDeleteConfirming(false);
	}, [isOpen]);

	const handleDeleteButtonClick = () => {
		if (!isDeleteConfirming) {
			setIsDeleteConfirming(true);
			return;
		}

		onDeleteAllData();
		setIsDeleteConfirming(false);
		setIsOpen(false);
	};

	return (
		<div
			ref={containerRef}
			className={`settings${isOpen ? " settings--open" : ""}`}
		>
			{!isOpen ? (
				<button
					className="settings__trigger"
					type="button"
					aria-expanded="false"
					aria-controls="settings-panel"
					aria-label="Open settings"
					onClick={() => setIsOpen(true)}
				>
					<SettingsIcon />
				</button>
			) : null}
			{isOpen ? (
				<div className="settings__panel" id="settings-panel">
					<div className="settings__group">
						<div className="settings__toggle-row">
							<span className="settings__icon-label">
								<ThemeIcon />
							</span>
							<ThemeSwitch
								id="dark-mode-switch"
								checked={isDarkMode}
								onChange={setIsDarkMode}
							/>
						</div>
					</div>

					<div className="settings__group">
						<button
							className="settings__button"
							type="button"
							onClick={onExportTimeline}
						>
							Download JSON
						</button>
						<button
							className={`settings__button settings__button--danger${
								isDeleteConfirming
									? " settings__button--danger-confirming"
									: ""
							}`}
							type="button"
							onClick={handleDeleteButtonClick}
						>
							{isDeleteConfirming ? "I am sure" : "Delete all data"}
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}
