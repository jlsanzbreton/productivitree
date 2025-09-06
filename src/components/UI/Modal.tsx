
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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close on overlay click
    >
      <div
        className={`bg-gray-800 text-white rounded-xl shadow-2xl flex flex-col overflow-hidden ${sizeClasses[size]} w-full max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        {title && (
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-700">
            <h3 className="text-xl font-semibold text-blue-300">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
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
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-full bg-gray-800/50 hover:bg-gray-700/80"
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
