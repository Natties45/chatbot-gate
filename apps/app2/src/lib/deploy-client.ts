const DEPLOY_AGENT_URL = process.env.DEPLOY_AGENT_URL || 'http://deploy-agent:4105';

export async function getDeployStatus() {
  const res = await fetch(`${DEPLOY_AGENT_URL}/status`, { cache: 'no-store' });
  return res.json();
}

export async function getDeployHistory() {
  const res = await fetch(`${DEPLOY_AGENT_URL}/history`, { cache: 'no-store' });
  return res.json();
}

export async function deployApp2(tag: string) {
  const res = await fetch(`${DEPLOY_AGENT_URL}/deploy/app2/${encodeURIComponent(tag)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Deploy failed');
  return data;
}
