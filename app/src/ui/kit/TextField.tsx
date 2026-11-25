import { useId, type ReactNode } from "react";

export interface ControlProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string;
}

/** Label, control and a line of help that turns into the error message when there is one. */
export function FieldShell({
  label,
  hint,
  problem,
  narrow,
  children,
}: {
  label: string;
  hint?: string;
  problem?: string;
  narrow?: boolean;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={"field" + (narrow ? " narrow" : "")}>
      <label htmlFor={id}>{label}</label>
      {children({ id, "aria-invalid": !!problem, "aria-describedby": `${id}-msg` })}
      <span className={"field-msg" + (problem ? " bad" : "")} id={`${id}-msg`}>
        {problem ?? hint ?? ""}
      </span>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  problem,
  narrow,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  problem?: string;
  narrow?: boolean;
}) {
  return (
    <FieldShell label={label} hint={hint} problem={problem} narrow={narrow}>
      {(p) => (
        <input
          {...p}
          value={value}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="none"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </FieldShell>
  );
}
