export type NotificationTypeOption = {
  value: string; // matches Flutter NavigationHandler 'type'
  label: string;
  category: 'core' | 'engagement' | 'connect' | 'finance' | 'wellsphere' | 'mindscape' | 'water' | 'nutrition' | 'fitness';
};

// Keep aligned with Flutter NavigationHandler.navigateToPage() routes.
export const NOTIFICATION_TYPES: NotificationTypeOption[] = [
  { value: 'iki_home', label: 'Home', category: 'core' },
  { value: 'notifications', label: 'Notifications page', category: 'core' },

  { value: 'water_general', label: 'Water - Add/Log', category: 'water' },
  { value: 'water_reminder', label: 'Water - Reminder', category: 'water' },
  { value: 'water_challenges', label: 'Water - Challenges', category: 'water' },
  { value: 'water_progress', label: 'Water - Progress', category: 'water' },

  { value: 'mindscape_mood', label: 'Mood', category: 'mindscape' },
  { value: 'mindscape_journal', label: 'Journal', category: 'mindscape' },
  { value: 'mindscape_gratitude', label: 'Gratitude', category: 'mindscape' },
  { value: 'mindscape_general', label: 'Mindscape - Home', category: 'mindscape' },
  { value: 'mindscape_therapy', label: 'Therapy', category: 'mindscape' },

  { value: 'wellsphere_general', label: 'Wellsphere - Home', category: 'wellsphere' },
  { value: 'wellsphere_symptoms', label: 'Wellsphere - Symptoms', category: 'wellsphere' },
  { value: 'wellsphere_drugs', label: 'Wellsphere - Drugs', category: 'wellsphere' },
  { value: 'wellsphere_appointments', label: 'Wellsphere - Appointments', category: 'wellsphere' },
  { value: 'wellsphere_condition', label: 'Wellsphere - Condition', category: 'wellsphere' },
  { value: 'wellsphere_insights', label: 'Wellsphere - Insights', category: 'wellsphere' },

  { value: 'nutrition_general', label: 'Nutrition - Entry', category: 'nutrition' },
  { value: 'nutrition_home', label: 'Nutrition - Home', category: 'nutrition' },

  { value: 'fitness_general', label: 'Fitness - Entry', category: 'fitness' },
  { value: 'fitness_compete', label: 'Fitness - Leaderboard', category: 'fitness' },
  { value: 'fitness_profile', label: 'Fitness - Profile', category: 'fitness' },
  { value: 'fitness_store', label: 'Fitness - Store', category: 'fitness' },
  { value: 'fitness_stats', label: 'Fitness - Stats', category: 'fitness' },

  { value: 'finance_tips', label: 'Finance - Tips', category: 'finance' },
  { value: 'finance_news', label: 'Finance - News', category: 'finance' },
  { value: 'finance_investment', label: 'Finance - Investment', category: 'finance' },
  { value: 'finance_tracker', label: 'Finance - Tracker', category: 'finance' },
  { value: 'finance_general', label: 'Finance - General', category: 'finance' },
  { value: 'finance_adviser', label: 'Finance - Adviser', category: 'finance' },

  // Connect push types (handled in NavigationHandler too)
  { value: 'connect_chat', label: 'Connect - Chat', category: 'connect' },
  { value: 'connect_comment', label: 'Connect - Comment', category: 'connect' },
  { value: 'connect_like', label: 'Connect - Like', category: 'connect' },
  { value: 'connect_general', label: 'Connect - General', category: 'connect' },
  { value: 'connect_friend_request', label: 'Connect - Friend request', category: 'connect' },
  { value: 'connect_single_post', label: 'Connect - Post', category: 'connect' },
];




