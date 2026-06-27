import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Settings, 
  BarChart2, 
  LogOut, 
  Moon, 
  Sun,
  ShieldAlert,
  Database,
  Users
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface UserProfile {
  username: string;
  role: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Failed to fetch user', err);
      }
    }
    fetchUser();
  }, [router]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  const menuItems = [
    { name: 'แชทช่วยตอบ (NOC Chat)', path: '/noc/chat', icon: MessageSquare, role: ['NOC', 'ADMIN'] },
    { name: 'ห้องแชทวิเคราะห์ (Operation)', path: '/operation/chat', icon: MessageSquare, role: ['OPERATION', 'ADMIN'] },
    { name: 'แดชบอร์ด (Dashboard)', path: '/admin/dashboard', icon: BarChart2, role: ['ADMIN'] },
    { name: 'จัดการผู้ใช้งาน (Accounts)', path: '/admin/accounts', icon: Users, role: ['ADMIN'] },
    { name: 'ซิงก์ฐานความรู้ (Sync KB)', path: '/admin/sync', icon: Database, role: ['ADMIN'] },
    { name: 'ประวัติการปิดเคส (Case Logs)', path: '/admin/cases', icon: ShieldAlert, role: ['ADMIN', 'NOC', 'OPERATION'] },
    { name: 'ตั้งค่าระบบ (Settings)', path: '/admin/settings', icon: Settings, role: ['ADMIN'] },
  ];

  const currentRole = user?.role || '';
  const filteredMenu = menuItems.filter(item => item.role.includes(currentRole));

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>CG</div>
          <span className={styles.logoText}>Chatbot Gate</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {filteredMenu.map((item) => {
          const isActive = pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <div className={styles.themeToggle} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </div>
        
        {user && (
          <div className={styles.userProfile}>
            <div className={styles.avatar}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.username}>{user.username}</span>
              <span className={styles.roleBadge}>{user.role}</span>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

