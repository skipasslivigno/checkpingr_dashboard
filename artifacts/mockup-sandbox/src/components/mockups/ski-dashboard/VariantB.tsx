import React from 'react';
import { Users, Ticket, Activity, Calendar, Settings, Globe, Signal } from 'lucide-react';

const stats = [
  { label: 'Total Passages', value: '8.240', icon: Ticket, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Guests on Lifts', value: '312', icon: Users, color: 'text-lime-400', bg: 'bg-lime-500/10' },
  { label: 'Active Lifts', value: '18/24', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Season', value: '2025/26', icon: Calendar, color: 'text-slate-400', bg: 'bg-slate-800' },
];

const lifts = [
  { name: 'Tronchetto', passages: '1.840', guests: 45, maxCapacity: 2000, active: true },
  { name: 'Gondola A', passages: '1.620', guests: 82, maxCapacity: 2000, active: true },
  { name: 'Carosello', passages: '1.410', guests: 64, maxCapacity: 2000, active: true },
  { name: 'Mottolino', passages: '980', guests: 32, maxCapacity: 2000, active: true },
  { name: 'Livigno', passages: '760', guests: 28, maxCapacity: 2000, active: true },
  { name: 'Vetta', passages: '540', guests: 15, maxCapacity: 2000, active: true },
  { name: 'Taneda', passages: '380', guests: 12, maxCapacity: 2000, active: true },
  { name: 'Capriana', passages: '210', guests: 8, maxCapacity: 2000, active: true },
  { name: 'Alpino', passages: '0', guests: 0, maxCapacity: 2000, active: false },
  { name: 'Foscagno', passages: '0', guests: 0, maxCapacity: 2000, active: false },
];

export function VariantB() {
  return (
    <div className="min-h-screen w-full mx-auto bg-slate-950 text-slate-50 font-sans overflow-x-hidden flex flex-col relative pb-10 sm:max-w-[390px] sm:border-x sm:border-slate-800">
      {/* Header */}
      <header className="px-5 pt-8 pb-4 flex justify-between items-center sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-slate-800/50">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Pannello Piste</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">Live Operations</p>
        </div>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
            <Globe className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="px-5 py-6 flex-1 flex flex-col gap-8">
        
        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-3">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Lifts List */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">All Lifts Status</h2>
            <div className="flex items-center gap-1.5 text-xs text-lime-400 font-medium bg-lime-500/10 px-2 py-1 rounded-md">
              <Signal className="w-3 h-3" />
              <span>Live Updates</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {lifts.map((lift, idx) => {
              const progress = Math.min(100, (parseInt(lift.passages.replace('.','')) / lift.maxCapacity) * 100);
              return (
                <div key={idx} className="group relative bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 overflow-hidden">
                  <div className="flex justify-between items-center z-10 relative">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${lift.active ? 'bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.6)]' : 'bg-slate-700'}`} />
                      <span className={`font-semibold text-base ${lift.active ? 'text-slate-100' : 'text-slate-500'}`}>{lift.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-bold tracking-tight ${lift.active ? 'text-blue-400' : 'text-slate-600'}`}>{lift.passages}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 ml-1.5">Pass</span>
                    </div>
                  </div>
                  
                  {lift.active && (
                    <div className="z-10 relative mt-1">
                      <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                        <span>Guests on lift: <strong className="text-slate-200">{lift.guests}</strong></span>
                        <span>{progress.toFixed(0)}% Load</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

      </main>

    </div>
  );
}
