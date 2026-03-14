import { ThemeSwitch } from "./ThemeSwitch";

interface SettingsProps {
	yearsToDisplay: number;
	setYearsToDisplay: (years: number) => void;
	isDarkMode: boolean;
	setIsDarkMode: (isDarkMode: boolean) => void;
	onExportTimeline: () => void;
}

export function Settings({
	yearsToDisplay,
	setYearsToDisplay,
	isDarkMode,
	setIsDarkMode,
	onExportTimeline,
}: SettingsProps) {
	return (
		<div className="settings">
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

			<div className="settings__group">
				<span className="settings__label">Export</span>
				<button
					className="settings__button"
					type="button"
					onClick={onExportTimeline}
				>
					Download JSON
				</button>
			</div>
		</div>
	);
}
