import { Zap, Shield, BarChart3, Clock } from "lucide-react";

const features = [
  { icon: Zap, label: "Lightning Fast" },
  { icon: Shield, label: "Bank-level Security" },
  { icon: BarChart3, label: "Smart Analytics" },
  { icon: Clock, label: "Real-time Sync" },
];

export function SectionOne() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="container px-4 md:px-6">
        <div className="max-w-4xl">
          <p 
            className="text-primary font-medium mb-4 opacity-0 animate-fade-up"
            style={{ animationDelay: '0.1s' }}
          >
            All-in-one Platform
          </p>
          <h2 
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-foreground leading-tight mb-6 opacity-0 animate-fade-up"
            style={{ animationDelay: '0.2s' }}
          >
            Everything you need
          </h2>
          <p 
            className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed opacity-0 animate-fade-up"
            style={{ animationDelay: '0.3s' }}
          >
            From automated receipt-to-transaction mapping to conversing with your financials and consolidating all your files — we've got you covered.
          </p>
        </div>

        {/* Feature Pills */}
        <div 
          className="flex flex-wrap gap-3 mt-10 opacity-0 animate-fade-up"
          style={{ animationDelay: '0.4s' }}
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border transition-all duration-200 hover:border-primary/30 hover:bg-primary/5"
            >
              <feature.icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
