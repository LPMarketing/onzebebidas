import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { getSaoPauloNow, SaoPauloTimeInfo } from '../data/businessSchedule';
import { HappyHourCard } from './HappyHourCard';
import { BusinessStatusCard } from './BusinessStatusCard';
import { BusinessHoursModal } from './BusinessHoursModal';

export const HojeNaOnzeSection: React.FC = () => {
  const [nowInfo, setNowInfo] = useState<SaoPauloTimeInfo>(() => getSaoPauloNow());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Update time every 30 seconds to keep dynamic badges in sync with real-time
  useEffect(() => {
    const interval = setInterval(() => {
      setNowInfo(getSaoPauloNow());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="hoje-na-onze-section" className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-[#C58A3A]" />
        <h2 className="text-xs sm:text-sm font-bold tracking-widest text-[#9A9FAc] uppercase">
          Hoje na Onze
        </h2>
      </div>

      {/* Cards Layout: 2 columns on desktop, 1 column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HappyHourCard
          nowInfo={nowInfo}
          onOpenScheduleModal={() => setIsModalOpen(true)}
        />
        <BusinessStatusCard nowInfo={nowInfo} />
      </div>

      {/* Weekly Schedule Modal */}
      <BusinessHoursModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentDayIndex={nowInfo.dayOfWeek}
      />
    </section>
  );
};
