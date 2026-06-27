import { ReactNode } from 'react';
import { Sidebar } from '../Sidebar/Sidebar';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
