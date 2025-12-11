import { useState } from 'react';
import { ChatbotSimulator } from './components/ChatbotSimulator';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <ChatbotSimulator />
    </div>
  );
}
