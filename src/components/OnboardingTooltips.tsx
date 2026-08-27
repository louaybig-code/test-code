import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronRight, Check } from 'lucide-react';
import logoDark from '/studiopilot-dark.png';

export const OnboardingTooltips: React.FC = () => {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    const done = localStorage.getItem('studiopilot_onboarding_done');
    if (!done) {
      setStep(1);
    }
  }, []);

  const finishOnboarding = () => {
    localStorage.setItem('studiopilot_onboarding_done', 'true');
    setStep(null);
  };

  if (step === null) {
    return (
      <button
        onClick={() => setStep(1)}
        className="fixed top-4 left-4 z-40 pl-2.5 pr-3.5 py-2 rounded-full
          bg-[#2C3147] hover:bg-[#3D4460] text-white
          shadow-lg shadow-[#2C3147]/50
          transition flex items-center gap-2.5 cursor-pointer
          border border-[#E8531A]/30"
        title="StudioPilote guide"
      >
        <img
          src={logoDark}
          alt="StudioPilot"
          className="h-5 w-auto object-contain"
          draggable={false}
        />
        <span className="hidden sm:inline text-xs font-semibold">Guide</span>
      </button>
    );
  }

  const steps = [
    {
      title: 'Welcome to StudioPilote 🚀',
      content:
        'StudioPilote is your agile project management platform combining the power of Jira, the clarity of Monday, and the versatility of ClickUp — all in one place.',
    },
    {
      title: 'Multiple Views 📊',
      content:
        'Switch seamlessly between Kanban board, Backlog with Sprints, List view, Calendar, Team Channels, and Analytics dashboards.',
    },
    {
      title: 'Command Bar Cmd+K ⚡',
      content:
        'Press Cmd+K or Ctrl+K at any time to instantly search across all your tasks and navigate the app.',
    },
    {
      title: 'Security & Privacy 🔒',
      content:
        'Manage your personal access tokens, notification preferences, and organization settings with full control.',
    },
  ];

  const currentStep = steps[step - 1];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="pointer-events-auto w-full max-w-md rounded-2xl
            bg-[#1C2033]/97 border border-[#E8531A]/30
            p-5 shadow-2xl backdrop-blur-xl text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img
                src={logoDark}
                alt="StudioPilote"
                className="h-5 w-auto object-contain"
                draggable={false}
              />
              <span className="text-[10px] font-bold tracking-widest text-[#E8531A] uppercase">
                Step {step} of {steps.length}
              </span>
            </div>
            <button
              onClick={finishOnboarding}
              className="text-xs text-[#8890A8] hover:text-white transition"
            >
              Skip
            </button>
          </div>

          {/* Content */}
          <h4 className="text-base font-bold text-white mb-2">{currentStep.title}</h4>
          <p className="text-xs text-[#8890A8] leading-relaxed mb-5">
            {currentStep.content}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            {/* Progress dots */}
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 === step
                      ? 'w-6 bg-[#E8531A]'
                      : i + 1 < step
                      ? 'w-2 bg-[#1A8C8C]'
                      : 'w-2 bg-[#2E3450]'
                  }`}
                />
              ))}
            </div>

            {step < steps.length ? (
              <button
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1
                  bg-[#E8531A] hover:bg-[#F06535]
                  px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white
                  transition cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={finishOnboarding}
                className="inline-flex items-center gap-1
                  bg-[#1A8C8C] hover:bg-[#21AAAA]
                  px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white
                  transition cursor-pointer"
              >
                Let's go! <Check className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

