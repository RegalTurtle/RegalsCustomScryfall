import React, { useEffect } from 'react';

type ModalProps = {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const Modal = ({ show, onClose, children }: ModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (show) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 text-black">
      <div className="bg-white p-4 rounded shadow-lg max-h-[80vh] overflow-y-auto">
        {children}
        <button onClick={onClose} className="mt-4 text-blue-500">Close</button>
      </div>
    </div>
  );
};

export default Modal;