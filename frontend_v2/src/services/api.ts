// Updated ApiService with better debugging and error handling
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Ticket,
  TicketStats,
  ApiResponse,
  AssignTicketRequest,
  UpdateTicketStatusRequest
} from '../types';

const API_BASE = 'http://localhost:5176/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
    console.log('🔑 ApiService initialized. Token present:', !!this.token);

    // Debug: Print token details (first/last few characters only for security)
    if (this.token) {
      console.log('🔑 Token preview:', this.token.substring(0, 20) + '...' + this.token.substring(this.token.length - 20));
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      console.log('🔑 Adding Authorization header');
    } else {
      console.warn('⚠️ No token available for request');
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    console.log('📡 Response received:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries())
    });

    // Check if we're being redirected to login page
    if (response.url.includes('/Account/Login')) {
      console.error('🚨 Redirected to login page - JWT authentication failed!');
      this.logout(); // Clear invalid token
      throw new Error('Authentication failed - please log in again');
    }

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);

        // Try to parse as JSON for structured error
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorText;
        } catch {
          errorMessage = errorText || errorMessage;
        }
      } catch (readError) {
        console.error('❌ Could not read error response:', readError);
      }

      throw new Error(errorMessage);
    }

    try {
      const data = await response.json();
      console.log('✅ Successful response data:', data);
      return data;
    } catch (parseError) {
      console.error('❌ Could not parse JSON response:', parseError);
      throw new Error('Invalid response format');
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log('🔐 Attempting login for:', credentials.email);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await this.handleResponse<AuthResponse>(response);

      this.token = data.token;
      localStorage.setItem('token', data.token);
      console.log('✅ Login successful, token stored');

      return data;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<{ message: string }> {
    console.log('👤 Attempting user registration');

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    return this.handleResponse(response);
  }

  logout(): void {
    console.log('🚪 Logging out, clearing token');
    this.token = null;
    localStorage.removeItem('token');
  }

  // Test method to check authentication
  async testAuth(): Promise<boolean> {
    try {
      console.log('🧪 Testing authentication...');
      await this.getAllTickets(0, 1); // Try to fetch just 1 ticket
      console.log('✅ Authentication test passed');
      return true;
    } catch (error) {
      console.error('❌ Authentication test failed:', error);
      return false;
    }
  }

  // Chat/Inference (should work without auth)
  async sendMessage(prompt: string): Promise<ApiResponse> {
    console.log('💬 Sending chat message');

    const response = await fetch(`${API_BASE}/inference`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ prompt }),
    });

    return this.handleResponse(response);
  }

  // Tickets (requires auth)
  async getAllTickets(skip = 0, take = 20): Promise<Ticket[]> {
    console.log(`🎫 Fetching tickets (skip: ${skip}, take: ${take})`);

    if (!this.token) {
      throw new Error('No authentication token available');
    }

    const url = `${API_BASE}/tickets?skip=${skip}&take=${take}`;
    console.log('🌐 Request URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getAssignedTickets(): Promise<Ticket[]> {
    console.log('🎫 Fetching assigned tickets');

    const response = await fetch(`${API_BASE}/tickets/assigned`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async assignTicket(request: AssignTicketRequest): Promise<{ message: string }> {
    console.log('🎫 Assigning ticket:', request.ticketId);

    const response = await fetch(`${API_BASE}/tickets/assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse(response);
  }

  async updateTicketStatus(id: number, request: Omit<UpdateTicketStatusRequest, 'ticketId'>): Promise<{ message: string }> {
    console.log('🎫 Updating ticket status:', id);

    const response = await fetch(`${API_BASE}/tickets/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, ticketId: id }),
    });

    return this.handleResponse(response);
  }

  async getTicketsPendingApproval(): Promise<Ticket[]> {
    console.log('🎫 Fetching tickets pending approval');

    const response = await fetch(`${API_BASE}/tickets/pending-approval`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getTicketStats(): Promise<TicketStats[]> {
    console.log('📊 Fetching ticket statistics');

    const response = await fetch(`${API_BASE}/tickets/stats`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // Users (requires admin auth)
  async getUsers(): Promise<User[]> {
    console.log('👥 Fetching users');

    if (!this.token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${API_BASE}/users`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<{ message: string }> {
    console.log('👤 Updating user status:', id, isActive);

    const response = await fetch(`${API_BASE}/users/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(isActive),
    });

    return this.handleResponse(response);
  }
}

export const apiService = new ApiService();

// Debug helper function - call this from browser console
(window as any).debugAuth = {
  testAuth: () => apiService.testAuth(),
  getToken: () => localStorage.getItem('token'),
  clearToken: () => {
    localStorage.removeItem('token');
    console.log('Token cleared');
  },
  testTickets: () => apiService.getAllTickets(0, 5),
  testUsers: () => apiService.getUsers()
};

console.log('🛠️ Debug helpers available: window.debugAuth');

// JWT Token decoder for debugging (don't use in production)
export function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const decoded = JSON.parse(jsonPayload);
    console.log('🔍 JWT Token decoded:', decoded);

    // Check expiration
    if (decoded.exp) {
      const expirationDate = new Date(decoded.exp * 1000);
      const now = new Date();
      console.log('⏰ Token expires at:', expirationDate);
      console.log('⏰ Current time:', now);
      console.log('⏰ Token expired:', now > expirationDate);
    }

    return decoded;
  } catch (error) {
    console.error('❌ Could not decode JWT:', error);
    return null;
  }
}