
import React, { useEffect } from 'react';
import { XMarkIcon } from '../Icons/HeroIcons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full h-full rounded-none',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/76 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close on overlay click
    >
      <div
        className={`bg-[#101113]/86 text-amber-50 rounded-xl border border-yellow-700/35 shadow-[0_24px_52px_rgba(0,0,0,0.6),0_0_30px_rgba(217,122,0,0.16)] backdrop-blur-xl flex flex-col overflow-hidden ${sizeClasses[size]} w-full max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        {title && (
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-yellow-700/25">
            <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#D97A00] via-[#F9D967] to-[#FEEA96]">{title}</h3>
            <button
              onClick={onClose}
              className="text-amber-300/70 hover:text-[#FEEA96] transition-colors p-1 rounded-full hover:bg-yellow-500/10"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        )}
         {!title && ( // Add a close button even if no title is provided, positioned top-right
          <div className="absolute top-3 right-3">
             <button
              onClick={onClose}
              className="text-amber-300/70 hover:text-[#FEEA96] transition-colors p-1 rounded-full bg-[#101113]/80 hover:bg-yellow-500/10 border border-yellow-700/20"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        )}
        <div className="p-4 sm:p-6 flex-grow overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
