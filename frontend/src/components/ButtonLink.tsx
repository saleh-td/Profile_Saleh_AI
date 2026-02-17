import Link from "next/link";
import styles from "./buttonLink.module.css";

type Props = {
  href: string;
  children: React.ReactNode;
  variant: "primary" | "secondary";
};

export function ButtonLink({ href, children, variant }: Props) {
  const className = variant === "primary" ? styles.primary : styles.secondary;
  return (
    <Link href={href} className={`${styles.base} ${className}`}>
      {children}
    </Link>
  );
}
