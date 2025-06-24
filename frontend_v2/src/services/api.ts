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
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(credentials),
    });

    const data = await this.handleResponse<AuthResponse>(response);
    this.token = data.token;
    localStorage.setItem('token', data.token);
    return data;
  }

  async register(userData: RegisterRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    return this.handleResponse(response);
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Chat/Inference
  async sendMessage(prompt: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/inference`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ prompt }),
    });

    return this.handleResponse(response);
  }

  // Tickets
  async getAllTickets(skip = 0, take = 20): Promise<Ticket[]> {
    const response = await fetch(`${API_BASE}/tickets?skip=${skip}&take=${take}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getAssignedTickets(): Promise<Ticket[]> {
    const response = await fetch(`${API_BASE}/tickets/assigned`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async assignTicket(request: AssignTicketRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/tickets/assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse(response);
  }

  async updateTicketStatus(id: number, request: Omit<UpdateTicketStatusRequest, 'ticketId'>): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/tickets/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, ticketId: id }),
    });

    return this.handleResponse(response);
  }

  async getTicketsPendingApproval(): Promise<Ticket[]> {
    const response = await fetch(`${API_BASE}/tickets/pending-approval`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getTicketStats(): Promise<TicketStats[]> {
    const response = await fetch(`${API_BASE}/tickets/stats`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // Users
  async getUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE}/users`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/users/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(isActive),
    });

    return this.handleResponse(response);
  }
}

export const apiService = new ApiService();