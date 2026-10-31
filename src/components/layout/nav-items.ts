import {
  Building2,
  ClipboardList,
  Fuel,
  LayoutDashboard,
  MapPinned,
  Percent,
  Receipt,
  Route,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard },
  { to: '/pending', label: 'Pendientes', icon: ClipboardList },
  { to: '/drivers', label: 'Conductores', icon: Users },
  { to: '/trips', label: 'Viajes', icon: Route },
  { to: '/service-markets', label: 'Mercados', icon: Building2 },
  { to: '/transit-operators', label: 'Operadores tránsito', icon: MapPinned },
  { to: '/commission', label: 'Comisiones', icon: Percent },
  { to: '/commission/receipts', label: 'Comprobantes comisión', icon: Receipt },
  { to: '/fuel-price', label: 'Combustible / Tarifas', icon: Fuel },
];
