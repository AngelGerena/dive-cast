import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

// Android and desktop get a real install button. iPhone gets the Share > Add to Home Screen hint,
// since notifications and reliable offline storage on iOS need the installed app.
export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('dc-install-dismissed') === '1');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (standalone || dismissed || (!evt && !ios)) return null;
  const close = () => {
    localStorage.setItem('dc-install-dismissed', '1');
    setDismissed(true);
  };
  return (
    <div className="install glass" role="region" aria-label="Install the app">
      <div>
        <strong>Add it to your home screen</strong>
        <p className="small muted">{ios ? 'Tap Share, then Add to Home Screen, so your emergency card and saved sites work offline.' : 'Install for offline access to your emergency card and saved sites.'}</p>
      </div>
      <div className="row gap-8">
        {evt && (
          <button type="button" className="btn btn-accent btn-sm" onClick={() => evt.prompt().then(close)}>Install</button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={close}>Not now</button>
      </div>
    </div>
  );
}
