import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

/**
 * Animowany komunikat błędu pod polem formularza.
 *
 * Użycie:
 *   <Input ... />
 *   <FormError error={getError('name')} />
 */
export default function FormError({ error }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.15 }}
          className="state-error mt-1 flex items-center gap-1.5 border-0 bg-transparent text-xs"
        >
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}