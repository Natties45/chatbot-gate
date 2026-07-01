import { ReactNode } from 'react';
import { Sidebar } from '../Sidebar/Sidebar';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  headerAction?: ReactNode;
  onSidebarActiveClick?: () => void;
}

export function AppLayout({ children, title, headerAction, onSidebarActiveClick }: AppLayoutProps) {
  return (
    <div className={styles.layout}>
      <Sidebar onActiveClick={onSidebarActiveClick} />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          {headerAction && <div className={styles.headerAction}>{headerAction}</div>}
        </header>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
