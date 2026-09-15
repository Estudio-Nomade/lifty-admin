import { ClipboardList, Fuel, Percent, Users, type LucideIcon } from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Pendientes', icon: ClipboardList },
  { to: '/drivers', label: 'Conductores', icon: Users },
  { to: '/commission', label: 'Comisiones', icon: Percent },
  { to: '/fuel-price', label: 'Combustible / Tarifas', icon: Fuel },
];
