import React from "react";
import { Users, Activity, MountainSnow, Calendar, Menu, Globe } from "lucide-react";

// SKIPASSion Livigno brand palette
const brand = {
  teal:        "#009DB5",   // primary — passages, active
  tealLight:   "#E6F7FA",   // teal bg chip
  tealBorder:  "#B3E5ED",
  amber:       "#F59E0B",   // secondary — guests (warm, readable)
  amberLight:  "#FEF3C7",
  amberBorder: "#FDE68A",
  bg:          "#F4F8F9",   // page background
  card:        "#FFFFFF",
  border:      "#E2EEF0",
  text:        "#0F2A30",   // near-black derived from teal
  muted:       "#6B8F95",
};

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
    <div
      className="min-h-screen w-full flex flex-col font-sans max-w-[390px] mx-auto"
      style={{ background: brand.bg, color: brand.text }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 pt-12 pb-4 sticky top-0 z-10"
        style={{ background: brand.card, borderBottom: `1px solid ${brand.border}` }}
      >
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 rounded-full" style={{ color: brand.muted }}>
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-base font-bold tracking-wide" style={{ color: brand.text }}>
              SKIPASSion Livigno
            </h1>
            <div className="text-xs font-semibold" style={{ color: brand.teal }}>
              Oggi, 12 Feb 2026
            </div>
          </div>
        </div>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
          style={{ background: brand.tealLight, color: brand.teal }}
        >
          <Globe size={13} />
          IT
        </button>
      </header>

      {/* Stats Strip — 4 compact cards in one row */}
      <div
        className="px-4 py-3 grid grid-cols-4 gap-2"
        style={{ background: brand.card, borderBottom: `1px solid ${brand.border}` }}
      >
        {/* Passaggi */}
        <div className="flex flex-col items-center justify-center rounded-xl py-3 px-1"
          style={{ background: brand.tealLight, border: `1px solid ${brand.tealBorder}` }}>
          <Activity size={14} style={{ color: brand.teal }} className="mb-1" />
          <span className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: brand.muted }}>Passaggi</span>
          <span className="text-sm font-bold" style={{ color: brand.text }}>8.240</span>
        </div>
        {/* Ospiti */}
        <div className="flex flex-col items-center justify-center rounded-xl py-3 px-1"
          style={{ background: brand.amberLight, border: `1px solid ${brand.amberBorder}` }}>
          <Users size={14} style={{ color: brand.amber }} className="mb-1" />
          <span className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: brand.muted }}>Ospiti</span>
          <span className="text-sm font-bold" style={{ color: brand.text }}>312</span>
        </div>
        {/* Impianti */}
        <div className="flex flex-col items-center justify-center rounded-xl py-3 px-1"
          style={{ background: brand.tealLight, border: `1px solid ${brand.tealBorder}` }}>
          <MountainSnow size={14} style={{ color: brand.teal }} className="mb-1" />
          <span className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: brand.muted }}>Impianti</span>
          <span className="text-sm font-bold" style={{ color: brand.text }}>18/24</span>
        </div>
        {/* Stagione */}
        <div className="flex flex-col items-center justify-center rounded-xl py-3 px-1"
          style={{ background: "#F4F8F9", border: `1px solid ${brand.border}` }}>
          <Calendar size={14} style={{ color: brand.muted }} className="mb-1" />
          <span className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: brand.muted }}>Stagione</span>
          <span className="text-sm font-bold" style={{ color: brand.text }}>25/26</span>
        </div>
      </div>

      {/* Section header */}
      <div className="px-5 pt-4 pb-2 flex justify-between items-center">
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: brand.muted }}>
          Tutti gli Impianti
        </h2>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: brand.tealLight, color: brand.teal }}
        >
          ● Live
        </span>
      </div>

      {/* Lift list */}
      <div className="flex-1 px-4 pb-10 space-y-2">
        {lifts.map((lift) => (
          <div
            key={lift.name}
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{
              background: lift.active ? brand.card : "transparent",
              border: `1px solid ${lift.active ? brand.border : "#DDE8EA"}`,
              opacity: lift.active ? 1 : 0.45,
            }}
          >
            {/* Dot + name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: lift.active ? brand.teal : "#CBD5D8" }}
              />
              <span
                className="text-[14px] font-semibold truncate"
                style={{ color: lift.active ? brand.text : brand.muted }}
              >
                {lift.name}
              </span>
            </div>

            {/* Guests + Passages */}
            <div className="flex items-center gap-4 flex-shrink-0 ml-3">
              <div className="flex items-center gap-1">
                <Users size={12} style={{ color: lift.active ? brand.amber : "#CBD5D8" }} />
                <span
                  className="text-xs font-semibold"
                  style={{ color: lift.active ? brand.amber : "#CBD5D8" }}
                >
                  {lift.guests}
                </span>
              </div>
              <span
                className="text-[15px] font-bold w-12 text-right"
                style={{ color: lift.active ? brand.teal : "#CBD5D8" }}
              >
                {lift.passages.toLocaleString("it-IT")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
