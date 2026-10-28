// src/components/ui/SaveButton.jsx
import React, { useState } from 'react';
import { Button } from './button';
import { Check, Loader2 } from 'lucide-react';

export default function SaveButton({
  onSave,
  text = 'Zapisz',
  savingText = 'Zapisywanie...',
  successText = 'Zapisano!',
  variant = 'default',
  className = '',
  disabled = false,
  queryClient = null,
  invalidateQueries = [],
  onSuccess = null,
  onError = null
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClick = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setIsSuccess(false);
    
    try {
      await onSave();
      setIsSuccess(true);
      
      // Inwalidacja zapytań jeśli podano
      if (queryClient && invalidateQueries.length) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      if (onSuccess) onSuccess();
      
      // Resetuj stan sukcesu po 2 sekundach
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (error) {
      console.error('Błąd zapisu:', error);
      if (onError) onError(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isSuccess) {
    return (
      <Button
        variant="outline"
        className={`bg-green-500/20 text-green-400 border-green-500/30 ${className}`}
        disabled
      >
        <Check className="w-4 h-4 mr-2" />
        {successText}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleClick}
      disabled={disabled || isSaving}
    >
      {isSaving ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {savingText}
        </>
      ) : (
        <>
          {text}
        </>
      )}
    </Button>
  );
}