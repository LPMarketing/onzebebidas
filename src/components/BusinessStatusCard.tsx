import React from 'react';
import { Clock, MapPin, ExternalLink } from 'lucide-react';
import { getBusinessStatus, SaoPauloTimeInfo } from '../data/businessSchedule';
import facadeImg from '../assets/images/regenerated_image_1787856764616.png';

interface BusinessStatusCardProps {
  nowInfo: SaoPauloTimeInfo;
}

export const BusinessStatusCard: React.FC<BusinessStatusCardProps> = ({
  nowInfo,
}) => {
  const businessStatus = getBusinessStatus(nowInfo);

  return (
    <div
      id="business-status-card"
      className="relative overflow-hidden bg-gradient-to-br from-[#13151A] via-[#0F1014] to-[#0A0B0D] border border-[#262933] hover:border-[#343846] rounded-2xl p-5 sm:p-6 transition-all duration-300 shadow-xl group flex flex-col justify-between"
    >
      <div>
        {/* Top bar: Category + Open/Closed status */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-[#8A8F9D] uppercase">
            <Clock className="w-3.5 h-3.5 text-[#8A8F9D]" />
            <span>Horário de Funcionamento</span>
          </div>

          {/* Dynamic Open / Closed Status Pill */}
          <div
            id="business-open-status-badge"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide border ${
              businessStatus.isOpen
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-[#181B22] border-[#2C303B] text-[#9EA4B5]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                businessStatus.isOpen ? 'bg-emerald-400 animate-ping' : 'bg-[#6B7280]'
              }`}
            />
            <span>{businessStatus.statusBadge}</span>
          </div>
        </div>

        {/* Main Content: Today's Schedule */}
        <div className="mb-2">
          <div className="text-xs text-[#8A8F9D] uppercase tracking-wider font-semibold">Hoje na Onze</div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#F4F2ED] mt-0.5">
            {businessStatus.todayName}
          </div>
          <div className="text-sm font-semibold text-[#DFAC62] mt-1 font-mono">
            {businessStatus.todayHoursDisplay}
          </div>
        </div>

        {/* Dynamic status detail highlight */}
        <div className="my-3 p-3 rounded-xl bg-[#16181F]/90 border border-[#262934] flex items-center justify-between">
          <div className="text-xs text-[#9EA4B5] font-medium">Status de Hoje</div>
          <div
            id="business-closing-or-opening-text"
            className={`text-xs sm:text-sm font-semibold ${
              businessStatus.isOpen ? 'text-emerald-300' : 'text-[#DFAC62]'
            }`}
          >
            {businessStatus.closingOrOpeningText}
          </div>
        </div>

        {/* Storefront Facade Image below text */}
        <div className="relative w-full h-36 sm:h-44 rounded-xl overflow-hidden mb-3.5 border border-[#262A34] group/img shadow-inner">
          <img
            id="business-facade-image"
            src={facadeImg}
            alt="Fachada Onze Lounge"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1014] via-black/20 to-transparent pointer-events-none" />
          
          {/* Subtle overlay badge */}
          <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-[#F4F2ED]">
            <MapPin className="w-3 h-3 text-[#DFAC62]" />
            <span>Onze Lounge Bar</span>
          </div>
        </div>
      </div>

      {/* Footer: Direct Google Maps Location button */}
      <div className="pt-2 border-t border-[#1C1F27] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-[#8A8F9F]">
          <MapPin className="w-3.5 h-3.5 text-[#C58A3A] shrink-0" />
          <span className="truncate">Localização no mapa</span>
        </div>
        <a
          id="business-location-maps-btn"
          href="https://maps.app.goo.gl/7ev4TRiKBcKa1F998"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171920] hover:bg-[#1E212A] border border-[#282B36] hover:border-[#C58A3A]/50 text-[#DFAC62] hover:text-[#F4F2ED] text-xs font-semibold tracking-wide transition-all group/map shadow-sm shrink-0"
        >
          <MapPin className="w-3.5 h-3.5 text-[#DFAC62] group-hover/map:scale-110 transition-transform" />
          <span>Localização</span>
          <ExternalLink className="w-3 h-3 text-[#DFAC62]/70 group-hover/map:text-[#DFAC62] transition-colors" />
        </a>
      </div>
    </div>
  );
};
