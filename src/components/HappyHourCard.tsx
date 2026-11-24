import React from 'react';
import { Sparkles, GlassWater, CalendarDays, ChevronRight } from 'lucide-react';
import { getHappyHourStatus, SaoPauloTimeInfo } from '../data/businessSchedule';
import happyHourImg from '../assets/images/regenerated_image_1787855843489.png';

interface HappyHourCardProps {
  nowInfo: SaoPauloTimeInfo;
  onOpenScheduleModal?: () => void;
}

export const HappyHourCard: React.FC<HappyHourCardProps> = ({ nowInfo, onOpenScheduleModal }) => {
  const statusResult = getHappyHourStatus(nowInfo);

  return (
    <div
      id="happy-hour-card"
      className="relative overflow-hidden bg-gradient-to-br from-[#13151A] via-[#0F1014] to-[#0A0B0D] border border-[#262933] hover:border-[#C58A3A]/40 rounded-2xl p-5 sm:p-6 transition-all duration-300 shadow-xl group flex flex-col justify-between"
    >
      {/* Ambient background gold glow */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#C58A3A]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#C58A3A]/15 transition-all duration-500" />

      {/* Top bar: Category label + Dynamic Status Badge */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-[#C58A3A] uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#C58A3A]" />
            <span>Destaque Exclusivo</span>
          </div>

          {/* Dynamic Happy Hour Status Indicator */}
          <div
            id="happy-hour-status-badge"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              statusResult.isHappeningNow
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 animate-pulse'
                : statusResult.status === 'upcoming_today'
                ? 'bg-[#C58A3A]/15 border-[#C58A3A]/40 text-[#DFAC62]'
                : 'bg-[#181B22] border-[#2B2F3A] text-[#8E94A4]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                statusResult.isHappeningNow
                  ? 'bg-emerald-400'
                  : statusResult.status === 'upcoming_today'
                  ? 'bg-[#DFAC62]'
                  : 'bg-[#676C7C]'
              }`}
            />
            <span className="truncate">{statusResult.badgeText}</span>
          </div>
        </div>

        {/* Product Image above text */}
        <div className="relative w-full h-36 sm:h-44 rounded-xl overflow-hidden mb-4 border border-[#262A34] group/img shadow-inner">
          <img
            id="happy-hour-product-image"
            src={happyHourImg}
            alt="Drinks e Chopp no Happy Hour Onze"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1014] via-black/20 to-transparent pointer-events-none" />
          
          {/* Subtle overlay badge */}
          <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-[#F4F2ED]">
            <GlassWater className="w-3 h-3 text-[#DFAC62]" />
            <span>Drinks & Chopps Artesanais</span>
          </div>
        </div>

        {/* Card Main Title */}
        <div className="mb-2">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F4F2ED] flex items-center gap-2">
            <span>Happy Hour Onze</span>
          </h3>
        </div>

        {/* Time highlight banner */}
        <div className="my-3.5 p-3 rounded-xl bg-[#16181F]/90 border border-[#262934] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C58A3A]/10 border border-[#C58A3A]/25 flex items-center justify-center text-[#C58A3A]">
              <GlassWater className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#7E8494] font-medium">Dias & Horário</div>
              <div className="text-xs sm:text-sm font-semibold text-[#F4F2ED]">Segunda a Sexta</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm sm:text-base font-bold text-[#DFAC62] font-mono tracking-tight">16h — 20h</div>
          </div>
        </div>
      </div>

      {/* Button to view all 7 days modal in Happy Hour footer */}
      <div className="pt-2 border-t border-[#1C1F27]">
        <button
          id="happy-hour-full-schedule-btn"
          onClick={onOpenScheduleModal}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#171920] hover:bg-[#1E212A] border border-[#282B36] hover:border-[#3D4252] text-[#D0D4DE] hover:text-[#F4F2ED] text-xs sm:text-sm font-medium transition-all group/btn cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-[#C58A3A]" />
            <span>Ver todos os horários da semana</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#7E8494] group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
