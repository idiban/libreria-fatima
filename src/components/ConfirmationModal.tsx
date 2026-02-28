import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-[#FDF2F0] flex justify-between items-center bg-[#FFF9F5]">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-7 h-7 text-orange-500" />
                <h2 className="text-2xl font-black text-[#B23B23] leading-tight">
                  {title}
                </h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              <p className="text-gray-600 text-base leading-relaxed">{message}</p>
            </div>

            {/* Footer */}
            <div className="p-8 bg-[#FFF9F5] border-t border-[#FDF2F0] flex gap-4">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-4 px-6 rounded-2xl font-black text-gray-400 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-[2] bg-red-500 hover:bg-red-600 text-white py-4 px-6 rounded-2xl font-black text-xl shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}