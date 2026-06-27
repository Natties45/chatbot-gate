'use client';

import { Card } from '../../../../components/ui/Card/Card';
import { Badge } from '../../../../components/ui/Badge/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../components/ui/Table/Table';
import { 
  BarChart2, 
  Users, 
  ShieldAlert, 
  Activity, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';

export default function AdminDashboardPage() {
  const stats = [
    { name: 'Total Cases', value: '1,284', change: '+12% from last week', icon: BarChart2, color: 'var(--primary-color)' },
    { name: 'Active Users', value: '5', change: 'All active now', icon: Users, color: 'var(--info-color, #3b82f6)' },
    { name: 'AI Resolution Rate', value: '94.2%', change: '+1.5% this month', icon: CheckCircle, color: 'rgb(34, 197, 94)' },
    { name: 'Service Health', value: '99.98%', change: 'All systems operational', icon: Activity, color: 'rgb(34, 197, 94)' },
  ];

  const recentCases = [
    { id: 'CASE-4902', type: 'NOC', user: 'noc01', summary: 'SW-01-DCA core switch connectivity issue', status: 'RESOLVED', time: '10 mins ago' },
    { id: 'CASE-4901', type: 'OPERATION', user: 'ops01', summary: 'orders-service connection pool exhaustion', status: 'RESOLVED', time: '1 hour ago' },
    { id: 'CASE-4899', type: 'NOC', user: 'noc02', summary: 'Disk full warning on db-replica-01', status: 'PENDING', time: '2 hours ago' },
    { id: 'CASE-4898', type: 'OPERATION', user: 'ops02', summary: 'Stuck deployment pipeline on frontend app', status: 'FAILED', time: '5 hours ago' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {stats.map((stat, i) => {
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

      {/* Main Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Recent Cases */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Recent Activity Cases</h3>
            <Badge variant="info">Live Feed</Badge>
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
              {recentCases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell style={{ fontWeight: 600 }}>{c.id}</TableCell>
                  <TableCell>
                    <Badge variant={c.type === 'NOC' ? 'default' : 'info'}>
                      {c.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.user}</TableCell>
                  <TableCell>{c.summary}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'RESOLVED' ? 'success' : c.status === 'PENDING' ? 'warning' : 'danger'}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{c.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* System Health Statuses */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Gate Integrations</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '14px' }}>AI Model Service</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Gemini API Integration</span>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '14px' }}>KB Repository Sync</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GitHub actions webhook</span>
              </div>
              <Badge variant="success">Synced</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '14px' }}>Incident Alert Hook</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Outbound API push</span>
              </div>
              <Badge variant="warning">Slow Response</Badge>
            </div>
          </div>
        </Card>

      </div>

    </div>
  );
}
