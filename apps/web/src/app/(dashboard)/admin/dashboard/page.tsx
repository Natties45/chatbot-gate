'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../../../components/ui/Card/Card';
import { Badge } from '../../../../components/ui/Badge/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../components/ui/Table/Table';
import {
  BarChart2,
  Users,
  Database,
  Activity,
  AlertTriangle
} from 'lucide-react';

type DashboardData = {
  stats: {
    totalCases: number;
    openCases: number;
    pendingCases: number;
    activeUsers: number;
    knowledgeEntries: number;
    aiConfigured: boolean;
  };
  integrations: {
    ai: string;
    knowledgeBase: string;
    outboundHook: string;
  };
  recentCases: Array<{
    id: string;
    type: string;
    user: string;
    summary: string;
    status: string;
    created: string;
  }>;
};

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    }
    loadDashboard();
  }, []);

  const stats = data ? [
    { name: 'Total Cases', value: data.stats.totalCases.toString(), change: `${data.stats.openCases} open, ${data.stats.pendingCases} pending`, icon: BarChart2, color: 'var(--primary-color)' },
    { name: 'Active Users', value: data.stats.activeUsers.toString(), change: 'Seeded production accounts', icon: Users, color: 'var(--info-color, #3b82f6)' },
    { name: 'Knowledge Entries', value: data.stats.knowledgeEntries.toString(), change: 'Mounted KB entries loaded', icon: Database, color: 'rgb(34, 197, 94)' },
    { name: 'AI Provider', value: data.stats.aiConfigured ? 'Ready' : 'Missing', change: data.stats.aiConfigured ? 'OPENCODE_API_KEY configured' : 'OPENCODE_API_KEY required', icon: Activity, color: data.stats.aiConfigured ? 'rgb(34, 197, 94)' : 'rgb(245, 158, 11)' },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {loading ? (
          <Card>Loading dashboard...</Card>
        ) : stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>{stat.name}</span>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', color: stat.color }}>
                  <Icon size={20} />
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>{stat.value}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stat.change}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Recent Activity Cases</h3>
              <Badge variant="info">Live Data</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentCases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell style={{ fontWeight: 600 }}>{c.id.slice(0, 8)}</TableCell>
                    <TableCell><Badge variant={c.type === 'NOC' ? 'default' : 'info'}>{c.type}</Badge></TableCell>
                    <TableCell>{c.user}</TableCell>
                    <TableCell>{c.summary}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'RESOLVED' ? 'success' : c.status === 'PENDING' ? 'warning' : c.status === 'FAILED' ? 'danger' : 'default'}>{c.status}</Badge>
                    </TableCell>
                    <TableCell style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{relativeTime(c.created)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Gate Integrations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <IntegrationRow title="AI Model Service" detail="Opencode-compatible provider" status={data.integrations.ai} />
              <IntegrationRow title="KB Repository Sync" detail="Mounted production knowledge base" status={data.integrations.knowledgeBase} />
              <IntegrationRow title="Incident Alert Hook" detail="Outbound API push endpoint" status={data.integrations.outboundHook} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function IntegrationRow({ title, detail, status }: { title: string; detail: string; status: string }) {
  const variant = status === 'configured' || status === 'synced' ? 'success' : status === 'missing' ? 'warning' : 'default';

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
      <div>
        <strong style={{ display: 'block', fontSize: '14px' }}>{title}</strong>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{detail}</span>
      </div>
      <Badge variant={variant}>{status.replace('_', ' ')}</Badge>
      {status === 'missing' && <AlertTriangle size={16} style={{ color: 'rgb(245, 158, 11)' }} />}
    </div>
  );
}
