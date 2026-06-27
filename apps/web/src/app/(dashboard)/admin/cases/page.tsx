'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../../../components/ui/Card/Card';
import { Badge } from '../../../../components/ui/Badge/Badge';
import { Button } from '../../../../components/ui/Button/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../components/ui/Table/Table';
import { Search, Filter, RefreshCw, Eye } from 'lucide-react';

type CaseItem = {
  id: string;
  type: string;
  user: string;
  summary: string;
  status: string;
  details: string;
  category: string;
  confidence?: number;
  created: string;
  messages: Array<{ id: string; role: string; content: string; createdAt: string }>;
};

export default function AdminCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadCases() {
    setLoading(true);
    const params = new URLSearchParams({ search, type: filterType, status: filterStatus });
    const res = await fetch(`/api/admin/cases?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setCases(data.cases);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCases();
  }, [filterType, filterStatus]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Activity & Case Logs</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>Review historical cases resolved by the Chatbot Gate agents</p>
      </div>

      <Card style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input type="text" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} placeholder="Search by ID, summary, user..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') loadCases(); }} />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="ALL">All Types</option>
            <option value="NOC">NOC</option>
            <option value="OPERATION">Operation</option>
          </select>
          <select style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
            <option value="FAILED">Failed</option>
          </select>
          <Button variant="secondary" onClick={loadCases}><RefreshCw size={16} /></Button>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: selectedCase ? '1.5fr 1fr' : '1fr', gap: '24px', transition: 'all 0.3s' }}>
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
              {loading ? (
                <TableRow><TableCell colSpan={7}>Loading cases...</TableCell></TableRow>
              ) : cases.map(c => (
                <TableRow key={c.id} style={{ cursor: 'pointer', backgroundColor: selectedCase?.id === c.id ? 'rgba(var(--primary-color-rgb), 0.05)' : '' }} onClick={() => setSelectedCase(c)}>
                  <TableCell style={{ fontWeight: 600 }}>{c.id.slice(0, 8)}</TableCell>
                  <TableCell><Badge variant={c.type === 'NOC' ? 'default' : 'info'}>{c.type}</Badge></TableCell>
                  <TableCell>{c.user}</TableCell>
                  <TableCell>{c.summary}</TableCell>
                  <TableCell style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(c.created).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={c.status === 'RESOLVED' ? 'success' : c.status === 'PENDING' ? 'warning' : c.status === 'FAILED' ? 'danger' : 'default'}>{c.status}</Badge></TableCell>
                  <TableCell style={{ textAlign: 'right' }}><Button variant="ghost" size="sm" style={{ padding: '6px' }} onClick={(e) => { e.stopPropagation(); setSelectedCase(c); }}><Eye size={16} /></Button></TableCell>
                </TableRow>
              ))}
              {!loading && cases.length === 0 && <TableRow><TableCell colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No cases match the filters</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>

        {selectedCase && (
          <Card style={{ height: 'fit-content', position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Case Details</h3>
              <Button variant="ghost" size="sm" style={{ padding: '4px' }} onClick={() => setSelectedCase(null)}>Close</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <strong>{selectedCase.id} ({selectedCase.type})</strong>
              <span>{selectedCase.category} {selectedCase.confidence ? `- ${selectedCase.confidence}%` : ''}</span>
              <span style={{ fontWeight: 500 }}>{selectedCase.summary}</span>
              <p style={{ backgroundColor: 'var(--bg-color)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>{selectedCase.details}</p>
              <span>Operator: {selectedCase.user}</span>
              <span>Created: {new Date(selectedCase.created).toLocaleString()}</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
