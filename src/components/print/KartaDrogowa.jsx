import React from 'react';
import { calculateTripMetrics } from '@/lib/tripCalculations';

const KartaDrogowa = React.forwardRef(({ trip, vehicle, driver, company, endMileage, endFuel, fuelAdded, format = 'A4' }, ref) => {
  const normalizeDateTimeValue = (value) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00`;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return trimmed;
    return trimmed;
  };

  const formatDate = (dateStr) => {
    const parsed = normalizeDateTimeValue(dateStr);
    if (!parsed) return '';
    const date = new Date(parsed);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    const parsed = normalizeDateTimeValue(dateStr);
    if (!parsed) return '';
    const date = new Date(parsed);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const vehicleForMetrics = vehicle ? {
    ...vehicle,
    fuelConsumption: trip?.vehicleFuelConsumptionSnapshot ?? vehicle.fuelConsumption,
    tankSize: trip?.vehicleTankSizeSnapshot ?? vehicle.tankSize,
  } : vehicle;
  const metrics = calculateTripMetrics({
    startOdometer: trip?.startOdometer,
    endOdometer: trip?.endOdometer ?? endMileage,
    startFuel: trip?.startFuel,
    endFuel: trip?.endFuel ?? endFuel,
    fuelAdded: trip?.fuelAdded ?? fuelAdded,
    vehicle: vehicleForMetrics,
  });
  const {
    endOdometer: actualEndMileage,
    endFuel: actualEndFuel,
    fuelAdded: actualFuelAdded,
    fuelConsumption,
    fuelUsedNorm,
    fuelUsedActual,
    fuelSavings,
    fuelOveruse,
    distance,
  } = metrics;

  const isA5 = format === 'A5';

  const pageWidth  = isA5 ? '148mm' : '210mm';
  const pageHeight = isA5 ? '210mm' : '297mm';
  const pagePad    = isA5 ? '1mm 5mm 4mm 5mm' : '3mm 9mm 7mm 9mm';

  const baseFontSize  = isA5 ? '7.5px' : '9.5px';
  const smallFontSize = isA5 ? '6px'   : '7.5px';
  const labelFontSize = isA5 ? '5.5px' : '7px';
  const tinyFontSize  = isA5 ? '5px'   : '6px';
  const titleFontSize = isA5 ? '15px'  : '21px';
  const valueFontSize = isA5 ? '9px'   : '11px';

  const cellPad  = isA5 ? '1px 3px' : '2px 5px';
  const hCellPad = isA5 ? '1px 2px' : '2px 4px';

  const greenColor  = '#4a7c59';
  const lightGreen  = '#e8f5e9';
  const borderColor = '#5a8a6a';

  const startRaw = trip?.startTime || trip?.startDate || trip?.departureDate ||
    (trip?.departureDate && trip?.departureTime ? `${trip.departureDate}T${trip.departureTime}:00` : null);
  const endRaw = trip?.endTime || trip?.endDate || trip?.returnDate ||
    (trip?.returnDate && trip?.returnTime ? `${trip.returnDate}T${trip.returnTime}:00` : null);

  const startDate = formatDate(startRaw)
    || (trip?.departureDate ? formatDate(trip.departureDate) : '');
  const endDate = formatDate(endRaw)
    || (trip?.returnDate ? formatDate(trip.returnDate) : '');
  const startTime = formatTime(startRaw)
    || (trip?.departureTime ? formatTime(`${trip.departureDate || trip.startDate || new Date().toISOString().slice(0, 10)}T${trip.departureTime}:00`) : '');
  const endTime = formatTime(endRaw)
    || (trip?.returnTime ? formatTime(`${trip.returnDate || trip.endDate || new Date().toISOString().slice(0, 10)}T${trip.returnTime}:00`) : '');

  const cell = {
    border: `1px solid ${borderColor}`,
    padding: isA5 ? '1px 3px 2px' : '2px 5px 3px',
    fontSize: baseFontSize,
    verticalAlign: 'middle',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    lineHeight: '1.1',
    textAlign: 'left',
  };

  const hCell = {
    ...cell,
    padding: hCellPad,
    backgroundColor: lightGreen,
    fontWeight: '600',
    color: '#1a1a1a',
    verticalAlign: 'middle',
    textAlign: 'center',
    lineHeight: '1.15',
  };

  const num = { fontWeight: 'bold', color: greenColor, marginRight: '3px' };

  const signatureValue = (value, fallback = '_____________________') => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    const signatureText = trimmed || fallback;
    return (
      <div
        style={{
          minHeight: isA5 ? '18px' : '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          marginTop: isA5 ? '10px' : '12px',
          fontFamily: '"Segoe Print", "Bradley Hand", cursive',
          fontSize: isA5 ? '8px' : '12px',
          color: '#111827',
          textAlign: 'center',
          lineHeight: 1.1,
          letterSpacing: '0.04em',
          wordBreak: 'keep-all',
        }}
      >
        {signatureText}
      </div>
    );
  };

  const driverName = driver?.name ||
    (driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : '');

  const orderedBySignature = trip?.orderedBy || trip?.resultsControlSignature || trip?.arrivalSignature || '';
  const approvalSignature = trip?.resultsControlSignature || trip?.arrivalSignature || trip?.orderedBy || '';

  const vehicleBodyType = [
    vehicle?.bodyType,
    vehicle?.body_type,
    vehicle?.vehicleType,
    vehicle?.vehicle_type,
    trip?.vehicleBodyTypeSnapshot,
    trip?.vehicle_body_type_snapshot,
    trip?.bodyType,
  ].find((value) => typeof value === 'string' && value.trim()) || '....................................';

  // 🔧 POPRAWA 1: Usunięto `body * { visibility: hidden }` - to powodowało znikanie menu
  // 🔧 POPRAWA 2: Dodano `display: block` i `position: relative` zamiast `fixed`
  // 🔧 POPRAWA 3: Styl jest teraz TYLKO dla wydruku, nie wpływa na ekran
  const printCSS = `
    @media print {
      @page {
        size: ${isA5 ? 'A5' : 'A4'} portrait;
        margin: 0mm;
      }
      
      /* TYLKO karta jest widoczna, reszta strony ukryta TYLKO W DRUKU */
      body * {
        visibility: hidden !important;
      }
      
      [data-print-document="karta-drogowa"],
      [data-print-document="karta-drogowa"] * {
        visibility: visible !important;
      }
      
      [data-print-document="karta-drogowa"] {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: ${pageWidth} !important;
        height: auto !important;
        min-height: ${pageHeight} !important;
        margin: 0 !important;
        padding: ${pagePad} !important;
        box-sizing: border-box !important;
        background: white !important;
        z-index: 99999 !important;
      }
    }
  `;

  return (
    <div
      ref={ref}
      data-print-document="karta-drogowa"
      style={{
        width: pageWidth,
        maxWidth: pageWidth,
        boxSizing: 'border-box',
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: baseFontSize,
        lineHeight: '1.3',
        color: '#1a1a1a',
        backgroundColor: '#ffffff',
        padding: pagePad,
        // 🔧 POPRAWA 4: Dodano - element nie przeszkadza w interfejsie
        position: 'relative',
        zIndex: 1,
        pointerEvents: 'none', // Karta nie blokuje kliknięć w menu
      }}
    >
      <style>{printCSS}</style>

      {/* ===== NAGŁÓWEK (sekcje 1 i 2) ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{
              border: `1px solid ${borderColor}`,
              width: '50%',
              padding: isA5 ? '4px 6px' : '6px 8px',
              verticalAlign: 'top',
            }}>
              <div style={{ fontSize: tinyFontSize, color: greenColor, fontWeight: 'bold', marginBottom: '2px' }}>1</div>
              {company && (company.name || company.address) ? (
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: isA5 ? '8px' : '11px' }}>{company.name}</div>
                  <div style={{ fontSize: isA5 ? '6.5px' : '9px', lineHeight: '1.5', marginTop: '2px' }}>
                    {company.address  && <div>{company.address}</div>}
                    {(company.zipCode || company.city) && (
                      <div>{[company.zipCode, company.city].filter(Boolean).join(' ')}</div>
                    )}
                    {company.nip    && <div>NIP: {company.nip}</div>}
                    {company.regon  && <div>REGON: {company.regon}</div>}
                    {company.phone  && <div>tel. {company.phone}</div>}
                    {company.email  && <div>{company.email}</div>}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: labelFontSize, color: '#9ca3af', marginTop: '14px', textAlign: 'center' }}>
                  Pieczęć jednostki organizacyjnej
                </div>
              )}
            </td>

            <td style={{
              border: `1px solid ${borderColor}`,
              width: '50%',
              padding: isA5 ? '4px 6px' : '6px 8px',
              verticalAlign: 'middle',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: tinyFontSize, color: greenColor, fontWeight: 'bold', marginBottom: '2px' }}>2</div>
                  <div style={{ fontSize: titleFontSize, fontWeight: 'bold', color: greenColor, letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                    KARTA DROGOWA
                  </div>
                  <div style={{ marginTop: isA5 ? '5px' : '8px', fontSize: isA5 ? '8px' : '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Nr</span>
                    <span style={{
                      borderBottom: `1px solid ${borderColor}`,
                      display: 'inline-block',
                      minWidth: isA5 ? '80px' : '130px',
                      paddingLeft: '3px',
                      fontWeight: '700',
                      fontSize: isA5 ? '10px' : '12px',
                    }}>
                      {trip?.cardNumber || trip?.tripNumber || ''}
                    </span>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: isA5 ? '8px' : '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Data</span>
                    <span style={{
                      borderBottom: `1px solid ${borderColor}`,
                      display: 'inline-block',
                      minWidth: isA5 ? '80px' : '130px',
                      paddingLeft: '3px',
                      fontWeight: '600',
                    }}>
                      {startDate}
                    </span>
                  </div>
                </div>
                <div style={{
                  border: `2px solid ${borderColor}`,
                  padding: isA5 ? '4px 8px' : '6px 12px',
                  textAlign: 'center',
                  backgroundColor: lightGreen,
                  flexShrink: 0,
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: isA5 ? '12px' : '17px', color: greenColor, lineHeight: '1.2' }}>SM</div>
                  <div style={{ fontWeight: 'bold', fontSize: isA5 ? '12px' : '17px', color: greenColor, lineHeight: '1.2' }}>101</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== SEKCJA 3 – POJAZD ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ ...cell }} colSpan="2">
              <span style={num}>3</span>
              Samochód osobowy - specjalny - motocykl*)&nbsp;&nbsp;
              Nr rej.&nbsp;
              <span style={{ fontWeight: '700', letterSpacing: '1px' }}>
                {vehicle?.registrationNumber || '...................................'}
              </span>
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, width: '50%' }}>
              Marka i typ:&nbsp;
              <span style={{ fontWeight: '600' }}>
                {vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() : '...................................'}
              </span>
            </td>
            <td style={{ ...cell, width: '50%' }}>
              Pojemność cylindrów:&nbsp;
              <span style={{ fontWeight: '600' }}>
                {vehicle?.engineCapacity ? `${vehicle.engineCapacity} cm³` : '...................................'}
              </span>
            </td>
          </tr>
          <tr>
            <td style={{ ...cell }}>
              Rodzaj paliwa:&nbsp;
              <span style={{ fontWeight: '600' }}>{vehicle?.fuelType || '....................................'}</span>
            </td>
            <td style={{ ...cell }}>
              Rodzaj nadwozia:&nbsp;
              <span style={{ fontWeight: '600' }}>{vehicleBodyType}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== SEKCJA 4+5 – KIEROWCA ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '19%' }} />
          <col style={{ width: '19%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...cell }} rowSpan="2">
              <span style={num}>4</span> Imię i nazwisko kierowcy
              <div style={{ marginTop: '4px', fontWeight: '700', fontSize: valueFontSize }}>
                {driverName}
              </div>
              <div style={{ marginTop: '3px', fontSize: labelFontSize, color: '#6b7280' }}>
                Cel:&nbsp;<span style={{ color: '#1a1a1a', fontWeight: '500' }}>{trip?.purpose || ''}</span>
              </div>
            </td>
            <td style={{ ...hCell, fontSize: labelFontSize }}>
              Godzina rozp.<br />pracy
            </td>
            <td style={{ ...hCell, fontSize: labelFontSize }}>
              Godzina uk.<br />pracy
            </td>
            <td style={{ ...hCell, fontSize: labelFontSize }}>
              <span style={num}>5</span>Promień<br />wyjazdu
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '600', fontSize: valueFontSize, height: isA5 ? '18px' : '22px' }}>
              {startTime}
            </td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '600', fontSize: valueFontSize }}>
              {endTime}
            </td>
            <td style={{ ...cell, textAlign: 'center' }}> </td>
          </tr>
        </tbody>
      </table>

      {/* ===== SEKCJA 6+7 – SPRAWNOŚĆ ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '60%' }} />
          <col style={{ width: '40%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...cell }}>
              <span style={num}>6</span> Pojazd samochodowy sprawny do wyjazdu
              <div style={{ marginTop: isA5 ? '8px' : '12px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                <span style={{ fontSize: labelFontSize, color: '#6b7280', minWidth: isA5 ? '70px' : '110px' }}>
                  {trip?.driverTechSignature || 'Podpis _____________'}
                </span>
                <span style={{ fontSize: labelFontSize, color: '#6b7280', minWidth: isA5 ? '90px' : '150px' }}>
                  {trip?.driverResultsSignature || 'Podpis kierowcy _____________'}
                </span>
              </div>
            </td>
            <td style={{ ...cell }}>
              <span style={num}>7</span> Kontrola drogowa
              <div style={{ minHeight: isA5 ? '18px' : '22px' }}></div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== SEKCJA 8 – ZLECENIE ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '50%' }} />
          <col style={{ width: '50%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...cell }}>
              <span style={num}>8</span>&nbsp;Zleca wyjazd:&nbsp;
              <span style={{ fontWeight: '600' }}>{trip?.orderedBy || '___________________________'}</span>
            </td>
            <td style={{ ...cell }}>
              Zatwierdził przejazd: {trip?.resultsControlSignature || trip?.arrivalSignature || trip?.orderedBy || '___________________________'}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell }}>
              {signatureValue(orderedBySignature, '_________________')}
            </td>
            <td style={{ ...cell }}>
              {signatureValue(approvalSignature, '_________________')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== SEKCJA 9+10+11 – PALIWO ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '13%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '30%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...hCell, textAlign: 'left' }} colSpan="6">
              <span style={num}>9</span> PALIWO
            </td>
            <td style={{ ...cell, fontSize: labelFontSize, lineHeight: '1.4' }} rowSpan="6">
              <div style={{ marginBottom: '6px' }}>
                <span style={num}>10</span> Podpis wystawiającego kartę
              </div>
              {signatureValue(trip?.resultsCalculatedBy || trip?.fuelIssuedBy || '', '____________________')}
              <div style={{ marginBottom: '4px', fontSize: labelFontSize }}>
                <span style={num}>11</span> Norma zużycia paliwa<br />na 100 km przebiegu:
              </div>
              <div style={{ fontWeight: '700', fontSize: isA5 ? '11px' : '13px', color: greenColor }}>
                {fuelConsumption} l/100km{metrics.fuelConsumptionSource === 'default' ? ' (domyślna)' : ''}
              </div>
            </td>
          </tr>
          <tr>
            <td style={{
              ...hCell,
              fontSize: tinyFontSize,
              height: isA5 ? '28px' : '34px',
              padding: isA5 ? '3px 2px' : '4px 4px',
              lineHeight: '1.2',
            }}>
              Stan paliwa<br />przy otrzymaniu<br />karty
            </td>
            <td style={{ ...hCell, fontSize: tinyFontSize }} colSpan="4">Pobrano</td>
            <td style={{
              ...hCell,
              fontSize: tinyFontSize,
              height: isA5 ? '28px' : '34px',
              padding: isA5 ? '3px 2px' : '4px 4px',
              lineHeight: '1.2',
            }}>
              Stan paliwa<br />przy zwrocie<br />karty
            </td>
          </tr>
          <tr>
            <td style={{ ...hCell, fontSize: tinyFontSize }}>1</td>
            <td style={{ ...hCell, fontSize: tinyFontSize }}>Gdzie</td>
            <td style={{ ...hCell, fontSize: tinyFontSize }}>Nr kwitu</td>
            <td style={{ ...hCell, fontSize: tinyFontSize }}>Ilość</td>
            <td style={{
              ...hCell,
              fontSize: tinyFontSize,
              height: isA5 ? '20px' : '24px',
              padding: isA5 ? '2px' : '3px 4px',
              lineHeight: '1.2',
            }}>
              Podpis<br />wydającego
            </td>
            <td style={{ ...hCell, fontSize: tinyFontSize }}>6</td>
          </tr>
          <tr>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '700', fontSize: valueFontSize, height: isA5 ? '20px' : '24px' }}>
              {metrics.startFuel !== null ? `${metrics.startFuel.toFixed(1)} L` : 'brak danych'}
            </td>
            <td style={{ ...cell, textAlign: 'center', fontSize: smallFontSize }}>{trip?.fuelStation || ''}</td>
            <td style={{ ...cell, textAlign: 'center', fontSize: smallFontSize }}>{trip?.fuelReceiptNumber || ''}</td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '700', fontSize: smallFontSize }}>
              {actualFuelAdded !== null && actualFuelAdded > 0 ? `${actualFuelAdded.toFixed(1)} L` : actualFuelAdded === 0 ? '0.0 L' : 'brak danych'}
            </td>
            <td style={{ ...cell, textAlign: 'center' }}> </td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '700', fontSize: valueFontSize }}>
              {actualEndFuel !== null ? `${actualEndFuel.toFixed(1)} L` : 'brak danych'}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, height: isA5 ? '14px' : '18px' }}> </td>
            <td style={cell}> </td>
            <td style={cell}> </td>
            <td style={cell}> </td>
            <td style={cell}> </td>
            <td style={cell}> </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontSize: labelFontSize, color: '#6b7280' }} colSpan="3">
              Podpis _________________
            </td>
            <td style={{ ...cell, fontSize: labelFontSize, color: '#6b7280' }} colSpan="3">
              Podpis _________________
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== SEKCJA 12+13 – LICZNIKI ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '10%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...hCell, textAlign: 'left' }}><span style={num}>12</span></td>
            <td style={{ ...hCell, fontSize: labelFontSize }}>Data</td>
            <td style={{ ...hCell, fontSize: labelFontSize }}>Godz. - min.</td>
            <td style={{ ...hCell, fontSize: labelFontSize }}>Stan licznika</td>
            <td style={{ ...hCell, fontSize: labelFontSize }} colSpan="4">Zużycie paliwa</td>
          </tr>
          <tr>
            <td style={{ ...hCell }}> </td>
            <td style={{ ...hCell, fontSize: tinyFontSize }}>1</td>
            <td style={{ ...hCell, fontSize: tinyFontSize }}>2</td>
            <td style={{ ...hCell, fontSize: tinyFontSize }}>3</td>
            <td style={{ ...hCell, fontSize: tinyFontSize }}>wg norm po<br />uwzgl.<br />poprawek</td>
            <td style={{ ...hCell, fontSize: tinyFontSize }}>rzeczywiste</td>
            <td style={{ ...hCell, fontSize: tinyFontSize, color: '#10b981' }}>oszczędność</td>
            <td style={{ ...hCell, fontSize: tinyFontSize, color: '#ef4444' }}>przekroczenie</td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: '700', fontSize: smallFontSize }}>POWRÓT</td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '600', fontSize: smallFontSize }}>{endDate}</td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '600', fontSize: smallFontSize }}>{endTime}</td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '700', fontSize: valueFontSize }}>
              {actualEndMileage !== null ? `${actualEndMileage.toLocaleString()} km` : 'brak danych'}
            </td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '600', fontSize: smallFontSize }}>
              {fuelUsedNorm !== null ? `${fuelUsedNorm.toFixed(1)} L` : 'brak danych'}
            </td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '600', fontSize: smallFontSize }}>
              {fuelUsedActual !== null ? `${fuelUsedActual.toFixed(1)} L` : 'brak danych'}
            </td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '700', fontSize: smallFontSize, color: '#10b981' }}>
              {fuelSavings !== null ? `${fuelSavings.toFixed(1)} L` : '—'}
            </td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '700', fontSize: smallFontSize, color: '#ef4444' }}>
              {fuelOveruse !== null ? `${fuelOveruse.toFixed(1)} L` : '—'}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: '700', fontSize: smallFontSize }}>
              <span style={num}>13</span>WYJAZD
            </td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '600', fontSize: smallFontSize }}>{startDate}</td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '600', fontSize: smallFontSize }}>{startTime}</td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '700', fontSize: valueFontSize }}>
              {metrics.startOdometer !== null ? `${metrics.startOdometer.toLocaleString()} km` : 'brak danych'}
            </td>
            <td style={cell}> </td>
            <td style={cell}> </td>
            <td style={cell}> </td>
            <td style={cell}> </td>
          </tr>
        </tbody>
      </table>

      {/* ===== SEKCJA 14 – WYNIKI ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '20%' }} />
          <col style={{ width: '40%' }} />
          <col style={{ width: '40%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...hCell, textAlign: 'left' }}>
              <span style={num}>14</span> WYNIKI
            </td>
            <td style={{ ...hCell, fontSize: labelFontSize }}>Czas pracy godz. - min.</td>
            <td style={{ ...hCell, fontSize: labelFontSize }}>Przebieg km</td>
          </tr>
          <tr>
            <td style={{ ...cell, height: isA5 ? '22px' : '28px' }}> </td>
            <td style={{ ...cell, textAlign: 'center' }}> </td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: '700', fontSize: isA5 ? '13px' : '15px', color: greenColor }}>
              {distance === null ? 'brak danych' : `${distance.toLocaleString()} km`}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== SEKCJA 15+16+17 – PODPISY ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '33%' }} />
          <col style={{ width: '34%' }} />
          <col style={{ width: '33%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...cell }}>
              <span style={num}>15</span> Podpis kierowcy
              {signatureValue(trip?.driverResultsSignature, '_____________________')}
            </td>
            <td style={{ ...cell }}>
              <span style={num}>16</span> Wyniki obliczył
              {signatureValue(trip?.resultsCalculatedBy, '_____________________')}
            </td>
            <td style={{ ...cell }}>
              <span style={num}>17</span> Podpis kontr. wyniki
              {signatureValue(trip?.resultsControlSignature, '_____________________')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== SEKCJA 18 – UWAGI ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '60%' }} />
          <col style={{ width: '40%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...cell, verticalAlign: 'top', minHeight: isA5 ? '30px' : '38px' }}>
              <span style={num}>18</span> Uwagi
              <div style={{ marginTop: '3px', fontSize: baseFontSize, minHeight: isA5 ? '22px' : '28px' }}>
                {trip?.notes || ''}
              </div>
            </td>
            <td style={{ ...cell, verticalAlign: 'top' }}>
              <span style={num}>19</span> Deklaracja na dojazd poza promień
              <div style={{ marginTop: '4px', fontSize: labelFontSize, color: '#6b7280' }}>
                Nr _______________
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'center', marginTop: '4px', fontSize: tinyFontSize, color: '#9ca3af' }}>
        Dokument wygenerowano elektronicznie • {new Date().toLocaleString('pl-PL')}
      </div>
    </div>
  );
});

KartaDrogowa.displayName = 'KartaDrogowa';
export default KartaDrogowa;