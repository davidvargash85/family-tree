/**
 * Shared Button component.
 *
 * Features:
 * - Variants: primary, secondary, ghost
 * - States: default, disabled (grayed), loading
 * - Optional leftIcon / rightIcon (React nodes, e.g. SVG or icon component)
 * - Sizes: sm, md, lg
 *
 * @example
 * <Button variant="primary" type="submit">Save</Button>
 * <Button variant="secondary" leftIcon={<Icon />} onClick={handleClick}>With icon</Button>
 * <Button disabled>Can't click</Button>
 * <Button loading loadingLabel="Saving…">Submit</Button>
 */

const variantStyles = {
  primary: {
    default: {
      background: "#2563eb",
      color: "#fff",
      border: "none",
    },
    disabled: {
      background: "#94a3b8",
      color: "#e2e8f0",
      cursor: "not-allowed",
    },
  },
  secondary: {
    default: {
      background: "#333",
      color: "#fff",
      border: "none",
    },
    disabled: {
      background: "#94a3b8",
      color: "#e2e8f0",
      cursor: "not-allowed",
    },
  },
  ghost: {
    default: {
      background: "transparent",
      color: "#334155",
      border: "1px solid #cbd5e1",
    },
    disabled: {
      background: "#f1f5f9",
      color: "#94a3b8",
      borderColor: "#e2e8f0",
      cursor: "not-allowed",
    },
  },
};

const sizeStyles = {
  sm: { padding: "0.35rem 0.65rem", fontSize: "0.8125rem" },
  md: { padding: "0.5rem 1rem", fontSize: "0.9375rem" },
  lg: { padding: "0.625rem 1.25rem", fontSize: "1rem" },
};

const baseStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  borderRadius: "4px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  lineHeight: 1.25,
};

export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  loadingLabel = "Loading…",
  leftIcon,
  rightIcon,
  style = {},
  ...rest
}) {
  const isDisabled = disabled || loading;
  const variantConfig = variantStyles[variant] ?? variantStyles.primary;
  const stateStyles = isDisabled ? variantConfig.disabled : variantConfig.default;
  const sizeStyle = sizeStyles[size] ?? sizeStyles.md;

  return (
    <button
      type={type}
      disabled={isDisabled}
      style={{
        ...baseStyle,
        ...sizeStyle,
        ...stateStyles,
        ...style,
      }}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        loadingLabel
      ) : (
        <>
          {leftIcon ? <span style={{ display: "inline-flex" }}>{leftIcon}</span> : null}
          {children}
          {rightIcon ? <span style={{ display: "inline-flex" }}>{rightIcon}</span> : null}
        </>
      )}
    </button>
  );
}
