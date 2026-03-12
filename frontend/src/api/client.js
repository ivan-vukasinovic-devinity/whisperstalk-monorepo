const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.message || `Request failed: ${response.status}`;
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
  heartbeat(userId) {
    return request("/presence/heartbeat", {
      method: "POST",
      body: JSON.stringify({ user_id: userId })
    });
  },
  getPresenceStatuses(userIds) {
    if (!userIds?.length) return Promise.resolve([]);
    const query = encodeURIComponent(userIds.join(","));
    return request(`/presence/statuses?user_ids=${query}`);
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
  sendSignal(payload) {
    return request("/signaling", { method: "POST", body: JSON.stringify(payload) });
  },
  consumeSignals(recipientId, senderId) {
    const query = senderId ? `?sender_id=${encodeURIComponent(senderId)}` : "";
    return request(`/signaling/inbox/${recipientId}${query}`);
  },
  flushSignaling(userId, peerId) {
    return request(`/signaling/flush/${userId}/${peerId}`, { method: "DELETE" });
  }
};
