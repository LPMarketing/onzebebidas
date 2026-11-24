import React, { useEffect } from 'react';
import { X, Clock, Calendar, Sparkles } from 'lucide-react';
import { BUSINESS_HOURS, DaySchedule } from '../data/businessSchedule';

interface BusinessHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDayIndex: number;
}

export const BusinessHoursModal: React.FC<BusinessHoursModalProps> = ({
  isOpen,
  onClose,
  currentDayIndex,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="business-hours-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="business-hours-modal-content"
        className="relative w-full max-w-lg bg-[#111214] border border-[#2A2D35] rounded-2xl shadow-2xl overflow-hidden animate-scale-up text-[#F4F2ED]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#22242A] bg-[#14161A]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C58A3A]/10 border border-[#C58A3A]/30 flex items-center justify-center text-[#C58A3A]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#F4F2ED] tracking-wide">
                Horários de Funcionamento
              </h3>
              <p className="text-xs text-[#8A8F9D]">Programação semanal da Onze Lounge</p>
            </div>
          </div>
          <button
            id="close-hours-modal-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#1A1C22] hover:bg-[#22252D] border border-[#2A2D35] text-[#8A8F9D] hover:text-[#F4F2ED] flex items-center justify-center transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Schedule List */}
        <div className="p-5 sm:p-6 space-y-2.5 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {BUSINESS_HOURS.map((schedule: DaySchedule) => {
            const isToday = schedule.dayIndex === currentDayIndex;
            return (
              <div
                key={schedule.dayIndex}
                id={`schedule-row-${schedule.dayIndex}`}
                className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all ${
                  isToday
                    ? 'bg-[#C58A3A]/10 border-[#C58A3A]/40 text-[#F4F2ED] shadow-sm shadow-[#C58A3A]/5'
                    : 'bg-[#15171C] border-[#20232A] text-[#9A9FAc] hover:border-[#2A2D36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md border ${
                      isToday
                        ? 'bg-[#C58A3A] text-black border-[#C58A3A]'
                        : 'bg-[#1E2128] text-[#7A8090] border-[#2A2D38]'
                    }`}
                  >
                    {schedule.dayShort}
                  </span>
                  <span className={`text-sm font-medium ${isToday ? 'text-[#F4F2ED] font-semibold' : 'text-[#D0D4DE]'}`}>
                    {schedule.dayName}
                  </span>
                  {isToday && (
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-[#C58A3A]/20 text-[#DFAC62] px-2 py-0.5 rounded-full border border-[#C58A3A]/30">
                      Hoje
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className={`text-sm font-semibold tracking-wide ${isToday ? 'text-[#DFAC62]' : 'text-[#E2E4EB]'}`}>
                    {schedule.displayHours}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Happy hour reminder note */}
          <div className="mt-4 p-3.5 rounded-xl bg-[#C58A3A]/5 border border-[#C58A3A]/20 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#C58A3A] shrink-0" />
            <div className="text-xs text-[#C58A3A]">
              <span className="font-semibold text-[#DFAC62]">Happy Hour Onze:</span> Segunda a sexta-feira, das 16h às 20h.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#22242A] bg-[#14161A]/80 flex justify-end">
          <button
            id="close-hours-modal-footer-btn"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#1E2128] hover:bg-[#282C36] text-[#F4F2ED] text-sm font-medium rounded-xl border border-[#2A2D38] transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
