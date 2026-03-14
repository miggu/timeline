import { ThemeSwitch } from "./ThemeSwitch";

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
					<label className="settings__label" htmlFor="dark-mode-switch">
						Dark mode
					</label>
					<ThemeSwitch
						id="dark-mode-switch"
						checked={isDarkMode}
						onChange={setIsDarkMode}
					/>
				</div>
			</div>

			<div className="settings__group">
				<span className="settings__label">Export</span>
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
