interface ThemeSwitchProps {
	id: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}

const MoonIcon = () => (
	<svg viewBox="0 0 24 24" className="theme-switch__glyph" aria-hidden="true">
		<path d="M19 15.5A7.5 7.5 0 0 1 8.5 5 8 8 0 1 0 19 15.5Z" />
	</svg>
);

const SunIcon = () => (
	<svg viewBox="0 0 24 24" className="theme-switch__glyph" aria-hidden="true">
		<circle cx="12" cy="12" r="3.5" />
		<path d="M12 3.5v2.2" />
		<path d="M12 18.3v2.2" />
		<path d="M3.5 12h2.2" />
		<path d="M18.3 12h2.2" />
		<path d="M6 6l1.6 1.6" />
		<path d="M16.4 16.4 18 18" />
		<path d="M6 18l1.6-1.6" />
		<path d="M16.4 7.6 18 6" />
	</svg>
);

export function ThemeSwitch({
	id,
	checked,
	onChange,
}: ThemeSwitchProps) {
	return (
		<button
			id={id}
			type="button"
			className={`theme-switch${checked ? " theme-switch--checked" : ""}`}
			role="switch"
			aria-checked={checked}
			aria-label={`Turn ${checked ? "off" : "on"} dark mode`}
			onClick={() => onChange(!checked)}
		>
			<span className="theme-switch__track">
				<span className="theme-switch__sun">
					<SunIcon />
				</span>
				<span className="theme-switch__moon">
					<MoonIcon />
				</span>
				<span className="theme-switch__thumb" />
			</span>
		</button>
	);
}
