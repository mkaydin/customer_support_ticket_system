import { useState, useEffect } from 'react';
import { MessageCircle, BarChart3, Clock, AlertCircle, CheckCircle2, Send, Loader2 } from 'lucide-react';

// API base URL - adjust this to match your .NET API
const API_BASE = 'http://localhost:5176/api/inference';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  category?: string;
  tracked?: boolean;
}

interface ProblemStat {
  category: string;
  count: number;
  openIssues: number;
}

interface RecentProblem {
  id: string;
  customerMessage: string;
  problemCategory: string;
  status: 'Open' | 'Closed';
  createdAt: string;
}

interface ApiResponse {
  response: string;
  category?: string;
  tracked?: boolean;
}

const App = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [problemStats, setProblemStats] = useState<ProblemStat[]>([]);
  const [recentProblems, setRecentProblems] = useState<RecentProblem[]>([]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const [statsResponse, recentResponse] = await Promise.all([
        fetch(`${API_BASE}/problems/stats`),
        fetch(`${API_BASE}/problems/recent`)
      ]);

      if (statsResponse.ok) {
        const stats: ProblemStat[] = await statsResponse.json();
        setProblemStats(stats);
      }

      if (recentResponse.ok) {
        const recent: RecentProblem[] = await recentResponse.json();
        setRecentProblems(recent);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: inputMessage, 
      timestamp: new Date() 
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: inputMessage }),
      });

      if (response.ok) {
        const data: ApiResponse = await response.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          category: data.category,
          tracked: data.tracked
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Customer Service Hub</h1>
              </div>
            </div>

            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'chat' ? (
          <div className="max-w-4xl mx-auto">
            {/* Chat Container */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-16">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Start a conversation to get customer service assistance</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="text-sm leading-relaxed">{message.content}</div>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <div
                            className={`text-xs ${
                              message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {formatTime(message.timestamp)}
                          </div>
                          {message.category && (
                            <span className={`text-xs px-2 py-1 rounded border ${getCategoryColor(message.category)}`}>
                              {message.category}
                            </span>
                          )}
                        </div>
                        {message.tracked && (
                          <div className="flex items-center mt-1 text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Issue tracked
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Typing...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-4 bg-white">
                <div className="flex space-x-3">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe your issue..."
                    className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[48px]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Problem Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {problemStats.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No statistics available</p>
                  </div>
                ) : (
                  problemStats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{stat.category}</p>
                          <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.count}</p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="mt-4 flex items-center text-sm">
                        <AlertCircle className="h-4 w-4 text-orange-500 mr-1" />
                        <span className="text-gray-600">{stat.openIssues} open issues</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Problems */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent Problems</h2>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentProblems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No recent problems found</p>
                          </td>
                        </tr>
                      ) : (
                        recentProblems.map((problem) => (
                          <tr key={problem.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-xs truncate" title={problem.customerMessage}>
                                {problem.customerMessage}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getCategoryColor(problem.problemCategory)}`}>
                                {problem.problemCategory}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                problem.status === 'Open'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {problem.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {formatDate(problem.createdAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;