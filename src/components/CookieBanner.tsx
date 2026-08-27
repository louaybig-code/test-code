import React from 'react';
import CookieConsent from 'react-cookie-consent';
import { ShieldCheck } from 'lucide-react';

export const CookieBanner: React.FC = () => {
  return (
    <CookieConsent
      location="bottom"
      buttonText="Accepter"
      declineButtonText="Refuser"
      enableDeclineButton
      cookieName="smash_gdpr_consent"
      containerClasses="!bg-slate-900/95 !border-t !border-violet-500/30 !backdrop-blur-xl !shadow-2xl !py-3 !px-4 md:!px-8 !text-xs !text-slate-200 flex items-center justify-between"
      buttonClasses="!bg-gradient-to-r !from-violet-600 !to-indigo-600 !hover:from-violet-500 !hover:to-indigo-500 !text-white !font-semibold !rounded-xl !px-4 !py-2 !text-xs !m-0 transition"
      declineButtonClasses="!bg-slate-800 !hover:bg-slate-700 !text-slate-300 !font-medium !rounded-xl !px-3.5 !py-2 !text-xs !mr-2 transition"
      expires={150}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
        <span>
          Smash respecte votre vie privée et la souveraineté de vos données (RGPD). Nous utilisons
          des cookies techniques pour assurer l’authentification et votre expérience.
        </span>
      </div>
    </CookieConsent>
  );
};
