import jsPDF from 'jspdf';

const MM_TO_PX = 96 / 25.4;

const getPageSize = (format) => (
  format === 'A5'
    ? { width: 148, height: 210 }
    : { width: 210, height: 297 }
);

const waitForPaint = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

const liftDocumentTextOnClone = (clonedDocument, selector) => {
  const documentElement = clonedDocument.querySelector(selector);
  if (!documentElement) {
    throw new Error(`Nie znaleziono dokumentu ${selector} w kopii do eksportu`);
  }

  const walker = clonedDocument.createTreeWalker(
    documentElement,
    clonedDocument.defaultView.NodeFilter.SHOW_TEXT
  );
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.textContent.trim() && !node.parentElement.closest('style, script')) {
      textNodes.push(node);
    }
  }

  textNodes.forEach((node) => {
    const text = clonedDocument.createElement('span');
    text.style.position = 'relative';
    text.style.top = '-1mm';
    node.parentNode.replaceChild(text, node);
    text.appendChild(node);
  });
};

export const generatePdfFromElement = async (element, format = 'A4') => {
  if (!element) {
    throw new Error('Brak elementu do konwersji');
  }

  const html2canvas = (await import('html2canvas')).default;
  const page = getPageSize(format);
  const pageWidthPx = Math.round(page.width * MM_TO_PX);

  await waitForPaint();

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: Math.max(pageWidthPx, element.scrollWidth || pageWidthPx),
    height: Math.max(page.height * MM_TO_PX, element.scrollHeight || page.height * MM_TO_PX),
    windowWidth: Math.max(pageWidthPx, element.scrollWidth || pageWidthPx),
    windowHeight: Math.max(page.height * MM_TO_PX, element.scrollHeight || page.height * MM_TO_PX),
    scrollX: 0,
    scrollY: 0,
    onclone: element.getAttribute('data-print-document') === 'karta-drogowa'
      ? (clonedDocument) => liftDocumentTextOnClone(clonedDocument, '[data-print-document="karta-drogowa"]')
      : element.id === 'polecenie-wyjazdu-print'
        ? (clonedDocument) => liftDocumentTextOnClone(clonedDocument, '#polecenie-wyjazdu-print')
        : undefined,
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('Canvas ma zerowe wymiary');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: format === 'A5' ? 'a5' : 'a4',
    compress: true,
  });

  const imageRatio = canvas.width / canvas.height;
  const pageRatio = page.width / page.height;

  let imageWidth = page.width;
  let imageHeight = page.height;

  if (imageRatio > pageRatio) {
    imageHeight = page.width / imageRatio;
  } else {
    imageWidth = page.height * imageRatio;
  }

  const x = (page.width - imageWidth) / 2;
  const y = (page.height - imageHeight) / 2;

  pdf.addImage(
    canvas.toDataURL('image/png'),
    'PNG',
    x,
    y,
    imageWidth,
    imageHeight,
    undefined,
    'FAST'
  );

  return pdf;
};

export const generatePdfFromElements = async (elements, format = 'A4') => {
  const validElements = elements.filter(Boolean);
  if (!validElements.length) {
    throw new Error('Brak dokumentów do konwersji');
  }

  const canvases = [];
  for (const element of validElements) {
    const html2canvas = (await import('html2canvas')).default;
    const page = getPageSize(format);
    const pageWidthPx = Math.round(page.width * MM_TO_PX);
    await waitForPaint();
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: Math.max(pageWidthPx, element.scrollWidth || pageWidthPx),
      height: element.scrollHeight || undefined,
      windowWidth: Math.max(pageWidthPx, element.scrollWidth || pageWidthPx),
      windowHeight: element.scrollHeight || page.height * 10,
      scrollX: 0,
      scrollY: 0,
      onclone: element.getAttribute('data-print-document') === 'karta-drogowa'
        ? (clonedDocument) => liftDocumentTextOnClone(clonedDocument, '[data-print-document="karta-drogowa"]')
        : element.id === 'polecenie-wyjazdu-print'
          ? (clonedDocument) => liftDocumentTextOnClone(clonedDocument, '#polecenie-wyjazdu-print')
          : undefined,
    });
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas ma zerowe wymiary');
    }
    canvases.push(canvas);
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: format === 'A5' ? 'a5' : 'a4',
    compress: true,
  });

  canvases.forEach((canvas, index) => {
    if (index > 0) pdf.addPage();
    const page = getPageSize(format);
    const imageRatio = canvas.width / canvas.height;
    const pageRatio = page.width / page.height;

    let imageWidth = page.width;
    let imageHeight = page.height;

    if (imageRatio > pageRatio) {
      imageHeight = page.width / imageRatio;
    } else {
      imageWidth = page.height * imageRatio;
    }

    const x = (page.width - imageWidth) / 2;
    const y = (page.height - imageHeight) / 2;
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      x,
      y,
      imageWidth,
      imageHeight,
      undefined,
      'FAST'
    );
  });

  return pdf;
};
