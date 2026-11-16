import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Icon, type IconName } from "./icons";
import styles from "./controls.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dangerGhost";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "btn-p",
  secondary: "btn-s",
  ghost: "btn-g",
  danger: "btn-d",
  dangerGhost: "btn-hapus",
};

export function buttonClassName({
  variant = "secondary",
  size = "md",
  full = false,
  className,
}: {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
} = {}) {
  return [
    "btn",
    variantClass[variant],
    size === "sm" ? "btn-sm" : "",
    size === "lg" ? "btn-lg" : "",
    full ? styles.full : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconAfter?: IconName;
  full?: boolean;
  type?: "button" | "submit" | "reset";
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconAfter,
  full = false,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, full, className })}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} /> : null}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconAfter?: IconName;
  full?: boolean;
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
  target?: string;
  rel?: string;
};

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  icon,
  iconAfter,
  full = false,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={buttonClassName({ variant, size, full, className })}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} /> : null}
    </Link>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  size?: "sm" | "lg";
  danger?: boolean;
};

export function IconButton({
  icon,
  label,
  size = "sm",
  danger = false,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={[
        styles.iconButton,
        size === "lg" ? styles.iconButtonLg : "",
        danger ? styles.iconButtonDanger : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={size === "lg" ? 20 : 18} />
    </button>
  );
}

type FieldProps = {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={`f ${styles.field} ${className ?? ""}`}>
      {label ? <label htmlFor={htmlFor}>{label}</label> : null}
      {children}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  mono?: boolean;
  numeric?: boolean;
};

export function Input({
  mono = false,
  numeric = false,
  className,
  ...rest
}: InputProps) {
  return (
    <input
      className={[
        "in",
        mono ? styles.mono : "",
        numeric ? styles.num : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  mono?: boolean;
};

export function Select({ mono = false, className, ...rest }: SelectProps) {
  return (
    <select
      className={["in", mono ? styles.mono : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...rest }: TextareaProps) {
  return <textarea className={["in", className ?? ""].join(" ")} {...rest} />;
}

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapClassName?: string;
};

export function SearchInput({
  wrapClassName,
  className,
  placeholder,
  ...rest
}: SearchInputProps) {
  return (
    <div className={`search ${styles.searchWrap} ${wrapClassName ?? ""}`}>
      <Icon name="search" />
      <input
        type="search"
        className={["in", className ?? ""].filter(Boolean).join(" ")}
        aria-label={placeholder}
        placeholder={placeholder}
        {...rest}
      />
    </div>
  );
}
