'use client';

import { DollarSign, Users, Activity, Heart, Droplet, Apple, Target, Brain, Stethoscope, BarChart3, ClipboardList, Award, MessageSquare, Compass } from 'lucide-react';

export type DataModelView = 'analytics' | 'finance' | 'users' | 'fitness' | 'nutrition' | 'mood' | 'water' | 'mindfulness' | 'goals' | 'wellsphere' | 'onboarding' | 'points' | 'connect' | 'explore';

interface AdminNavbarProps {
  currentView: DataModelView;
  onViewChange: (view: DataModelView) => void;
}

interface NavItem {
  id: DataModelView;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    id: 'users',
    label: 'Users',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: <DollarSign className="w-4 h-4" />,
  },
  {
    id: 'fitness',
    label: 'Fitness',
    icon: <Activity className="w-4 h-4" />,
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    icon: <Apple className="w-4 h-4" />,
  },
  {
    id: 'mood',
    label: 'Mood',
    icon: <Heart className="w-4 h-4" />,
  },
  {
    id: 'water',
    label: 'Water',
    icon: <Droplet className="w-4 h-4" />,
  },
  {
    id: 'mindfulness',
    label: 'Mindfulness',
    icon: <Brain className="w-4 h-4" />,
  },
  {
    id: 'goals',
    label: 'Goals',
    icon: <Target className="w-4 h-4" />,
  },
  {
    id: 'wellsphere',
    label: 'Wellsphere',
    icon: <Stethoscope className="w-4 h-4" />,
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    icon: <ClipboardList className="w-4 h-4" />,
  },
  {
    id: 'points',
    label: 'Points',
    icon: <Award className="w-4 h-4" />,
  },
  {
    id: 'connect',
    label: 'Connect',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: <Compass className="w-4 h-4" />,
  },
];

export default function AdminNavbar({ currentView, onViewChange }: AdminNavbarProps) {
  return (
    <nav className="glass rounded-2xl p-2 border border-light-green/10 mb-6">
      <div className="flex items-center gap-2 overflow-x-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl font-tsukimi font-medium body-sm whitespace-nowrap
              transition-all duration-200
              ${
                currentView === item.id
                  ? 'bg-light-green/20 text-light-green border-2 border-light-green/50 shadow-lg shadow-light-green/10'
                  : 'bg-iki-grey/20 text-iki-white/70 border border-light-green/10 hover:bg-iki-grey/30 hover:text-iki-white'
              }
            `}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

