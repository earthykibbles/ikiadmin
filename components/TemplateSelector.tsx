import { cn } from '@/lib/utils';
import { Template, type TemplateIcon } from '@/lib/types';
import { Activity, Apple, Brain, Sparkles, Stethoscope } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  templates: Template[];
  onSelect: (template: Template) => void;
  selectedTemplateId?: string;
}

const iconMap: Record<TemplateIcon, ReactNode> = {
  conditions: <Stethoscope className="w-5 h-5" />,
  fitness: <Activity className="w-5 h-5" />,
  nutrition: <Apple className="w-5 h-5" />,
  mindfulness: <Brain className="w-5 h-5" />,
  custom: <Sparkles className="w-5 h-5" />,
};

export default function TemplateSelector({ templates, onSelect, selectedTemplateId }: Props) {
  const allTemplates: Template[] = [
    ...templates,
    {
      id: 'custom',
      name: 'Custom',
      description: 'Start from scratch',
      icon: 'custom',
      config: {},
    },
  ];

  return (
    <section className="card card-hover glow-green">
      <div className="section-header">
        <h2 className="heading-md font-goldplay text-gradient-brown">Templates</h2>
        <p className="body-sm text-iki-white/60 max-w-3xl">
          Choose a starting point for schema, prompts, and output destination. You can always tweak the
          configuration below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {allTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          return (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={cn(
              'group text-left relative overflow-hidden rounded-2xl transition-all duration-300',
              'bg-gradient-to-br from-iki-grey/60 to-dark-blue/70 border border-light-green/15',
              'hover:border-light-green/35 hover:shadow-2xl hover:shadow-light-green/5 hover:-translate-y-0.5',
              isSelected && 'border-light-green/60 bg-light-green/5 shadow-lg shadow-light-green/10'
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-light-green/0 via-light-green/0 to-iki-brown/0 group-hover:from-light-green/6 group-hover:to-iki-brown/6 transition-all" />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        'bg-light-green/10 border border-light-green/20 text-light-green',
                        'group-hover:bg-light-green/15 group-hover:border-light-green/30 transition-all',
                        isSelected && 'bg-light-green/20 border-light-green/40'
                      )}
                    >
                      {iconMap[template.icon]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-iki-white group-hover:text-iki-white">
                        {template.name}
                      </div>
                      <div className="text-xs text-iki-white/55 mt-1 leading-relaxed">
                        {template.description}
                      </div>
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <span className="badge badge-primary self-start">Selected</span>
                ) : (
                  <span className="badge badge-secondary self-start">Use</span>
                )}
              </div>
            </div>
          </button>
        );
        })}
      </div>
    </section>
  );
}
