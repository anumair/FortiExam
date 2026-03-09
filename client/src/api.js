const BASE = '/api';

function token() {
  return localStorage.getItem('token') || '';
}

async function request(method, path, body, isForm = false) {
  const headers = { Authorization: `Bearer ${token()}` };
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  me: () => request('GET', '/auth/me'),

  getExams: () => request('GET', '/exams'),
  getExam: (id) => request('GET', `/exams/${id}`),
  createExam: (body) => request('POST', '/exams', body),

  uploadPaper: (id, file) => {
    const fd = new FormData();
    fd.append('paper', file);
    return request('POST', `/exams/${id}/upload-paper`, fd, true);
  },

  uploadRoster: (id, file) => {
    const fd = new FormData();
    fd.append('roster', file);
    return request('POST', `/exams/${id}/upload-roster`, fd, true);
  },

  generatePackages: (id) => request('POST', `/exams/${id}/generate`),
  distribute: (id) => request('POST', `/exams/${id}/distribute`),
  getAuditLogs: (id) => request('GET', `/exams/${id}/audit`),
};
