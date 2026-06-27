'use client';

import { useState } from 'react';
import { Card } from '../../../../components/ui/Card/Card';
import { Badge } from '../../../../components/ui/Badge/Badge';
import { Button } from '../../../../components/ui/Button/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../components/ui/Table/Table';
import { Search, Filter, RefreshCw, Eye } from 'lucide-react';

const mockCaseLogs = [
  { id: 'CASE-4902', type: 'NOC', user: 'noc01', summary: 'SW-01-DCA core switch connectivity issue', status: 'RESOLVED', details: 'Core switch SW-01-DCA recovered after hardware replacement.', created: '2026-06-26 23:45' },
  { id: 'CASE-4901', type: 'OPERATION', user: 'ops01', summary: 'orders-service connection pool exhaustion', status: 'RESOLVED', details: 'Killed 8 queries running for over 15 minutes. Connection pool scaled.', created: '2026-06-26 22:30' },
  { id: 'CASE-4899', type: 'NOC', user: 'noc02', summary: 'Disk full warning on db-replica-01', status: 'PENDING', details: 'Disk space at 92%. Awaiting approval for logs cleanup script.', created: '2026-06-26 21:10' },
  { id: 'CASE-4898', type: 'OPERATION', user: 'ops02', summary: 'Stuck deployment pipeline on frontend app', status: 'FAILED', details: 'Deployment failed with ENOSPC on compile stage. Needs runner check.', created: '2026-06-26 18:15' },
  { id: 'CASE-4897', type: 'NOC', user: 'noc01', summary: 'AP-05 Wi-Fi coverage drop in lobby', status: 'RESOLVED', details: 'Access Point AP-05 rebooted remotely. Signals returned to normal.', created: '2026-06-26 15:40' },
];

export default function AdminCasesPage() {
  const [cases, setCases] = useState(mockCaseLogs);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedCase, setSelectedCase] = useState<any>(null);

  // Filter cases based on filters
  const filteredCases = cases.filter(c => {
    const matchesSearch = c.id.toLowerCase().includes(search.toLowerCase()) || 
                          c.summary.toLowerCase().includes(search.toLowerCase()) ||
                          c.user.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || c.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Activity & Case Logs</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>Review historical cases resolved by the Chatbot Gate agents</p>
      </div>

      {/* Filter Toolbar */}
      <Card style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            placeholder="Search by ID, summary, user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '14px' }}>Type:</span>
          </div>
          <select
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="NOC">NOC</option>
            <option value="OPERATION">Operation</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px' }}>Status:</span>
          <select
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="RESOLVED">Resolved</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </Card>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedCase ? '1.5fr 1fr' : '1fr', gap: '24px', transition: 'all 0.3s' }}>
        
        {/* Cases Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map(c => (
                <TableRow key={c.id} style={{ cursor: 'pointer', backgroundColor: selectedCase?.id === c.id ? 'rgba(var(--primary-color-rgb), 0.05)' : '' }} onClick={() => setSelectedCase(c)}>
                  <TableCell style={{ fontWeight: 600 }}>{c.id}</TableCell>
                  <TableCell><Badge variant={c.type === 'NOC' ? 'default' : 'info'}>{c.type}</Badge></TableCell>
                  <TableCell>{c.user}</TableCell>
                  <TableCell>{c.summary}</TableCell>
                  <TableCell style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{c.created}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'RESOLVED' ? 'success' : c.status === 'PENDING' ? 'warning' : 'danger'}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell style={{ textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" style={{ padding: '6px' }} onClick={(e) => { e.stopPropagation(); setSelectedCase(c); }}>
                      <Eye size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No cases match the filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Case Detail Card */}
        {selectedCase && (
          <Card style={{ height: 'fit-content', position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Case Details</h3>
              <Button variant="ghost" size="sm" style={{ padding: '4px' }} onClick={() => setSelectedCase(null)}>Close</Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', display: 'block' }}>Case ID / Type</span>
                <strong>{selectedCase.id} ({selectedCase.type})</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', display: 'block' }}>Summary</span>
                <span style={{ fontWeight: 500 }}>{selectedCase.summary}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', display: 'block' }}>Detailed Logs / Resolution</span>
                <p style={{ backgroundColor: 'var(--bg-color)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: '4px 0 0 0' }}>
                  {selectedCase.details}
                </p>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', display: 'block' }}>Operator</span>
                <span>{selectedCase.user}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', display: 'block' }}>Created Time</span>
                <span>{selectedCase.created}</span>
              </div>
            </div>
          </Card>
        )}

      </div>

    </div>
  );
}
