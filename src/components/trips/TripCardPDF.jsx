import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import KartaDrogowa from "./KartaDrogowa";
import { generatePdfFromElement } from "@/lib/documentPdf";

export default function TripCardPDF({ trip, vehicle, driver, company, format = 'A4' }) {
  const [loading, setLoading] = React.useState(false);
  const [rendered, setRendered] = React.useState(false);
  const kartaRef = React.useRef(null);

  const isA5 = format === 'A5';
  const wrapperWidthPx = Math.round((isA5 ? 148 : 210) * (96 / 25.4));

  const generatePDF = React.useCallback(async () => {
    setRendered(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const pdf = await generatePdfFromElement(kartaRef.current, format);
      return pdf;
    } finally {
      setRendered(false);
    }
  }, [format]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const pdf = await generatePDF();
      const name = trip?.cardNumber || String(trip?.id || '').slice(-6).toUpperCase() || 'karta';
      pdf.save(`karta-drogowa-${name}.pdf`);
    } catch (err) {
      console.error('Błąd generowania PDF:', err);
      alert('Nie udało się wygenerować PDF. Sprawdź konsolę.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const pdf = await generatePDF();
      const url = URL.createObjectURL(pdf.output('blob'));
      const previewWindow = window.open(url, '_blank');
      if (!previewWindow) {
        URL.revokeObjectURL(url);
        throw new Error('Przeglądarka zablokowała okno podglądu PDF');
      }
      const cleanup = () => {
        URL.revokeObjectURL(url);
        previewWindow.removeEventListener('beforeunload', cleanup);
      };
      previewWindow.addEventListener('beforeunload', cleanup);
    } catch (err) {
      console.error('Błąd podglądu PDF:', err);
      alert('Nie udało się wygenerować podglądu. Sprawdź konsolę.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Render pomocniczy pozostaje widoczny dla html2canvas, ale nie przechwytuje interakcji. */}
      {rendered && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: -1,
            pointerEvents: 'none',
            background: 'white',
            width: `${wrapperWidthPx}px`,
            overflow: 'hidden',
            opacity: 1,
            visibility: 'visible',
          }}
        >
          <KartaDrogowa
            ref={kartaRef}
            trip={trip}
            vehicle={vehicle}
            driver={driver}
            company={company}
            format={format}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handlePreview}
          variant="outline"
          size="sm"
          disabled={loading}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <Eye className="w-4 h-4 mr-2" />
          {loading ? 'Generuję...' : 'Podgląd'}
        </Button>

        <Button
          onClick={handleDownload}
          size="sm"
          disabled={loading}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
        >
          <Download className="w-4 h-4 mr-2" />
          {loading ? 'Generuję...' : 'Pobierz PDF'}
        </Button>
      </div>
    </>
  );
}