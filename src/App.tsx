import { useState } from 'react';
import { ChatbotSimulator } from './components/ChatbotSimulator';
import { SimulationEvaluation } from './components/SimulationEvaluation';
import { MessageSquare, BarChart2 } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'simulator' | 'evaluation'>('simulator');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex flex-col">
      {/* Top Navigation */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-14 gap-8">
            <div className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mr-4">

            </div>

            <div className="flex h-full">
              <button
                onClick={() => setCurrentView('simulator')}
                className={`
                    flex items-center gap-2 px-4 h-full border-b-2 text-sm font-medium transition-colors
                    ${currentView === 'simulator'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'}
                  `}
              >
                <MessageSquare className="w-4 h-4" />
                Conversation Simulator
              </button>

              <button
                onClick={() => setCurrentView('evaluation')}
                className={`
                    flex items-center gap-2 px-4 h-full border-b-2 text-sm font-medium transition-colors
                    ${currentView === 'evaluation'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'}
                  `}
              >
                <BarChart2 className="w-4 h-4" />
                Evaluation Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1">
        {currentView === 'simulator' ? (
          <ChatbotSimulator />
        ) : (
          <SimulationEvaluation />
        )}
      </main>
    </div>
  );
}
