export const API_URL = import.meta.env.VITE_APP_URL || "http://localhost:5000";

class ApiService {
  constructor() {
    this.token = localStorage.getItem('admin_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('admin_token', token);
    } else {
      localStorage.removeItem('admin_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid — clear it
          this.setToken(null);
        }
        throw new Error(data.message || `Request failed (${response.status})`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  // --- Public Message Endpoints ---
  async getPublicStatus(username = '') {
    const query = username ? `?username=${encodeURIComponent(username)}` : '';
    return this.request(`/messages/status${query}`, { method: 'GET' });
  }

  async sendAnonymousMessage(content, username = '') {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ content, username: username || undefined }),
    });
  }

  // --- Admin Authentication Endpoints ---
  async adminLogin(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const token = data.accessToken || data.user?.accessToken;
    if (token) {
      this.setToken(token);
    }
    return data;
  }

  async adminRegister(username, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async adminVerify(email, code) {
    const data = await this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    const token = data.accessToken || data.user?.accessToken;
    if (token) {
      this.setToken(token);
    }
    return data;
  }

  async resendVerifyCode(email) {
    return this.request('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getMe() {
    return this.request('/me', { method: 'GET' });
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      this.setToken(null);
    }
  }

  // --- Admin Dashboard Endpoints ---
  async getAdminStatus() {
    return this.request('/admin/status', { method: 'GET' });
  }

  async toggleAcceptingStatus(isAcceptingMessages) {
    return this.request('/admin/toggle-status', {
      method: 'PATCH',
      body: JSON.stringify({ isAcceptingMessages }),
    });
  }

  async updateAdminHandle(username) {
    return this.request('/admin/handle', {
      method: 'PATCH',
      body: JSON.stringify({ username }),
    });
  }

  async getAdminMessages({ limit = 100, offset = 0, status = 'all' } = {}) {
    const params = new URLSearchParams({ limit, offset, status });
    return this.request(`/admin/messages?${params.toString()}`, { method: 'GET' });
  }

  async markMessageRead(id, isRead = true) {
    return this.request(`/admin/messages/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead }),
    });
  }

  async markAllRead() {
    return this.request('/admin/messages/read-all', { method: 'PATCH' });
  }

  async deleteMessage(id) {
    return this.request(`/admin/messages/${id}`, { method: 'DELETE' });
  }

  async clearAllMessages() {
    return this.request('/admin/messages', { method: 'DELETE' });
  }
}

export const api = new ApiService();
