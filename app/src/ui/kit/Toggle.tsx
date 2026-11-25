import { useId, type ReactNode } from "react";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

/** An on/off setting with a visible label: a switch, so it reads as "on" or "off", not "checked". */
export function Toggle({ checked, onChange, children }: Props) {
  const id = useId();
  return (
    <div className="toggle">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-knob" aria-hidden="true" />
      </button>
      <span id={id} onClick={() => onChange(!checked)}>
        {children}
      </span>
    </div>
  );
}
