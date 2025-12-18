import { useState } from 'react';
import { ChatbotSimulator } from './components/ChatbotSimulator';
import { SimulationEvaluation } from './components/SimulationEvaluation';
import { MessageSquare, BarChart2 } from 'lucide-react';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [currentView, setCurrentView] = useState<'simulator' | 'evaluation'>('simulator');

  return (
    <div className="min-h-screen bg-purple-50 flex flex-col">
      {/* Top Navigation */}
      <div className="w-full z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center h-14 gap-0">
            <div className="flex h-full items-center gap-3">
              <button
                onClick={() => setCurrentView('simulator')}
                className={`
                    flex items-center gap-2.5 px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 mt-2
                    ${currentView === 'simulator'
                    ? 'bg-purple-50 border-2 border-purple-600'
                    : 'bg-white/70 hover:bg-white/90 border border-gray-200/60'}
                  `}
              >
                <MessageSquare className={`w-4 h-4 ${currentView === 'simulator' ? 'text-purple-600' : 'text-gray-600'}`} />
                <span className={`${currentView === 'simulator' ? 'text-purple-600' : 'text-gray-600'}`}>챗봇 시뮬레이터</span>
              </button>

              <button
                onClick={() => setCurrentView('evaluation')}
                className={`
                    flex items-center gap-2.5 px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 mt-2
                    ${currentView === 'evaluation'
                    ? 'bg-purple-50 border-2 border-purple-600'
                    : 'bg-white/70 hover:bg-white/90 border border-gray-200/60'}
                  `}
              >
                <BarChart2 className={`w-4 h-4 ${currentView === 'evaluation' ? 'text-purple-600' : 'text-gray-600'}`} />
                <span className={`${currentView === 'evaluation' ? 'text-purple-600' : 'text-gray-600'}`}>평가 대시보드</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1">
        <div style={{ display: currentView === 'simulator' ? 'block' : 'none' }}>
          <ChatbotSimulator />
        </div>
        <div style={{ display: currentView === 'evaluation' ? 'block' : 'none' }}>
          <SimulationEvaluation />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
