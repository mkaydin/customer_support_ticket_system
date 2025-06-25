import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm';
import ChatInterface from './components/ChatInterface';
import TicketManagement from './components/TicketManagement';
import UserManagement from './components/UserManagement';
import { 
  MessageCircle, 
  TicketIcon, 
  Users, 
  LogOut, 
  Shield
} from 'lucide-react';
import { useState } from 'react';

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'tickets' | 'users'>('chat');

  if (!user) {
    return <LoginForm />;
  }

  const navigation = [
    { id: 'chat', name: 'Chat', icon: MessageCircle, available: true },
    { id: 'tickets', name: 'Tickets', icon: TicketIcon, available: user.role === 'Admin' || user.role === 'Agent' },
    { id: 'users', name: 'Users', icon: Users, available: user.role === 'Admin' },
  ].filter(item => item.available);

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

            <div className="flex items-center space-x-4">
              <nav className="flex space-x-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as never)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                        activeTab === item.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-gray-500">{user.role}</div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'tickets' && <TicketManagement />}
        {activeTab === 'users' && user.role === 'Admin' && <UserManagement />}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;