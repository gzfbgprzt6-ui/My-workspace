import {
  LayoutDashboard, Inbox, SquareCheck, CalendarDays, FolderKanban, StickyNote, Wallet, CalendarCheck, Settings,
  type LucideIcon,
} from 'lucide-react';
import type { Tone } from './types';

export type Route = 'pocetna' | 'ulazni' | 'zadaci' | 'kalendar' | 'projekti' | 'biljeske' | 'financije' | 'tjedni-pregled' | 'postavke';

export const NAV: { route: Route; label: string; icon: LucideIcon; tone?: Tone }[] = [
  { route: 'pocetna', label: 'Nadzorna ploča', icon: LayoutDashboard },
  { route: 'ulazni', label: 'Ulazni spremnik', icon: Inbox },
  { route: 'zadaci', label: 'Zadaci', icon: SquareCheck, tone: 'mint' },
  { route: 'kalendar', label: 'Kalendar', icon: CalendarDays, tone: 'sky' },
  { route: 'projekti', label: 'Projekti', icon: FolderKanban, tone: 'lav' },
  { route: 'biljeske', label: 'Bilješke', icon: StickyNote, tone: 'butter' },
  { route: 'financije', label: 'Financije', icon: Wallet, tone: 'peach' },
  { route: 'tjedni-pregled', label: 'Tjedni pregled', icon: CalendarCheck },
  { route: 'postavke', label: 'Postavke', icon: Settings },
];

export const isRoute = (s: string): s is Route => NAV.some((n) => n.route === s);
export const go = (r: Route) => {
  window.location.hash = r;
};
