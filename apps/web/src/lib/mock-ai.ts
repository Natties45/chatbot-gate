export const mockNocAnalysis = {
  category: 'Network Outage - Core Switch',
  confidence: 95,
  summary: 'The customer reported a total loss of connectivity in the Data Center A region. Symptoms match a known core switch failure on SW-01-DCA.',
  sources: ['KB-1024', 'Incident-Log-Recent'],
  responseTemplate: `Dear Customer,

We have received your report regarding the loss of connectivity in Data Center A. 
Our automated analysis indicates this is related to a core switch event currently under investigation by our engineering team (Ref: INC-4091).

We expect to resolve this within the next 45 minutes. We will keep you updated.

Best regards,
NOC Team`
};

export const mockOperationAnalysis = {
  issueDetected: 'Database Connection Pool Exhaustion',
  rootCause: 'High number of long-running transactions holding connections in the `orders` service.',
  recommendedSteps: [
    { step: 1, title: 'Check Active Connections', desc: 'Run `SELECT count(*), state FROM pg_stat_activity GROUP BY state;` to inspect pool utilization.' },
    { step: 2, title: 'Kill Long Running Queries', desc: 'Kill transactions running longer than 5 minutes using `SELECT pg_cancel_backend(pid);`.' },
    { step: 3, title: 'Scale Connection Pool Max Size', desc: 'Update application settings to increase pool size by 20% as a temporary buffer.' },
    { step: 4, title: 'Verify Recovery', desc: 'Monitor connection levels and orders latency for the next 10 minutes.' }
  ],
  logSummary: 'Parsed 421 lines of order-service.log. Found 48 occurrences of "Timeout waiting for connection in pool".'
};

