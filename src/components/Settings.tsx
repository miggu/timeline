import { ThemeSwitch } from "./ThemeSwitch";

interface SettingsProps {
	yearsToDisplay: number;
	setYearsToDisplay: (years: number) => void;
	isDarkMode: boolean;
	setIsDarkMode: (isDarkMode: boolean) => void;
}

export function Settings({
	yearsToDisplay,
	setYearsToDisplay,
	isDarkMode,
	setIsDarkMode,
}: SettingsProps) {
	return (
		<div className="settings">
			<div className="settings__header">
				<svg viewBox="0 0 24 24" className="settings__icon">
					<path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
					<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
				</svg>
				<span>Settings</span>
			</div>

			<div className="settings__group">
				<label className="settings__label" htmlFor="settings-years">
					Years to display
				</label>
				<select
					id="settings-years"
					value={yearsToDisplay}
					onChange={(e) => setYearsToDisplay(Number(e.target.value))}
					className="settings__select"
				>
					<option value={1}>1 Year (Current)</option>
					<option value={3}>3 Years</option>
					<option value={5}>5 Years</option>
					<option value={9}>9 Years (Since 2018)</option>
				</select>
			</div>

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
		</div>
	);
}
