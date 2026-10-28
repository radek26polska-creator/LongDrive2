import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-lg mb-4">Strona nie została znaleziona</p>
      <Link to="/">
        <Button>Wróć na stronę główną</Button>
      </Link>
    </div>
  );
}