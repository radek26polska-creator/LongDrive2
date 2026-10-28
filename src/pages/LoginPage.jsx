import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const LoginPage = () => {
  const ACTIVE_SESSION_MESSAGE = 'To konto jest już zalogowane na innym urządzeniu. Aby zalogować się tutaj, wyloguj się najpierw z poprzedniego urządzenia. Twoje dane pozostają bez zmian.';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Zalogowano pomyślnie!');
        navigate('/');
      } else {
        const message = result.errorCode === 'ACCOUNT_SESSION_ACTIVE'
          ? ACTIVE_SESSION_MESSAGE
          : result.error || 'Nieprawidłowy email lub hasło';
        setError(message);
        toast.error(message);
      }
    } catch (err) {
      setError('Wystąpił błąd podczas logowania');
      toast.error('Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* ========== LOGO ========== */}
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="LongDrive Logo" 
              className="h-40 w-auto object-contain"
            />
          </div>
          {/* ========================= */}
          <CardTitle className="page-title text-2xl">Logowanie</CardTitle>
          <CardDescription className="text-[var(--text-muted)]">
            Wprowadź email i hasło, aby się zalogować
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--text-secondary)]">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--text-secondary)]">Hasło</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Logowanie...' : 'Zaloguj się'}
            </Button>
            <div className="text-center text-sm text-[var(--text-muted)]">
              Nie masz konta?{' '}
              <Link to="/register" className="text-[var(--primary-light)] hover:text-[var(--primary-hover)]">
                Zarejestruj się
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;