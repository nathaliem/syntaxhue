import type { ComponentProps } from "react";
import { cx } from "./cx";

export interface ButtonProps extends ComponentProps<"button"> {
  /** primary = the one next step; secondary = default; ghost = no border until hovered. */
  variant?: "primary" | "secondary" | "ghost";
  /** md is 36 px tall, sm is 30 px. */
  size?: "md" | "sm";
  /** Makes it a toggle button: sets `aria-pressed` and the pressed look. */
  pressed?: boolean;
}

/** The app's button. Label it with what happens ("Copy snippet", not "OK"). */
export function Button({
  variant = "secondary",
  size = "md",
  pressed,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cx("btn", variant !== "secondary" && variant, size === "sm" && "sm", pressed && "on", className)}
      {...rest}
    />
  );
}
