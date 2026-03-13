import React from "react";

interface ThemeSwitchProps {
	id: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({
	id,
	checked,
	onChange,
}) => {
	return (
		<button
			id={id}
			type="button"
			className={`theme-switch${checked ? " is-checked" : ""}`}
			role="switch"
			aria-checked={checked}
			aria-label={`Turn ${checked ? "off" : "on"} dark mode`}
			onClick={() => onChange(!checked)}
		>
			<span className="theme-switch-track">
				<span className="theme-switch-thumb" />
			</span>
		</button>
	);
};
