'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, CloseIcon, InfoIcon } from './icons';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow animation to complete
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-success',
    error: 'bg-error',
    info: 'bg-accent',
  }[type];

  const icon = {
    success: <CheckIcon className='w-5 h-5' />,
    error: <CloseIcon className='w-5 h-5' />,
    info: <InfoIcon className='w-5 h-5' />,
  }[type];

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg transition-all duration-300 ${bgColor} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {icon}
      <span className='text-sm font-medium'>{message}</span>
      <button type='button' onClick={onClose} className='ml-2 hover:opacity-80 transition-opacity'>
        <CloseIcon />
      </button>
    </div>
  );
}
