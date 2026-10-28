import React, { useState, useEffect } from 'react';

export default function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Cleanup - ważne dla uniknięcia wycieków pamięci
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-mono text-sm">
      {time.toLocaleTimeString('pl-PL')}
    </div>
  );
}