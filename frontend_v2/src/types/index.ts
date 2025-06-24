export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Admin' | 'Agent' | 'Customer';
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'Admin' | 'Agent' | 'Customer';
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  category?: string;
  tracked?: boolean;
}

export interface Ticket {
  id: number;
  customerMessage: string;
  problemCategory: string;
  createdAt: string;
  status: 'Open' | 'InProgress' | 'Solved' | 'Closed';
  assignedToUserId?: string;
  assignedToUser?: User;
  adminNotes?: string;
  solvedAt?: string;
  solvedByUserId?: string;
  solvedByUser?: User;
  requiresAdminApproval: boolean;
}

export interface TicketStats {
  category: string;
  total: number;
  open: number;
  inProgress: number;
  solved: number;
  closed: number;
}

export interface ApiResponse {
  response: string;
  category?: string;
  tracked?: boolean;
}

export interface AssignTicketRequest {
  ticketId: number;
  assignedToUserId: string;
  adminNotes?: string;
}

export interface UpdateTicketStatusRequest {
  ticketId: number;
  status: 'Open' | 'InProgress' | 'Solved' | 'Closed';
  notes?: string;
}