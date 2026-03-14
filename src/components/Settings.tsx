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
	return (
		<div className="settings">
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
					className="settings__button settings__button--danger"
					type="button"
					onClick={onDeleteAllData}
				>
					Delete all data
				</button>
			</div>
		</div>
	);
}
