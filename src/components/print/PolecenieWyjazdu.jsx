import React from 'react';

const PolecenieWyjazdu = React.forwardRef(({ trip, vehicle, driver, company, format = 'A4' }, ref) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pl-PL');
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const getCurrentDate = () => new Date().toLocaleDateString('pl-PL');
  const getCurrentTime = () => new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  const startDateTime = trip?.startTime || trip?.startDate;
  const endDateTime   = trip?.endTime   || trip?.endDate;

  const distance = (trip?.endOdometer || 0) - (trip?.startOdometer || 0);

  const departureTimeStr = startDateTime ? formatTime(startDateTime) : getCurrentTime();
  const departureDateStr = startDateTime ? formatDate(startDateTime) : getCurrentDate();

  const greenColor  = '#4a7c59';
  const lightGreen  = '#e8f5e9';
  const borderColor = '#5a8a6a';

  const isA5 = format === 'A5';

  // Wymiary strony
  const pageWidth  = isA5 ? '148mm' : '210mm';
  const pageHeight = isA5 ? '210mm' : '297mm';
  const pagePad    = isA5 ? '4mm 5mm' : '7mm 9mm';

  // Czcionki
  const fontSize       = isA5 ? '7px'   : '9px';
  const smallFontSize  = isA5 ? '5.5px' : '7px';
  const tinyFontSize   = isA5 ? '5px'   : '6px';
  const headerFontSize = isA5 ? '13px'  : '16px';
  const dateText = {
    fontSize: isA5 ? '5.5px' : '7px',
    lineHeight: '1.3',
    marginTop: '1px',
    whiteSpace: 'nowrap',
  };

  const routeText = trip?.startLocation && trip?.endLocation
    ? `${trip.startLocation} - ${trip.endLocation}`
    : trip?.purpose || '';

  const driverName = driver?.name ||
    (driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : '');

  const cell = {
    border: `1px solid ${borderColor}`,
    padding: isA5 ? '1px 2px' : '2px 3px',
    fontSize,
    textAlign: 'center',
    verticalAlign: 'middle',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    lineHeight: '1.2',
  };

  const dateTimeCell = {
    ...cell,
    padding: isA5 ? '3px 2px' : '4px 3px',
    minHeight: isA5 ? '22px' : '26px',
  };

  const hCell = {
    ...cell,
    backgroundColor: lightGreen,
    fontWeight: '600',
    color: '#1a1a1a',
    fontSize: isA5 ? '5.5px' : '7px',
    lineHeight: '1.2',
  };

  // CSS druku
  const printCSS = `
    @media print {
      @page {
        size: ${isA5 ? 'A5' : 'A4'} portrait;
        margin: 0mm;
      }
      body * { visibility: hidden !important; }
      #polecenie-wyjazdu-print,
      #polecenie-wyjazdu-print * { visibility: visible !important; }
      #polecenie-wyjazdu-print {
        position: fixed !important;
        inset: 0 !important;
        width: ${pageWidth} !important;
        height: ${pageHeight} !important;
        margin: 0 !important;
        padding: ${pagePad} !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
    }
  `;

  return (
    <div
      ref={ref}
      id="polecenie-wyjazdu-print"
      style={{
        fontFamily: "'Arial', sans-serif",
        fontSize,
        width: pageWidth,
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        padding: pagePad,
      }}
    >
      <style>{printCSS}</style>

      {/* Nagłówek firmy */}
      {company && company.name && (
        <div style={{ marginBottom: '6px', fontSize: isA5 ? '6.5px' : '8.5px', lineHeight: '1.5' }}>
          <div style={{ fontWeight: 'bold' }}>{company.name}</div>
          {company.address && <div>{company.address}</div>}
          {(company.zipCode || company.city) && (
            <div>{[company.zipCode, company.city].filter(Boolean).join(' ')}</div>
          )}
          {company.nip && <div>NIP: {company.nip}</div>}
        </div>
      )}

      <div style={{
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: headerFontSize,
        marginBottom: '6px',
        color: greenColor,
        letterSpacing: '1px',
      }}>
        POLECENIE WYJAZDU SŁUŻBOWEGO
      </div>

      {/* Tabela główna */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${borderColor}` }}>
        <colgroup>
          <col style={{ width: '7%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
        </colgroup>
        <thead>
          <tr>
            {[
              { label: 'Nr kolejny\nzlecenia' },
              { label: 'Nazwisko\njadącego' },
              { label: 'Skąd - dokąd' },
              { label: 'Odjazd\ngodz. min.' },
              { label: 'Stan licznika\nprzy wyjeździe' },
              { label: 'Przyjazd\ngodz. min.' },
              { label: 'Stan licznika\nprzy powrocie' },
              { label: 'Prze-bieg\nkm' },
              { label: 'Podpis\njadącego' },
            ].map((col, i) => (
              <th key={i} style={hCell}>
                {col.label.split('\n').map((l, j) => <div key={j}>{l}</div>)}
              </th>
            ))}
          </tr>
          <tr>
            {['1','2','3','4','5','6','7','8','9'].map((n, i) => (
              <td key={i} style={{ ...hCell, fontSize: tinyFontSize }}>{n}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Wiersz z danymi trasy */}
          <tr>
            <td style={cell}>{trip?.cardNumber || ''}</td>
            <td style={{ ...cell, fontSize: isA5 ? '5.5px' : '7px' }}>{driverName}</td>
            <td style={{ ...cell, textAlign: 'left', fontSize: isA5 ? '5.5px' : '6.5px' }}>{routeText}</td>
            <td style={dateTimeCell}>
              <div style={{ fontWeight: 'bold' }}>{departureTimeStr}</div>
              <div style={dateText}>{departureDateStr}</div>
            </td>
            <td style={{ ...cell, fontWeight: 'bold' }}>{trip?.startOdometer || 0}</td>
            <td style={dateTimeCell}>
              {trip?.status === 'completed' && endDateTime ? (
                <>
                  <div style={{ fontWeight: 'bold' }}>{formatTime(endDateTime)}</div>
                  <div style={dateText}>{formatDate(endDateTime)}</div>
                </>
              ) : ''}
            </td>
            <td style={{ ...cell, fontWeight: 'bold' }}>
              {trip?.status === 'completed' ? trip?.endOdometer : ''}
            </td>
            <td style={{ ...cell, fontWeight: 'bold' }}>
              {trip?.status === 'completed' ? distance : ''}
            </td>
            <td style={{ ...cell, fontSize: tinyFontSize }}>{driverName}</td>
          </tr>

          {/* Puste wiersze */}
          {[...Array(isA5 ? 5 : 9)].map((_, i) => (
            <tr key={i}>
              {[...Array(9)].map((__, j) => (
                <td key={j} style={{
                  ...cell,
                  height: isA5 ? '13px' : '17px',
                  backgroundColor: i % 2 === 0 ? lightGreen : 'white',
                }}></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* WYJAZD / WJAZD */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
        <colgroup>
          <col style={{ width: '49%' }} />
          <col style={{ width: '2%' }} />
          <col style={{ width: '49%' }} />
        </colgroup>
        <tbody>
          <tr>
            {/* WYJAZD */}
            <td style={{
              border: `2px solid ${borderColor}`,
              padding: isA5 ? '4px 6px' : '7px 10px',
              verticalAlign: 'top',
            }}>
              <div style={{
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: isA5 ? '10px' : '13px',
                marginBottom: '4px',
                color: greenColor,
              }}>
                WYJAZD
              </div>
              <div style={{ fontSize: isA5 ? '7.5px' : '9.5px', lineHeight: '1.6' }}>
                <div>Stan licznika: <strong>{trip?.startOdometer || 0} km</strong></div>
                <div>Godzina: <strong>{departureTimeStr}</strong></div>
                <div>Data: <strong>{departureDateStr}</strong></div>
              </div>
              <div style={{
                marginTop: isA5 ? '12px' : '16px',
                paddingTop: '4px',
                borderTop: `1px solid ${borderColor}`,
                textAlign: 'center',
                fontSize: isA5 ? '6px' : '8px',
                color: '#6b7280',
              }}>
                Podpis portiera
              </div>
            </td>

            {/* Separator */}
            <td style={{ width: '2%' }}></td>

            {/* WJAZD */}
            <td style={{
              border: `2px solid ${borderColor}`,
              padding: isA5 ? '4px 6px' : '7px 10px',
              verticalAlign: 'top',
            }}>
              <div style={{
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: isA5 ? '10px' : '13px',
                marginBottom: '4px',
                color: greenColor,
              }}>
                WJAZD
              </div>
              <div style={{ fontSize: isA5 ? '7.5px' : '9.5px', lineHeight: '1.6' }}>
                <div>
                  Stan licznika:&nbsp;
                  <strong>
                    {trip?.status === 'completed'
                      ? `${trip?.endOdometer} km`
                      : '............... km'}
                  </strong>
                </div>
                <div>
                  Godzina:&nbsp;
                  <strong>
                    {trip?.status === 'completed' && endDateTime
                      ? formatTime(endDateTime)
                      : '...............'}
                  </strong>
                </div>
                <div>
                  Data:&nbsp;
                  <strong>
                    {trip?.status === 'completed' && endDateTime
                      ? formatDate(endDateTime)
                      : '...............'}
                  </strong>
                </div>
              </div>
              <div style={{
                marginTop: isA5 ? '12px' : '16px',
                paddingTop: '4px',
                borderTop: `1px solid ${borderColor}`,
                textAlign: 'center',
                fontSize: isA5 ? '6px' : '8px',
                color: '#6b7280',
              }}>
                Podpis portiera
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

PolecenieWyjazdu.displayName = 'PolecenieWyjazdu';
export default PolecenieWyjazdu;
