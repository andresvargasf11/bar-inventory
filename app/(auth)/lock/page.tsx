'use client';

import { useState, useEffect, useTransition } from 'react';
import { Wine, Delete } from 'lucide-react';
import { setupPin, unlockWithPin } from '@/app/actions/auth';

function PinDots({ pin, maxLen }: { pin: string; maxLen: number }) {
  return (
    <div className="flex gap-3 justify-center my-6">
      {Array.from({ length: maxLen }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all ${
            i < pin.length
              ? 'bg-orange-500 border-orange-500 scale-110'
              : 'bg-transparent border-slate-600'
          }`}
        />
      ))}
    </div>
  );
}

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export default function LockPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const from = searchParams.from ?? '/dashboard';
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/setup-status')
      .then((r) => r.json())
      .then((data) => setSetupComplete(data.complete));
  }, []);

  if (setupComplete === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-3">
            <Wine size={32} className="text-orange-500" />
          </div>
          <h1 className="text-xl font-bold text-white">Bar Inventory</h1>
          <p className="text-sm text-slate-400 mt-1">
            {setupComplete ? 'Enter your PIN to continue' : 'Set up your PIN to get started'}
          </p>
        </div>

        {setupComplete ? (
          <UnlockForm from={from} />
        ) : (
          <SetupForm />
        )}
      </div>
    </div>
  );
}

function UnlockForm({ from }: { from: string }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const maxLen = 6;

  const handleKey = (key: string) => {
    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      setError('');
      return;
    }
    if (pin.length >= maxLen) return;
    const next = pin + key;
    setPin(next);
    setError('');

    if (next.length >= 4) {
      // Auto-submit when we have at least 4 digits and user pressed one
      // We'll auto-submit at 6 digits
      if (next.length === maxLen) {
        submitPin(next);
      }
    }
  };

  const submitPin = (value: string) => {
    const fd = new FormData();
    fd.append('pin', value);
    fd.append('from', from);
    startTransition(async () => {
      const result = await unlockWithPin(fd);
      if (result?.error) {
        setError(result.error);
        setPin('');
      }
    });
  };

  const handleManualSubmit = () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    submitPin(pin);
  };

  return (
    <div>
      <PinDots pin={pin} maxLen={maxLen} />
      {error && (
        <p className="text-center text-sm text-red-400 mb-3 animate-shake">{error}</p>
      )}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {KEYPAD.flat().map((key, i) => {
          if (!key) return <div key={i} />;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleKey(key)}
              disabled={isPending}
              className="h-14 rounded-xl bg-slate-800 border border-slate-700 text-white text-xl font-semibold
                hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50
                focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {key === 'del' ? <Delete size={20} className="mx-auto" /> : key}
            </button>
          );
        })}
      </div>
      {pin.length >= 4 && pin.length < maxLen && (
        <button
          onClick={handleManualSubmit}
          disabled={isPending}
          className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold
            transition-colors disabled:opacity-50"
        >
          {isPending ? 'Unlocking…' : 'Unlock'}
        </button>
      )}
    </div>
  );
}

function SetupForm() {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const maxLen = 6;

  const currentPin = step === 'enter' ? pin : confirmPin;
  const setCurrentPin = step === 'enter' ? setPin : setConfirmPin;

  const handleKey = (key: string) => {
    if (key === 'del') {
      setCurrentPin((p) => p.slice(0, -1));
      setError('');
      return;
    }
    if (currentPin.length >= maxLen) return;
    const next = currentPin + key;
    setCurrentPin(next);
    setError('');
    if (next.length === maxLen && step === 'enter') {
      setTimeout(() => setStep('confirm'), 200);
    }
  };

  const handleSubmit = () => {
    if (pin !== confirmPin) {
      setError('PINs do not match');
      setConfirmPin('');
      return;
    }
    const fd = new FormData();
    fd.append('pin', pin);
    fd.append('confirm', confirmPin);
    startTransition(async () => {
      const result = await setupPin(fd);
      if (result?.error) {
        setError(result.error);
        setPin('');
        setConfirmPin('');
        setStep('enter');
      }
    });
  };

  return (
    <div>
      <p className="text-center text-sm text-slate-400 mb-2">
        {step === 'enter' ? 'Choose a 4–6 digit PIN' : 'Confirm your PIN'}
      </p>
      <PinDots pin={currentPin} maxLen={maxLen} />
      {error && (
        <p className="text-center text-sm text-red-400 mb-3">{error}</p>
      )}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {KEYPAD.flat().map((key, i) => {
          if (!key) return <div key={i} />;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleKey(key)}
              disabled={isPending}
              className="h-14 rounded-xl bg-slate-800 border border-slate-700 text-white text-xl font-semibold
                hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50
                focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {key === 'del' ? <Delete size={20} className="mx-auto" /> : key}
            </button>
          );
        })}
      </div>
      {step === 'confirm' && confirmPin.length >= 4 && (
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold
            transition-colors disabled:opacity-50"
        >
          {isPending ? 'Setting up…' : 'Set PIN'}
        </button>
      )}
      {step === 'confirm' && (
        <button
          onClick={() => { setStep('enter'); setConfirmPin(''); setError(''); }}
          className="w-full mt-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Start over
        </button>
      )}
    </div>
  );
}
