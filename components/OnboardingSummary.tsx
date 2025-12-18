'use client';

import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  MessageSquare,
  Ruler,
  Settings,
  Sparkles,
  Stethoscope,
  Tag,
  Target,
  User,
  UtensilsCrossed,
  Weight,
  XCircle,
} from 'lucide-react';

interface NutritionOnboarding {
  targetWeightKg?: number;
  goal?: string;
  sex?: string;
  prefersPersonalTouch?: boolean;
  heightCm?: number;
  favoriteFoods?: string[];
  isHealthy?: boolean;
  currentWeightKg?: number;
  targetHeightCm?: number;
  name?: string;
  activityLevel?: string;
  age?: number;
  completedAt?: string;
  complete?: boolean;
}

interface WellsphereOnboarding {
  onboarding_finished?: boolean;
  createdAt?: string;
  care_manager_id?: string;
  condition?: string;
  responses?: Array<{
    answers: string[];
    question_id: number;
    question: string;
  }>;
  updatedAt?: string;
}

interface EnhancedInterests {
  initialize?: string;
  [key: string]: any; // For dynamic interest keys
}

type EnhancedInterestsData = EnhancedInterests | string[] | null;

interface OnboardingSummaryProps {
  nutritionOnboarding?: NutritionOnboarding | null;
  wellsphereOnboarding?: WellsphereOnboarding | null;
  enhancedInterests?: EnhancedInterestsData;
}

