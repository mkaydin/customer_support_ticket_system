import React, { useState, useEffect } from 'react';
import { Ticket, User, TicketStats } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  User as UserIcon, 
  Calendar,
  Filter,
  Search,
  MoreVertical
} from 'lucide-react';

const TicketManagement: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ticketsData, statsData] = await Promise.all([
        user?.role === 'Admin' ? apiService.getAllTickets() : apiService.getAssignedTickets(),
        apiService.getTicketStats()
      ]);

      setTickets(ticketsData);
      setStats(statsData);

      if (user?.role === 'Admin') {
        const [usersData, pendingData] = await Promise.all([
          apiService.getUsers(),
          apiService.getTicketsPendingApproval()
        ]);
        setUsers(usersData);
        setPendingTickets(pendingData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTicket = async (ticketId: number, assignedToUserId: string, adminNotes?: string) => {
    try {
      await apiService.assignTicket({ ticketId, assignedToUserId, adminNotes });
      await fetchData();
      setShowAssignModal(false);
      setSelectedTicket(null);
    } catch (error) {
      console.error('Error assigning ticket:', error);
    }
  };

  const handleUpdateStatus = async (ticketId: number, status: Ticket['status'], notes?: string) => {
    try {
      await apiService.updateTicketStatus(ticketId, { status, notes });
      await fetchData();
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Open': 'bg-red-100 text-red-800 border-red-200',
      'InProgress': 'bg-blue-100 text-blue-800 border-blue-200',
      'Solved': 'bg-green-100 text-green-800 border-green-200',
      'Closed': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Payment Issues': 'bg-red-50 text-red-700 border-red-200',
      'Order & Delivery': 'bg-blue-50 text-blue-700 border-blue-200',
      'Technical Support': 'bg-purple-50 text-purple-700 border-purple-200',
      'Subscription Issues': 'bg-orange-50 text-orange-700 border-orange-200',
      'Product Complaints': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Return & Exchange': 'bg-green-50 text-green-700 border-green-200',
      'Promotions & Coupons': 'bg-pink-50 text-pink-700 border-pink-200',
      'General Inquiries': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colors[category] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filterStatus === 'all') return true;
    return ticket.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ticket Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{stat.category}</h3>
                <div className="text-2xl font-bold text-gray-900">{stat.total}</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Open: {stat.open}</span>
                  <span className="text-blue-600">In Progress: {stat.inProgress}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Solved: {stat.solved}</span>
                  <span className="text-gray-600">Closed: {stat.closed}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Approval (Admin only) */}
      {user?.role === 'Admin' && pendingTickets.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Approval</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Solved By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Solved At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {ticket.customerMessage}
                          </div>
                          <div className="text-sm text-gray-500">{ticket.problemCategory}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {ticket.solvedByUser ? `${ticket.solvedByUser.firstName} ${ticket.solvedByUser.lastName}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {ticket.solvedAt ? formatDate(ticket.solvedAt) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleUpdateStatus(ticket.id, 'Closed')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(ticket.id, 'InProgress')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {user?.role === 'Admin' ? 'All Tickets' : 'My Assigned Tickets'}
          </h2>
          <div className="flex space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="Open">Open</option>
              <option value="InProgress">In Progress</option>
              <option value="Solved">Solved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No tickets found</p>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm text-gray-900 truncate" title={ticket.customerMessage}>
                            {ticket.customerMessage}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(ticket.problemCategory)}`}>
                          {ticket.problemCategory}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {ticket.assignedToUser ? 
                          `${ticket.assignedToUser.firstName} ${ticket.assignedToUser.lastName}` : 
                          'Unassigned'
                        }
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          {user?.role === 'Admin' && !ticket.assignedToUserId && (
                            <button
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setShowAssignModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Assign
                            </button>
                          )}
                          {(user?.role === 'Admin' || ticket.assignedToUserId === user?.id) && ticket.status !== 'Closed' && (
                            <select
                              value={ticket.status}
                              onChange={(e) => handleUpdateStatus(ticket.id, e.target.value as Ticket['status'])}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="Open">Open</option>
                              <option value="InProgress">In Progress</option>
                              <option value="Solved">Solved</option>
                              {user?.role === 'Admin' && <option value="Closed">Closed</option>}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assign Ticket Modal */}
      {showAssignModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Assign Ticket</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Ticket:</p>
              <p className="text-sm bg-gray-50 p-2 rounded">{selectedTicket.customerMessage}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Agent:
              </label>
              <select
                id="assignUser"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select an agent...</option>
                {users.filter(u => u.role === 'Agent' && u.isActive).map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (optional):
              </label>
              <textarea
                id="adminNotes"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any notes for the agent..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTicket(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const assignUser = (document.getElementById('assignUser') as HTMLSelectElement).value;
                  const adminNotes = (document.getElementById('adminNotes') as HTMLTextAreaElement).value;
                  if (assignUser) {
                    handleAssignTicket(selectedTicket.id, assignUser, adminNotes || undefined);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketManagement;