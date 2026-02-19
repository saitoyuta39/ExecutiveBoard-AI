const API_BASE_URL = '/backend';

export async function getProfiles() {
  const res = await fetch(`${API_BASE_URL}/profiles`);
  return res.json();
}

export async function chat(profileId: string, messages: { role: string; content: string }[]) {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, messages }),
  });
  return res.json();
}

export async function startDiscussion(topic: string, profileIdA: string, profileIdB: string, history: any[] = []) {
  const res = await fetch(`${API_BASE_URL}/discussion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, profile_id_a: profileIdA, profile_id_b: profileIdB, history }),
  });
  return res.json();
}

export async function summarize(topic: string, history: any[]) {
  const res = await fetch(`${API_BASE_URL}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, history }),
  });
  return res.json();
}

