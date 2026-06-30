'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Button } from '@/components/ui/Button/Button';
import { Eye, Download, Search, RefreshCw, ChevronDown, Shield, Settings } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  kind?: string;
  createdAt: string;
}

interface CaseRecord {
  id: string;
  caseId: string;
  userId: string;
  username: string;
  userRole: string;
  page: string;
  status: string;
  preview: string | null;
  summary: string | null;
  detail: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messages?: ChatMessage[];
}

export default function HistoryPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Filters State (default: today's range in Bangkok local time)
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [fromFilter, setFromFilter] = useState(getTodayStr());
  const [toFilter, setToFilter] = useState(getTodayStr());
  const [pageFilter, setPageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [caseIdFilter, setCaseIdFilter] = useState('');

  // Selected Case Detail State (for modal)
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Export progress
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchCases(true);
  }, []);

  const fetchCases = async (reset = true) => {
    setLoading(true);
    try {
      const cursorParam = !reset && nextCursor ? `&cursor=${nextCursor}` : '';
      const url = `/api/cases?from=${fromFilter}&to=${toFilter}&page=${pageFilter}&status=${statusFilter}&caseId=${caseIdFilter}${cursorParam}&limit=20`;

      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) router.push('/login');
        throw new Error('Failed to load cases');
      }

      const data = await res.json();
      if (reset) {
        setCases(data.cases || []);
      } else {
        setCases((prev) => [...prev, ...(data.cases || [])]);
      }
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases(true);
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchCases(false);
    }
  };

  const handleViewCase = async (id: string) => {
    setModalLoading(true);
    setModalOpen(true);
    try {
      const res = await fetch(`/api/cases?id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch case details');
      const data = await res.json();
      setSelectedCase(data);
    } catch (err) {
      console.error(err);
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleExportMarkdown = async () => {
    setExporting(true);
    try {
      const url = `/api/cases/export?from=${fromFilter}&to=${toFilter}&page=${pageFilter}&status=${statusFilter}&caseId=${caseIdFilter}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = 'case-export.md';
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) filename = match[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export markdown report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout title="Case History" headerAction={
      <Button variant="secondary" size="sm" onClick={handleExportMarkdown} disabled={exporting || cases.length === 0}>
        <Download size={16} /> {exporting ? 'Exporting...' : 'Export Markdown'}
      </Button>
    }>
      <div style={styles.container}>
        {/* Filters Panel */}
        <form onSubmit={handleSearch} style={styles.filterCard}>
          <div style={styles.filterGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>From Date</label>
              <input
                type="date"
                value={fromFilter}
                onChange={(e) => setFromFilter(e.target.value)}
                style={styles.input}
              />
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>To Date</label>
              <input
                type="date"
                value={toFilter}
                onChange={(e) => setToFilter(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Module</label>
              <select
                value={pageFilter}
                onChange={(e) => setPageFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Modules</option>
                <option value="NOC">NOC</option>
                <option value="Operation">Operation</option>
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Case ID</label>
              <input
                type="text"
                placeholder="Search ID..."
                value={caseIdFilter}
                onChange={(e) => setCaseIdFilter(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <Button type="submit" variant="primary" style={{ width: '100%' }}>
                <Search size={16} /> Search
              </Button>
            </div>
          </div>
        </form>

        {/* Table Panel */}
        <div style={styles.tableCard}>
          {loading && cases.length === 0 ? (
            <div style={styles.loadingState}>
              <RefreshCw size={24} className="spinner" />
              <span>Loading Case History...</span>
            </div>
          ) : cases.length === 0 ? (
            <div style={styles.emptyState}>No cases found matching the criteria.</div>
          ) : (
            <>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>ID</th>
                    <th style={styles.tableHeader}>User</th>
                    <th style={styles.tableHeader}>Role</th>
                    <th style={styles.tableHeader}>Module</th>
                    <th style={styles.tableHeader}>Created</th>
                    <th style={styles.tableHeader}>Updated</th>
                    <th style={styles.tableHeader}>Status</th>
                    <th style={styles.tableHeader}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id} style={styles.tableRow}>
                      <td style={styles.tableCell}><strong>{c.caseId}</strong></td>
                      <td style={styles.tableCell}>{c.username}</td>
                      <td style={styles.tableCell}>
                        <span style={styles.roleBadge}>{c.userRole.toUpperCase()}</span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
                          {c.page === 'NOC' ? <Shield size={12} style={{ color: 'var(--accent-color)' }} /> : <Settings size={12} style={{ color: 'var(--primary-color)' }} />}
                          {c.page}
                        </span>
                      </td>
                      <td style={styles.tableCell}>{new Date(c.createdAt).toLocaleDateString('th-TH')} {new Date(c.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={styles.tableCell}>{new Date(c.updatedAt).toLocaleDateString('th-TH')} {new Date(c.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={styles.tableCell}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                          backgroundColor: c.status === 'closed' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: c.status === 'closed' ? '#4ade80' : '#facc15'
                        }}>
                          {c.status === 'closed' ? 'Closed' : 'Active'}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <Button variant="secondary" size="sm" onClick={() => handleViewCase(c.id)}>
                          <Eye size={12} /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {nextCursor && (
                <div style={styles.loadMoreContainer}>
                  <Button variant="secondary" onClick={handleLoadMore} disabled={loading}>
                    {loading ? 'Loading...' : 'Load More Cases'}
                    {!loading && <ChevronDown size={16} />}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* DETAIL MODAL */}
      {modalOpen && (
        <div className="confirmOverlay" onClick={() => setModalOpen(false)}>
          <div className="confirmDialog" style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>
                Case Details: {selectedCase?.caseId || 'Loading...'}
              </h3>
              <button onClick={() => setModalOpen(false)} style={styles.closeBtn}>✕</button>
            </div>

            {modalLoading || !selectedCase ? (
              <div style={styles.modalLoading}>
                <RefreshCw size={24} className="spinner" />
                <span>Fetching chat records...</span>
              </div>
            ) : (
              <div style={styles.modalBody}>
                {/* Meta details */}
                <div style={styles.modalMetaGrid}>
                  <div><strong>Operator:</strong> {selectedCase.username} ({selectedCase.userRole.toUpperCase()})</div>
                  <div><strong>Created:</strong> {new Date(selectedCase.createdAt).toLocaleString('th-TH')}</div>
                  <div><strong>Module:</strong> {selectedCase.page}</div>
                  <div><strong>Status:</strong> {selectedCase.status === 'closed' ? 'Closed' : 'In Progress'}</div>
                </div>

                {/* Summary Section (For Closed Cases) */}
                {selectedCase.status === 'closed' && (
                  <div style={styles.summarySection}>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '8px' }}>Closure Report</h4>
                    <p style={{ fontSize: '13px', marginBottom: '8px' }}>
                      <strong>Summary:</strong> {selectedCase.summary || 'No summary'}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                      <strong>Resolution Details:</strong> {selectedCase.detail || 'No details'}
                    </p>
                  </div>
                )}

                {/* Messages Chat Transcript */}
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>Chat Transcript</h4>
                <div style={styles.modalChatLog}>
                  {selectedCase.messages && selectedCase.messages.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                      No messages logged for this case.
                    </div>
                  )}
                  {selectedCase.messages?.map((m) => {
                    const timestamp = new Date(m.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={m.id} style={{
                        display: 'flex', flexDirection: 'column',
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        marginBottom: '12px'
                      }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '2px' }}>
                          {m.role === 'user' ? 'Operator' : 'AI Assistant'} - {timestamp}
                        </span>
                        {m.kind === 'draft' ? (
                          <div className="draftCard" style={{ margin: '0' }}>{m.content}</div>
                        ) : (
                          <div className={m.role === 'user' ? 'userBubble' : 'assistantBubble'} style={{ alignSelf: 'stretch', maxWidth: '100%' }}>
                            {m.content}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    height: '100%',
    minHeight: '0',
  },
  filterCard: {
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px 20px',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '12px',
  },
  tableCard: {
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '24px',
    flex: 1,
    overflowY: 'auto' as const,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    color: 'var(--text-muted)',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontSize: '13px',
    outline: 'none',
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontSize: '13px',
    outline: 'none',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '48px',
    color: 'var(--text-muted)',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px',
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  },
  tableHeaderRow: {
    borderBottom: '2px solid var(--border-color)',
  },
  tableHeader: {
    textAlign: 'left' as const,
    padding: '12px 8px',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
  },
  tableRow: {
    borderBottom: '1px solid var(--border-color)',
    transition: 'background-color 0.15s',
  },
  tableCell: {
    padding: '12px 8px',
    verticalAlign: 'middle',
  },
  roleBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-color)',
    border: '1px solid var(--border-color)',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  loadMoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
  },
  modalContent: {
    width: '100%',
    maxWidth: '650px',
    textAlign: 'left' as const,
    padding: '24px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  },
  closeBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-color)',
    fontSize: '16px',
    cursor: 'pointer',
  },
  modalLoading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '48px',
    color: 'var(--text-muted)',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    overflowY: 'auto' as const,
    flex: 1,
    paddingRight: '4px',
  },
  modalMetaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    fontSize: '12px',
    backgroundColor: 'var(--bg-color)',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  summarySection: {
    backgroundColor: 'rgba(22, 163, 74, 0.05)',
    border: '1px solid rgba(22, 163, 74, 0.2)',
    borderRadius: '8px',
    padding: '14px',
  },
  modalChatLog: {
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '14px',
    backgroundColor: 'var(--bg-color)',
    minHeight: '200px',
    maxHeight: '350px',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
};
