const configuredApiUrl = import.meta.env.VITE_AEGIS_API_URL as string | undefined;
export const API_URL = (configuredApiUrl || "http://localhost:8000").replace(/\/$/, "");

let demoSessionToken: string | undefined;

export function setDemoSessionToken(token: string | undefined) {
  demoSessionToken = token;
}

export const apiClient = {
  get: async (path: string, token = demoSessionToken) => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${API_URL}${path}`, { headers });
    if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
    return res.json();
  },
  
  post: async (path: string, body: any, token = demoSessionToken) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`POST ${path} failed (${res.status})`);
    return res.json();
  },

  patch: async (path: string, body: any, token = demoSessionToken) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`PATCH ${path} failed (${res.status})`);
    return res.json();
  },

  put: async (path: string, body: any, token = demoSessionToken) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`PUT ${path} failed (${res.status})`);
    return res.json();
  },

  delete: async (path: string, token = demoSessionToken) => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error(`DELETE ${path} failed (${res.status})`);
    return res.json();
  },

  upload: async (
    path: string,
    file: Blob,
    options: {
      fileName: string;
      uploaderId: string;
      accessState?: string;
      sourceTargetId?: string;
      hash?: string;
      thumbnailUrl?: string;
    },
  ) => {
    const formData = new FormData();
    formData.append('file', file, options.fileName);
    formData.append('uploadedBy', options.uploaderId);
    if (options.accessState) formData.append('accessState', options.accessState);
    if (options.sourceTargetId) formData.append('sourceTargetId', options.sourceTargetId);
    if (options.hash) formData.append('hash', options.hash);
    if (options.thumbnailUrl) formData.append('thumbnailUrl', options.thumbnailUrl);

    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: demoSessionToken ? { Authorization: `Bearer ${demoSessionToken}` } : {},
      body: formData
    });
    if (!res.ok) throw new Error(`UPLOAD ${path} failed (${res.status})`);
    return res.json();
  }
};

export const checkBackendHealth = async () => {
  try {
    const data = await apiClient.get('/health');
    return data.status === 'ok';
  } catch {
    return false;
  }
};
