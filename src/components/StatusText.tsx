import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, PowerOff, Wrench } from 'lucide-react';
import type { MachineStatus, MaintenanceStatus } from '../types/vendtrack.ts';

export function MachineStatusLabel({ status }: { status: MachineStatus }) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D] whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Active</span>
      </span>
    );
  }
  if (status === 'Under Maintenance') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309] whitespace-nowrap">
        <Wrench className="w-3.5 h-3.5 shrink-0" />
        <span>Under Maintenance</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B91C1C] whitespace-nowrap">
      <PowerOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline</span>
    </span>
  );
}

export function MaintenanceStatusLabel({ status }: { status: MaintenanceStatus }) {
  if (status === 'Resolved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D] whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Resolved</span>
      </span>
    );
  }
  if (status === 'In Progress') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309] whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>In Progress</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B91C1C] whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>Open</span>
    </span>
  );
}
