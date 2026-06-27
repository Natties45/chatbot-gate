import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children, className = '', ...props }: BadgeProps) {
  return (
    <span 
      className={`${styles.badge} ${styles[variant]} ${className}`} 
      {...props}
    >
      {children}
    </span>
  );
}
