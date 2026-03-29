const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const TOKEN_KEY = "whispers_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setStoredToken(null);
    const err = new Error("Session expired. Please log in again.");
    err.status = 401;
    throw err;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.detail || body?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

export const apiClient = {
  signup(payload) {
    return request("/auth/signup", { method: "POST", body: JSON.stringify(payload) });
  },
  login(payload) {
    return request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
  },
  getContacts(userId) {
    return request(`/contacts/${userId}`);
  },
  getPendingRequests(userId) {
    return request(`/contacts/requests/pending/${userId}`);
  },
  createContactRequest(payload) {
    return request("/contacts/requests", { method: "POST", body: JSON.stringify(payload) });
  },
  createContactRequestByIdentifier(requesterId, identifier) {
    return request("/contacts/requests/by-identifier", {
      method: "POST",
      body: JSON.stringify({ requester_id: requesterId, identifier })
    });
  },
  acceptContactRequest(requestId, userId) {
    return request(`/contacts/requests/${requestId}/accept`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId })
    });
  },
  rejectContactRequest(requestId, userId) {
    return request(`/contacts/requests/${requestId}/reject`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId })
    });
  },
};
