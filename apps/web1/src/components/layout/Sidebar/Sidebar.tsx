'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { MessageSquare, Moon, Sun } from 'lucide-react';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const menuItems = [
    { name: 'NOC Chat', path: '/noc', icon: MessageSquare },
    { name: 'Operation Chat', path: '/operation', icon: MessageSquare },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>CG</div>
          <span className={styles.logoText}>Chatbot Gate</span>
        </div>
      </div>
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path} className={`${styles.navItem} ${isActive ? styles.active : ''}`}>
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className={styles.footer}>
        <div className={styles.themeToggle} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </div>
      </div>
    </aside>
  );
}
