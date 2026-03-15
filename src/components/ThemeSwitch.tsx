interface ThemeSwitchProps {
	id: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}

const MoonIcon = () => (
	<svg
		viewBox="0 0 24 24"
		className="theme-switch__glyph theme-switch__glyph--filled"
		aria-hidden="true"
	>
		<path d="M19 15.5A7.5 7.5 0 0 1 8.5 5 8 8 0 1 0 19 15.5Z" />
	</svg>
);

const SunIcon = () => (
	<svg
		viewBox="0 0 24 24"
		className="theme-switch__glyph theme-switch__glyph--filled"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="3.5" />
		<rect x="11" y="2.25" width="2" height="4" rx="1" />
		<rect x="11" y="17.75" width="2" height="4" rx="1" />
		<rect x="2.25" y="11" width="4" height="2" rx="1" />
		<rect x="17.75" y="11" width="4" height="2" rx="1" />
		<rect x="4.2" y="4.2" width="2" height="4" rx="1" transform="rotate(-45 5.2 6.2)" />
		<rect x="17.8" y="15.8" width="2" height="4" rx="1" transform="rotate(-45 18.8 17.8)" />
		<rect x="4.2" y="15.8" width="2" height="4" rx="1" transform="rotate(45 5.2 17.8)" />
		<rect x="17.8" y="4.2" width="2" height="4" rx="1" transform="rotate(45 18.8 6.2)" />
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
