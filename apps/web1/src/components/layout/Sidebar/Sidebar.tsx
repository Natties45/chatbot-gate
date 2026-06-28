'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Shield, Settings } from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onActiveClick?: () => void;
}

export function Sidebar({ onActiveClick }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const menuItems = [
    { name: 'NOC Chat', path: '/noc', icon: Shield },
    { name: 'Operation Chat', path: '/operation', icon: Settings },
  ];

  function handleClick(e: React.MouseEvent, itemPath: string, isActive: boolean) {
    if (isActive && onActiveClick) {
      e.preventDefault();
      onActiveClick();
    }
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>GATE</div>
      </div>
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={(e) => handleClick(e, item.path, isActive)}
            >
              <Icon size={14} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className={styles.footer}>
        <div className={styles.themeToggle} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <span>&#9790;</span>
          <span>Dark / Light</span>
        </div>
      </div>
    </aside>
  );
}
