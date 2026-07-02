'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Bot, History, Settings, Shield, Wrench } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Button } from '@/components/ui/Button/Button';
import { apiUrl } from '@/lib/api';

interface Profile {
  username: string;
  role: string;
}

interface CaseItem {
  id: string;
  caseId: string;
  page: string;
  preview: string | null;
  updatedAt: string;
}

const roleCopy: Record<string, { intro: string; actions: Array<{ label: string; href: string; variant: 'primary' | 'secondary' }> }> = {
  admin: {
    intro: 'ภาพรวมระบบ งานค้าง และ action หลักสำหรับดูแล NOC, Operation, KB และ Deploy',
    actions: [
      { label: 'Open Settings', href: '/settings', variant: 'primary' },
      { label: 'NOC Chat', href: '/noc', variant: 'secondary' },
      { label: 'Operation Chat', href: '/operation', variant: 'secondary' },
      { label: 'Case History', href: '/history', variant: 'secondary' },
    ],
  },
  noc: {
    intro: 'โฟกัสเคสลูกค้า เคสที่ต้องถามข้อมูลเพิ่ม และ draft ที่พร้อมใช้งาน',
    actions: [
      { label: 'New NOC Case', href: '/noc', variant: 'primary' },
      { label: 'Case History', href: '/history', variant: 'secondary' },
    ],
  },
  operation: {
    intro: 'ดูเคสที่ต้องวิเคราะห์ งาน research และ diagnosis ที่ต้องสรุปผล',
    actions: [
      { label: 'New Operation Case', href: '/operation', variant: 'primary' },
      { label: 'Case History', href: '/history', variant: 'secondary' },
    ],
  },
};

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const profileRes = await fetch(apiUrl('/api/auth/profile'));
        if (!profileRes.ok) {
          router.push('/login');
          return;
        }

        const currentProfile = await profileRes.json();
        setProfile(currentProfile);

        const casesRes = await fetch(apiUrl('/api/cases?status=in_progress&limit=5'));
        if (casesRes.ok) {
          const data = await casesRes.json();
          setCases(data.cases || []);
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  const copy = roleCopy[profile?.role || 'noc'] || roleCopy.noc;

  return (
    <AppLayout title="Dashboard">
      <div className="dashboardPage" style={styles.page}>
        <section style={styles.hero}>
          <div>
            <div style={styles.eyebrow}>Operations Console</div>
            <h2 style={styles.heroTitle}>{loading ? 'กำลังโหลดข้อมูล' : `สวัสดี ${profile?.username || 'ผู้ใช้บริการ'}`}</h2>
            <p style={styles.heroText}>{copy.intro}</p>
          </div>
          <div style={styles.heroBadges}>
            <span style={styles.badge}><Activity size={13} /> app2 ready</span>
            <span style={styles.badge}><Bot size={13} /> Groq + Ollama</span>
          </div>
        </section>

        <section className="dashboardMetricGrid" style={styles.metricGrid}>
          <Metric icon={<Shield size={18} />} label="Open Cases" value={String(cases.length)} help="เคสที่ยังดำเนินการอยู่" />
          <Metric icon={<Wrench size={18} />} label="Role" value={profile?.role || '-'} help="เมนูแสดงตามสิทธิ์" />
          <Metric icon={<History size={18} />} label="History" value="Ready" help="ค้นหาและ export case ได้" />
          <Metric icon={<Settings size={18} />} label="Admin" value={profile?.role === 'admin' ? 'Enabled' : 'Limited'} help="settings เฉพาะ admin" />
        </section>

        <section className="dashboardContentGrid" style={styles.contentGrid}>
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Work Queue</h3>
            {cases.length === 0 ? (
              <p style={styles.muted}>ยังไม่มีเคส in progress</p>
            ) : (
              <div style={styles.queueList}>
                {cases.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="dashboardQueueItem"
                    style={styles.queueItem}
                    onClick={() => router.push(item.page === 'Operation' ? `/operation?session=${item.caseId}` : '/noc')}
                  >
                    <strong>{item.caseId}</strong>
                    <span>{item.page}</span>
                    <small>{item.preview || 'ไม่มี preview'}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Quick Actions</h3>
            <div style={styles.actionGrid}>
              {copy.actions.map((action) => (
                <Button key={action.href + action.label} variant={action.variant} onClick={() => router.push(action.href)}>
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function Metric({ icon, label, value, help }: { icon: ReactNode; label: string; value: string; help: string }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricTop}>{icon}<span>{label}</span></div>
      <div style={styles.metricValue}>{value}</div>
      <p style={styles.muted}>{help}</p>
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column' as const, gap: '14px', minHeight: 0, overflow: 'auto' as const },
  hero: {
    border: '1px solid var(--border-color)',
    borderRadius: '18px',
    padding: '22px',
    background: 'linear-gradient(135deg, rgba(74,222,128,0.12), rgba(96,165,250,0.08))',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  eyebrow: { color: 'var(--accent-color)', fontSize: '12px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: '8px' },
  heroTitle: { fontSize: '26px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.03em' },
  heroText: { color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, maxWidth: '720px' },
  heroBadges: { display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' as const },
  badge: { display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-color)', borderRadius: '999px', padding: '6px 10px', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--panel-bg)' },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' },
  metricCard: { border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', background: 'var(--panel-bg)' },
  metricTop: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, marginBottom: '10px' },
  metricValue: { fontSize: '24px', fontWeight: 800, marginBottom: '4px' },
  contentGrid: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', minHeight: 0 },
  panel: { border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', background: 'var(--panel-bg)', minWidth: 0 },
  panelTitle: { fontSize: '15px', fontWeight: 800, marginBottom: '12px' },
  muted: { color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 },
  queueList: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  queueItem: { display: 'grid', gridTemplateColumns: '90px 90px 1fr', gap: '10px', alignItems: 'center', width: '100%', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '11px', background: 'var(--bg-color)', color: 'var(--text-color)', textAlign: 'left' as const, cursor: 'pointer' },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' },
};