export default function OnboardingSummary({
  nutritionOnboarding,
  wellsphereOnboarding,
  enhancedInterests,
}: OnboardingSummaryProps) {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getCategoryColor = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('cardio')) return 'text-red-400';
    if (lower.includes('strength')) return 'text-orange-400';
    if (lower.includes('flexibility')) return 'text-purple-400';
    if (lower.includes('mindfulness')) return 'text-teal-400';
    return 'text-blue-400';
  };

  const getCategoryBgColor = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('cardio')) return 'bg-red-400/10 border-red-400/30';
    if (lower.includes('strength')) return 'bg-orange-400/10 border-orange-400/30';
    if (lower.includes('flexibility')) return 'bg-purple-400/10 border-purple-400/30';
    if (lower.includes('mindfulness')) return 'bg-teal-400/10 border-teal-400/30';
    return 'bg-blue-400/10 border-blue-400/30';
  };

  return (
    <div className="space-y-6">
      {/* Nutrition Onboarding Section */}
      {nutritionOnboarding && (
        <div className="glass rounded-3xl p-6 border border-light-green/10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-light-green/20 flex items-center justify-center border border-light-green/30">
              <UtensilsCrossed className="w-7 h-7 text-light-green" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-iki-white mb-1">Nutrition Onboarding</h3>
              <p className="text-sm text-iki-white/60">
                Status:{' '}
                {nutritionOnboarding.complete ? (
                  <span className="text-light-green flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Complete
                  </span>
                ) : (
                  <span className="text-iki-white/40 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Incomplete
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Personal Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {nutritionOnboarding.name && (
                <div className="bg-iki-grey/30 rounded-xl p-4 border border-light-green/10">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-light-green" />
                    <span className="text-xs font-semibold text-iki-white/60">Name</span>
                  </div>
                  <p className="text-iki-white font-semibold">{nutritionOnboarding.name}</p>
                </div>
              )}
              {nutritionOnboarding.age && (
                <div className="bg-iki-grey/30 rounded-xl p-4 border border-light-green/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-light-green" />
                    <span className="text-xs font-semibold text-iki-white/60">Age</span>
                  </div>
                  <p className="text-iki-white font-semibold">{nutritionOnboarding.age} years</p>
                </div>
              )}
              {nutritionOnboarding.sex && (
                <div className="bg-iki-grey/30 rounded-xl p-4 border border-light-green/10">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-light-green" />
                    <span className="text-xs font-semibold text-iki-white/60">Sex</span>
                  </div>
                  <p className="text-iki-white font-semibold uppercase">
                    {nutritionOnboarding.sex}
                  </p>
                </div>
              )}
              {nutritionOnboarding.goal && (
                <div className="bg-iki-grey/30 rounded-xl p-4 border border-light-green/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-light-green" />
                    <span className="text-xs font-semibold text-iki-white/60">Goal</span>
                  </div>
                  <p className="text-iki-white font-semibold uppercase">
                    {nutritionOnboarding.goal}
                  </p>
                </div>
              )}
            </div>

            {/* Physical Stats */}
            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
              <h4 className="text-sm font-semibold text-light-green mb-3 uppercase tracking-wide">
                Physical Stats
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {nutritionOnboarding.heightCm && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Ruler className="w-4 h-4 text-iki-white/60" />
                      <span className="text-xs text-iki-white/60">Height</span>
                    </div>
                    <p className="text-iki-white font-semibold">
                      {nutritionOnboarding.heightCm} cm
                    </p>
                  </div>
                )}
                {nutritionOnboarding.currentWeightKg && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Weight className="w-4 h-4 text-iki-white/60" />
                      <span className="text-xs text-iki-white/60">Current Weight</span>
                    </div>
                    <p className="text-iki-white font-semibold">
                      {nutritionOnboarding.currentWeightKg} kg
                    </p>
                  </div>
                )}
                {nutritionOnboarding.targetWeightKg && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-iki-white/60" />
                      <span className="text-xs text-iki-white/60">Target Weight</span>
                    </div>
                    <p className="text-iki-white font-semibold">
                      {nutritionOnboarding.targetWeightKg} kg
                    </p>
                  </div>
                )}
              </div>
              {nutritionOnboarding.activityLevel && (
                <div className="mt-3 pt-3 border-t border-light-green/10">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-iki-white/60" />
                    <span className="text-xs text-iki-white/60">Activity Level:</span>
                    <span className="text-iki-white font-semibold">
                      {nutritionOnboarding.activityLevel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Favorite Foods */}
            {nutritionOnboarding.favoriteFoods && nutritionOnboarding.favoriteFoods.length > 0 && (
              <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                <h4 className="text-sm font-semibold text-light-green mb-3 uppercase tracking-wide">
                  Favorite Foods
                </h4>
                <div className="flex flex-wrap gap-2">
                  {nutritionOnboarding.favoriteFoods.map((food, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-full bg-light-green/10 border border-light-green/30 text-light-green text-sm font-medium"
                    >
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-iki-grey/30 rounded-xl p-4 border border-light-green/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2
                    className={`w-4 h-4 ${nutritionOnboarding.isHealthy ? 'text-green-400' : 'text-iki-white/40'}`}
                  />
                  <span className="text-xs font-semibold text-iki-white/60">Health Status</span>
                </div>
                <p className="text-iki-white font-semibold">
                  {nutritionOnboarding.isHealthy ? 'Healthy' : 'Not specified'}
                </p>
              </div>
              <div className="bg-iki-grey/30 rounded-xl p-4 border border-light-green/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles
                    className={`w-4 h-4 ${nutritionOnboarding.prefersPersonalTouch ? 'text-light-green' : 'text-iki-white/40'}`}
                  />
                  <span className="text-xs font-semibold text-iki-white/60">Personal Touch</span>
                </div>
                <p className="text-iki-white font-semibold">
                  {nutritionOnboarding.prefersPersonalTouch ? 'Preferred' : 'Not preferred'}
                </p>
              </div>
            </div>

            {/* Completion Date */}
            {nutritionOnboarding.completedAt && (
              <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-iki-white/60" />
                  <span className="text-xs text-iki-white/60">Completed At:</span>
                  <span className="text-iki-white font-semibold">
                    {formatDate(nutritionOnboarding.completedAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wellsphere Onboarding Section */}
      {wellsphereOnboarding && (
        <div className="glass rounded-3xl p-6 border border-light-green/10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
              <Heart className="w-7 h-7 text-pink-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-iki-white mb-1">Wellsphere Onboarding</h3>
              <p className="text-sm text-iki-white/60">
                Status:{' '}
                {wellsphereOnboarding.onboarding_finished ? (
                  <span className="text-pink-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Completed
                  </span>
                ) : (
                  <span className="text-iki-white/40 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Incomplete
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Condition */}
            {wellsphereOnboarding.condition && (
              <div className="bg-pink-500/10 rounded-xl p-4 border border-pink-500/30">
                <div className="flex items-center gap-3">
                  <Stethoscope className="w-5 h-5 text-pink-400" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-iki-white/60 mb-1 uppercase tracking-wide">
                      Primary Condition
                    </p>
                    <p className="text-iki-white font-semibold text-lg">
                      {wellsphereOnboarding.condition}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Care Manager */}
            {wellsphereOnboarding.care_manager_id && (
              <div className="bg-iki-grey/30 rounded-xl p-4 border border-light-green/10">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-light-green" />
                  <span className="text-xs font-semibold text-iki-white/60">Care Manager</span>
                </div>
                <p className="text-iki-white font-semibold">
                  {wellsphereOnboarding.care_manager_id === 'nocaremanager'
                    ? 'No Care Manager'
                    : wellsphereOnboarding.care_manager_id}
                </p>
              </div>
            )}

            {/* Questionnaire Responses */}
            {wellsphereOnboarding.responses && wellsphereOnboarding.responses.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-pink-400 mb-3 uppercase tracking-wide">
                  Questionnaire Responses ({wellsphereOnboarding.responses.length})
                </h4>
                {wellsphereOnboarding.responses.map((response, idx) => (
                  <div
                    key={idx}
                    className="bg-iki-grey/20 rounded-xl p-4 border border-pink-500/20"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-pink-500/20 flex items-center justify-center border border-pink-500/30 flex-shrink-0">
                        <span className="text-xs font-bold text-pink-400">
                          {response.question_id || idx + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-iki-white font-semibold text-sm mb-2">
                          {response.question}
                        </p>
                        {response.answers && response.answers.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {response.answers.map((answer, answerIdx) => (
                              <span
                                key={answerIdx}
                                className="px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-sm font-medium"
                              >
                                {answer}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-light-green/10">
              {wellsphereOnboarding.createdAt && (
                <div className="bg-iki-grey/20 rounded-xl p-3 border border-light-green/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-iki-white/60" />
                    <span className="text-xs text-iki-white/60">Created At</span>
                  </div>
                  <p className="text-iki-white text-sm font-semibold">
                    {formatDate(wellsphereOnboarding.createdAt)}
                  </p>
                </div>
              )}
              {wellsphereOnboarding.updatedAt && (
                <div className="bg-iki-grey/20 rounded-xl p-3 border border-light-green/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-iki-white/60" />
                    <span className="text-xs text-iki-white/60">Updated At</span>
                  </div>
                  <p className="text-iki-white text-sm font-semibold">
                    {formatDate(wellsphereOnboarding.updatedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Interests Section */}
      {enhancedInterests && (
        <div className="glass rounded-3xl p-6 border border-light-green/10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <Sparkles className="w-7 h-7 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-iki-white mb-1">Enhanced Interests</h3>
              <p className="text-sm text-iki-white/60">From UserTags Collection</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Initialize Status */}
            {enhancedInterests &&
              typeof enhancedInterests === 'object' &&
              !Array.isArray(enhancedInterests) &&
              enhancedInterests.initialize && (
                <div className="bg-iki-grey/30 rounded-xl p-4 border border-light-green/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-light-green" />
                    <span className="text-xs font-semibold text-iki-white/60">Status</span>
                  </div>
                  <p className="text-iki-white font-semibold uppercase">
                    {enhancedInterests.initialize}
                  </p>
                </div>
              )}

            {/* Grouped Interests by Category */}
            {(() => {
              const interests: Array<{ name: string; category: string; selected: boolean }> = [];

              // Handle userTags format (object with dynamic keys)
              if (typeof enhancedInterests === 'object' && !Array.isArray(enhancedInterests)) {
                Object.keys(enhancedInterests).forEach((key) => {
                  if (
                    key !== 'initialize' &&
                    enhancedInterests[key] &&
                    typeof enhancedInterests[key] === 'object'
                  ) {
                    const interest = enhancedInterests[key] as any;
                    if (interest.selected && interest.name) {
                      interests.push({
                        name: interest.name,
                        category: interest.category || 'General',
                        selected: interest.selected,
                      });
                    }
                  }
                });
              }

              // Handle array format (from enhancedInterests in onboardingData)
              if (Array.isArray(enhancedInterests)) {
                enhancedInterests.forEach((interest: any) => {
                  if (typeof interest === 'string') {
                    interests.push({
                      name: interest,
                      category: 'General',
                      selected: true,
                    });
                  } else if (interest?.name) {
                    interests.push({
                      name: interest.name,
                      category: interest.category || 'General',
                      selected: interest.selected !== false,
                    });
                  }
                });
              }

              if (interests.length === 0) {
                return (
                  <div className="text-center py-8 text-iki-white/60">No interests selected</div>
                );
              }

              // Group by category
              const grouped = interests.reduce(
                (acc, interest) => {
                  const category = interest.category;
                  if (!acc[category]) {
                    acc[category] = [];
                  }
                  acc[category].push(interest);
                  return acc;
                },
                {} as Record<string, typeof interests>
              );

              return (
                <div className="space-y-4">
                  {Object.entries(grouped).map(([category, categoryInterests]) => (
                    <div
                      key={category}
                      className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10"
                    >
                      <h4
                        className={`text-xs font-bold mb-3 uppercase tracking-wider ${getCategoryColor(category)}`}
                      >
                        {category}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {categoryInterests.map((interest, idx) => (
                          <span
                            key={idx}
                            className={`px-3 py-1.5 rounded-full border text-sm font-medium flex items-center gap-1.5 ${getCategoryBgColor(category)} ${getCategoryColor(category)}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {interest.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!nutritionOnboarding && !wellsphereOnboarding && !enhancedInterests && (
        <div className="glass rounded-3xl p-12 border border-light-green/10 text-center">
          <MessageSquare className="w-16 h-16 text-iki-white/30 mx-auto mb-4" />
          <p className="text-iki-white/60 text-lg">No onboarding data available</p>
        </div>
      )}
    </div>
  );
}
