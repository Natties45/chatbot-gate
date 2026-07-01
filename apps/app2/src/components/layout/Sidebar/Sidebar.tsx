'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Shield, Settings, History, Lock } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import styles from './Sidebar.module.css';
import { useEffect, useState } from 'react';

interface SidebarProps {
  onActiveClick?: () => void;
}

export function Sidebar({ onActiveClick }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Fetch profile to render correct menu items
    fetch(apiUrl('/api/auth/profile'))
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not logged in');
      })
      .then((data) => {
        setRole(data.role);
        setUsername(data.username);
      })
      .catch(() => {
        // Safe fallback
      });
  }, []);

  const menuItems = [];

  if (role === 'admin' || role === 'noc') {
    menuItems.push({ name: 'NOC Chat', path: '/noc', icon: Shield });
  }
  if (role === 'admin' || role === 'operation') {
    menuItems.push({ name: 'Operation Chat', path: '/operation', icon: Settings });
  }
  if (role) {
    menuItems.push({ name: 'Case History', path: '/history', icon: History });
  }
  if (role === 'admin') {
    menuItems.push({ name: 'Settings', path: '/settings', icon: Lock });
  }

  function handleClick(e: React.MouseEvent, itemPath: string, isActive: boolean) {
    if (isActive && onActiveClick) {
      e.preventDefault();
      onActiveClick();
    }
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>GATE 2</div>
        {username && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Logged in as: {username}</div>}
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
