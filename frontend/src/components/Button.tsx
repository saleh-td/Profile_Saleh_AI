import Link from "next/link";

import styles from "./button.module.css";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  /** Occupe toute la largeur disponible (colonnes d'actions). */
  block?: boolean;
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

type LinkProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & {
    href: string;
  };

function classesFor({ variant = "primary", size = "md", block, className }: CommonProps) {
  return [
    styles.base,
    styles[variant],
    size === "sm" ? styles.sm : null,
    block ? styles.block : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Bouton d'action. Utiliser pour tout ce qui déclenche quelque chose. */
export function Button({ variant, size, block, className, children, ...rest }: ButtonProps) {
  return (
    <button className={classesFor({ variant, size, block, className, children })} {...rest}>
      {children}
    </button>
  );
}

/**
 * Même apparence que Button, mais navigue.
 * Les liens externes (http, mailto) passent par une balise <a> native.
 */
export function ButtonLink({
  href,
  variant,
  size,
  block,
  className,
  children,
  ...rest
}: LinkProps) {
  const classes = classesFor({ variant, size, block, className, children });
  const isExternal = /^(https?:|mailto:|tel:)/.test(href);

  if (isExternal) {
    return (
      <a className={classes} href={href} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link className={classes} href={href} {...rest}>
      {children}
    </Link>
  );
}
