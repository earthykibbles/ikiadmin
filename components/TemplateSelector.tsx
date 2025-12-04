import { Template } from '@/lib/types';

interface Props {
  templates: Template[];
  onSelect: (template: Template) => void;
}

export default function TemplateSelector({ templates, onSelect }: Props) {
  return (
    <div className="glass rounded-3xl shadow-2xl border border-light-green/20 p-8 glow-green">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-gradient-to-b from-light-green to-transparent rounded-full"></div>
        <h2 className="text-2xl font-black text-iki-brown">
          Pre-built Templates
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="group relative p-6 rounded-2xl border-2 border-iki-grey hover:border-light-green transition-all hover:scale-105 active:scale-95 bg-gradient-to-br from-iki-grey to-dark-blue overflow-hidden"
          >
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-light-green/0 to-light-green/0 group-hover:from-light-green/5 group-hover:to-light-green/10 transition-all rounded-2xl"></div>
            
            <div className="relative z-10">
              <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform">{template.icon}</div>
              <div className="text-sm font-bold text-iki-white group-hover:text-light-green transition-colors">
                {template.name}
              </div>
              <div className="text-xs text-iki-white/50 mt-2 leading-relaxed">
                {template.description}
              </div>
            </div>
          </button>
        ))}
        <button
          onClick={() => onSelect({ 
            id: 'custom', 
            name: 'Custom', 
            description: 'Start from scratch', 
            icon: '✨',
            config: {}
          })}
          className="group relative p-6 rounded-2xl border-2 border-dashed border-iki-grey hover:border-light-green transition-all hover:scale-105 active:scale-95 bg-gradient-to-br from-dark-blue/50 to-iki-grey/50"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-light-green/0 to-light-green/0 group-hover:from-light-green/5 group-hover:to-light-green/10 transition-all rounded-2xl"></div>
          
          <div className="relative z-10">
            <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform">✨</div>
            <div className="text-sm font-bold text-iki-white group-hover:text-light-green transition-colors">
              Custom
            </div>
            <div className="text-xs text-iki-white/50 mt-2 leading-relaxed">
              Start from scratch
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

