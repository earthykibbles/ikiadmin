'use client';

import {
  Activity,
  Apple,
  Award,
  BarChart3,
  Brain,
  ClipboardList,
  Compass,
  DollarSign,
  Droplet,
  Heart,
  MessageSquare,
  Music,
  Shield,
  Stethoscope,
  Target,
  Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePermissions } from '@/components/PermissionsProvider';
import { RBAC_ACTIONS, RBAC_RESOURCES } from '@/lib/permissions';

export type DataModelView =
  | 'analytics'
  | 'providers'
  | 'finance'
  | 'users'
  | 'fitness'
  | 'nutrition'
  | 'mood'
  | 'water'
  | 'mindfulness'
  | 'mindfulnessContent'
  | 'goals'
  | 'wellsphere'
  | 'onboarding'
  | 'points'
  | 'connect'
  | 'explore'
  | 'security'
  | 'activityLog'
  | 'sessions';

interface AdminNavbarProps {
  currentView: DataModelView;
  onViewChange: (view: DataModelView) => void;
}

interface NavItem {
  id: DataModelView;
  label: string;
  icon: React.ReactNode;
  category?: 'primary' | 'secondary';
}

const navItems: NavItem[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 className="w-4 h-4" />,
    category: 'primary',
  },
  {
    id: 'providers',
    label: 'Providers',
    icon: <Stethoscope className="w-4 h-4" />,
    category: 'primary',
  },
  {
    id: 'users',
    label: 'Users',
    icon: <Users className="w-4 h-4" />,
    category: 'primary',
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
    id: 'mindfulnessContent',
    label: 'Mindfulness Content',
    icon: <Music className="w-4 h-4" />,
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
  {
    id: 'security',
    label: 'Security',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    id: 'activityLog',
    label: 'Activity',
    icon: <ClipboardList className="w-4 h-4" />,
  },
  {
    id: 'sessions',
    label: 'Sessions',
    icon: <Activity className="w-4 h-4" />,
  },
];

const viewToResource: Partial<Record<DataModelView, string>> = {
  analytics: RBAC_RESOURCES.ANALYTICS,
  providers: RBAC_RESOURCES.PROVIDERS,
  users: RBAC_RESOURCES.USERS,
  finance: RBAC_RESOURCES.FINANCE,
  fitness: RBAC_RESOURCES.FITNESS,
  nutrition: RBAC_RESOURCES.NUTRITION,
  mood: RBAC_RESOURCES.MOOD,
  water: RBAC_RESOURCES.WATER,
  mindfulness: RBAC_RESOURCES.MINDFULNESS,
  mindfulnessContent: RBAC_RESOURCES.MINDFULNESS,
  goals: RBAC_RESOURCES.FINANCE,
  wellsphere: RBAC_RESOURCES.WELLSPHERE,
  onboarding: RBAC_RESOURCES.ONBOARDING,
  points: RBAC_RESOURCES.POINTS,
  connect: RBAC_RESOURCES.POSTS,
  explore: RBAC_RESOURCES.EXPLORE,
  security: RBAC_RESOURCES.SECURITY,
  activityLog: RBAC_RESOURCES.SECURITY,
  sessions: RBAC_RESOURCES.SECURITY,
};

export default function AdminNavbar({ currentView, onViewChange }: AdminNavbarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);
  const { can } = usePermissions();

  const visibleItems = navItems.filter((item) => {
    const resource = viewToResource[item.id];
    if (!resource) return true;
    return can(resource, RBAC_ACTIONS.READ);
  });

  // If current view is not permitted, snap to first allowed view.
  useEffect(() => {
    if (visibleItems.length === 0) return;
    if (visibleItems.some((i) => i.id === currentView)) return;
    onViewChange(visibleItems[0].id);
  }, [currentView, onViewChange, visibleItems]);

  // Scroll active item into view
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentView changes determine active ref.
  useEffect(() => {
    if (activeButtonRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const button = activeButtonRef.current;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();

      const scrollLeft =
        container.scrollLeft +
        (buttonRect.left - containerRect.left) -
        containerRect.width / 2 +
        buttonRect.width / 2;

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }
  }, [currentView]);

  // Check scroll position for shadow indicators
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      setShowLeftShadow(container.scrollLeft > 0);
      setShowRightShadow(container.scrollLeft < container.scrollWidth - container.clientWidth - 1);
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  return (
    <nav className="relative mb-8">
      {/* Shadow indicators */}
      {showLeftShadow && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-dark-blue via-dark-blue/80 to-transparent pointer-events-none z-10 rounded-l-xl" />
      )}
      {showRightShadow && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-dark-blue via-dark-blue/80 to-transparent pointer-events-none z-10 rounded-r-xl" />
      )}

      <div
        ref={scrollContainerRef}
        className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2 px-1"
      >
        {visibleItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              ref={isActive ? activeButtonRef : null}
              onClick={() => onViewChange(item.id)}
              className={`
                group relative flex items-center gap-2.5 px-5 py-3 rounded-xl font-tsukimi font-semibold body-sm whitespace-nowrap
                transition-all duration-300 ease-out
                flex-shrink-0
                ${
                  isActive
                    ? 'bg-gradient-to-br from-light-green/25 via-light-green/15 to-light-green/5 text-light-green border-2 border-light-green/50 shadow-xl shadow-light-green/20 scale-105'
                    : 'bg-iki-grey/30 text-iki-white/70 border border-light-green/10 hover:bg-iki-grey/50 hover:text-iki-white hover:border-light-green/30 hover:scale-[1.02] active:scale-95'
                }
              `}
            >
              {/* Active indicator glow */}
              {isActive && (
                <>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-light-green/20 via-light-green/10 to-transparent opacity-60 blur-sm" />
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-light-green to-transparent rounded-full" />
                </>
              )}

              {/* Icon with animation */}
              <span
                className={`
                  relative z-10 transition-transform duration-300
                  ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                `}
              >
                {item.icon}
              </span>

              {/* Label */}
              <span className="relative z-10">{item.label}</span>

              {/* Hover effect */}
              {!isActive && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-light-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
