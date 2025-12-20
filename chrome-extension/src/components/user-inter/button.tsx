import React from "react";
import "./button.css";

interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "prefix"> {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  loading?: boolean;
  variant?: "default" | "outline" | "error" | "warning";
  size?: "default" | "small" | "large" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      prefix,
      suffix,
      loading = false,
      variant = "default",
      size = "default",
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      "btn",
      `btn-${variant}`,
      size !== "default" ? `btn-${size}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span>⏳</span>}
        {prefix && <span>{prefix}</span>}
        {children}
        {suffix && <span>{suffix}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
