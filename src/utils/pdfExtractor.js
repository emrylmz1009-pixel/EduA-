import * as pdfjsLib from 'pdfjs-dist';

// CDN based ESM worker for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs';

/**
 * Extracts all text page-by-page from a PDF file.
 * @param {File} file - The uploaded PDF file object.
 * @param {Function} [onProgress] - Callback to report percentage progress (0 to 100).
 * @returns {Promise<{text: string, pageCount: number}>}
 */
export async function extractTextFromPdf(file, onProgress) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    
    // Monitor loading progress
    loadingTask.onProgress = (progressData) => {
      if (onProgress && progressData.total > 0) {
        const percent = Math.round((progressData.loaded / progressData.total) * 100);
        onProgress(Math.min(percent, 40)); // First 40% is reading file bytes
      }
    };

    const pdf = await loadingTask.promise;
    let fullText = '';
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `--- Sayfa ${i} ---\n${pageText}\n\n`;
      
      if (onProgress) {
        const percent = 40 + Math.round((i / numPages) * 60); // Remaining 60% is parsing pages
        onProgress(percent);
      }
    }

    return {
      text: fullText.trim(),
      pageCount: numPages
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('PDF dosyası okunurken hata oluştu. Lütfen dosyanın bozuk olmadığından emin olun veya alternatif bir PDF deneyin.');
  }
}
