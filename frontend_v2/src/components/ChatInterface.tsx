import React, { useState } from 'react';
import { MessageCircle, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Message } from '../types';
import { apiService } from '../services/api';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      const data = await apiService.sendMessage(inputMessage);
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        category: data.category,
        tracked: data.tracked
      };
      setMessages(prev => [...prev, assistantMessage]);
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
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-16">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Start a conversation to get customer service assistance</p>
              <p className="text-sm mt-2">Describe your issue and I'll help categorize and track it</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div
                      className={`text-xs ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                    {message.category && (
                      <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(message.category)}`}>
                        {message.category}
                      </span>
                    )}
                  </div>
                  {message.tracked && (
                    <div className="flex items-center mt-2 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Issue tracked as ticket
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-3 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing your message...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4 bg-white rounded-b-xl">
          <div className="flex space-x-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your issue or ask a question..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[60px]"
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
  );
};

export default ChatInterface;