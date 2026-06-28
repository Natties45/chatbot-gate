import { HTMLAttributes } from 'react';
import styles from './Badge.module.css';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, variant = 'default', className = '', ...props }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[variant]} ${className}`} {...props}>{children}</span>;
}
