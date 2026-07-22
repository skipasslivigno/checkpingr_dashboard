import React from "react";
import { Users, Activity, MountainSnow, Calendar, Menu, Globe, ChevronRight } from "lucide-react";

export function VariantA() {
  const lifts = [
    { name: "Tronchetto", passages: 1840, guests: 45, max: 2000, active: true },
    { name: "Gondola A", passages: 1620, guests: 82, max: 2000, active: true },
    { name: "Carosello", passages: 1410, guests: 54, max: 2000, active: true },
    { name: "Mottolino", passages: 980, guests: 31, max: 2000, active: true },
    { name: "Livigno", passages: 760, guests: 22, max: 2000, active: true },
    { name: "Vetta", passages: 540, guests: 18, max: 2000, active: true },
    { name: "Taneda", passages: 380, guests: 12, max: 2000, active: true },
    { name: "Capriana", passages: 210, guests: 8, max: 2000, active: true },
    { name: "Alpino", passages: 0, guests: 0, max: 2000, active: false },
    { name: "Foscagno", passages: 0, guests: 0, max: 2000, active: false },
  ];

  return (
    <div className="min-h-screen w-full bg-[#09101a] text-slate-200 flex flex-col font-sans max-w-[390px] mx-auto shadow-2xl relative">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-12 pb-4 border-b border-slate-800 bg-[#0d1624] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-300">
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">Control Room</h1>
            <div className="text-xs text-teal-400 font-medium">Oggi, 12 Feb</div>
          </div>
        </div>
        <button className="p-2 -mr-2 rounded-full hover:bg-slate-800 text-slate-300 flex items-center gap-1">
          <Globe size={16} />
          <span className="text-xs font-semibold">IT</span>
        </button>
      </header>

      {/* Stats Strip */}
      <div className="px-5 py-4 grid grid-cols-4 gap-2 border-b border-slate-800 bg-[#0b121d]">
        <div className="flex flex-col items-center justify-center bg-slate-800/40 border border-slate-700/50 rounded-xl py-3 px-1">
          <Activity size={16} className="text-teal-400 mb-1" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Passaggi</span>
          <span className="text-sm font-bold text-white">8.240</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-slate-800/40 border border-slate-700/50 rounded-xl py-3 px-1">
          <Users size={16} className="text-orange-500 mb-1" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Ospiti</span>
          <span className="text-sm font-bold text-white">312</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-slate-800/40 border border-slate-700/50 rounded-xl py-3 px-1">
          <MountainSnow size={16} className="text-teal-400 mb-1" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Impianti</span>
          <span className="text-sm font-bold text-white">18/24</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-slate-800/40 border border-slate-700/50 rounded-xl py-3 px-1">
          <Calendar size={16} className="text-orange-500 mb-1" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Stagione</span>
          <span className="text-sm font-bold text-white">25/26</span>
        </div>
      </div>

      {/* Lift List Header */}
      <div className="px-5 pt-5 pb-2 flex justify-between items-end">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Tutti gli Impianti</h2>
        <span className="text-[10px] font-medium px-2 py-1 bg-slate-800 rounded text-slate-300">Live</span>
      </div>

      {/* Lift List */}
      <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-2.5">
        {lifts.map((lift, i) => (
          <div 
            key={lift.name} 
            className={`p-3.5 rounded-xl border relative overflow-hidden transition-colors ${
              lift.active 
                ? 'bg-[#111a28] border-slate-700/60 hover:bg-[#152031]' 
                : 'bg-transparent border-slate-800/50 opacity-60'
            }`}
          >
            {/* Background progress fill for active lifts */}
            {lift.active && (
              <div 
                className="absolute inset-y-0 left-0 bg-teal-900/10 pointer-events-none"
                style={{ width: `${(lift.passages / lift.max) * 100}%` }}
              />
            )}
            
            <div className="relative z-10 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className={`font-semibold text-[15px] ${lift.active ? 'text-white' : 'text-slate-400'}`}>
                  {lift.name}
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 min-w-[40px] justify-end">
                    <Users size={12} className={lift.active ? "text-orange-500" : "text-slate-500"} />
                    <span className={`text-xs font-semibold ${lift.active ? 'text-orange-400' : 'text-slate-500'}`}>
                      {lift.guests}
                    </span>
                  </div>
                  <div className="min-w-[50px] text-right">
                    <span className={`text-[15px] font-bold ${lift.active ? 'text-teal-400' : 'text-slate-500'}`}>
                      {lift.passages.toLocaleString('it-IT')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-[#0a0f1a] rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${lift.active ? 'bg-gradient-to-r from-teal-600 to-teal-400' : 'bg-slate-700'}`} 
                  style={{ width: `${(lift.passages / lift.max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
