import React from "react";
import { Users, Activity, MountainSnow, Calendar, Menu, Globe } from "lucide-react";

export function VariantA() {
  const lifts = [
    { name: "Tronchetto", passages: 1840, guests: 45, active: true },
    { name: "Gondola A",  passages: 1620, guests: 82, active: true },
    { name: "Carosello",  passages: 1410, guests: 54, active: true },
    { name: "Mottolino",  passages: 980,  guests: 31, active: true },
    { name: "Livigno",    passages: 760,  guests: 22, active: true },
    { name: "Vetta",      passages: 540,  guests: 18, active: true },
    { name: "Taneda",     passages: 380,  guests: 12, active: true },
    { name: "Capriana",   passages: 210,  guests: 8,  active: true },
    { name: "Alpino",     passages: 0,    guests: 0,  active: false },
    { name: "Foscagno",   passages: 0,    guests: 0,  active: false },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-800 flex flex-col font-sans max-w-[390px] mx-auto">

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-12 pb-4 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-wide">Control Room</h1>
            <div className="text-xs text-blue-500 font-medium">Oggi, 12 Feb</div>
          </div>
        </div>
        <button className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-500 flex items-center gap-1">
          <Globe size={16} />
          <span className="text-xs font-semibold">IT</span>
        </button>
      </header>

      {/* Stats Strip */}
      <div className="px-4 py-4 grid grid-cols-4 gap-2 bg-white border-b border-slate-200">
        <div className="flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-xl py-3 px-1">
          <Activity size={15} className="text-blue-500 mb-1" />
          <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Passaggi</span>
          <span className="text-sm font-bold text-slate-900">8.240</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-lime-50 border border-lime-100 rounded-xl py-3 px-1">
          <Users size={15} className="text-lime-600 mb-1" />
          <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Ospiti</span>
          <span className="text-sm font-bold text-slate-900">312</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-xl py-3 px-1">
          <MountainSnow size={15} className="text-blue-500 mb-1" />
          <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Impianti</span>
          <span className="text-sm font-bold text-slate-900">18/24</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-xl py-3 px-1">
          <Calendar size={15} className="text-slate-400 mb-1" />
          <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Stagione</span>
          <span className="text-sm font-bold text-slate-900">25/26</span>
        </div>
      </div>

      {/* Lift List Header */}
      <div className="px-5 pt-5 pb-2 flex justify-between items-center">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Tutti gli Impianti</h2>
        <span className="text-[10px] font-semibold px-2 py-0.5 bg-lime-100 text-lime-700 rounded-full">• Live</span>
      </div>

      {/* Lift List */}
      <div className="flex-1 px-4 pb-10 space-y-2">
        {lifts.map((lift) => (
          <div
            key={lift.name}
            className={`px-4 py-3 rounded-xl border flex items-center justify-between ${
              lift.active
                ? "bg-white border-slate-200"
                : "bg-slate-50 border-slate-200 opacity-50"
            }`}
          >
            {/* Status dot + name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  lift.active ? "bg-lime-500" : "bg-slate-300"
                }`}
              />
              <span className={`text-[14px] font-semibold truncate ${lift.active ? "text-slate-800" : "text-slate-400"}`}>
                {lift.name}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 flex-shrink-0 ml-3">
              {/* Guests */}
              <div className="flex items-center gap-1">
                <Users size={12} className={lift.active ? "text-lime-500" : "text-slate-300"} />
                <span className={`text-xs font-semibold ${lift.active ? "text-lime-600" : "text-slate-300"}`}>
                  {lift.guests}
                </span>
              </div>
              {/* Passages */}
              <span className={`text-[15px] font-bold w-12 text-right ${lift.active ? "text-blue-500" : "text-slate-300"}`}>
                {lift.passages.toLocaleString("it-IT")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
