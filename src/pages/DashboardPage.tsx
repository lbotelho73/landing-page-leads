
import { useState } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { ptBR } from '@/lib/i18n';
import { DashboardStatCards } from '@/components/dashboard/DashboardStatCards';
import { AppointmentsSchedule } from '@/components/dashboard/AppointmentsSchedule';
import { DashboardCalendar } from '@/components/dashboard/DashboardCalendar';
import { TeamMembersCard } from '@/components/dashboard/TeamMembersCard';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function DashboardPage() {
  const {
    newCustomers,
    appointments,
    scheduledAppointments,
    todayRevenue,
    averageTicket,
    loading,
    timeRange,
    setTimeRange
  } = useDashboardData("day");

  const [date, setDate] = useState<Date>(new Date());

  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{ptBR.dashboard}</h1>
          
          <div>
            <PeriodSelector 
              value={timeRange} 
              onChange={setTimeRange}
            />
          </div>
        </div>
        
        <DashboardStatCards
          newCustomers={newCustomers}
          appointmentsCount={appointments.length}
          revenue={todayRevenue}
          averageTicket={averageTicket}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AppointmentsSchedule 
            appointments={scheduledAppointments}
            loading={loading}
          />
          
          <DashboardCalendar 
            initialDate={date}
            onDateSelected={setDate}
          />
        </div>
        
        <TeamMembersCard />
      </div>
    </AppLayout>
  );
}
