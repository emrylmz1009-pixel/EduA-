import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extracts all text page-by-page from a PDF file.
 * @param {File} file - The uploaded PDF file object.
 * @param {Function} [onProgress] - Callback to report percentage progress (0 to 100).
 * @param {number} [startPage] - The page number to start extraction (1-indexed).
 * @param {number} [endPage] - The page number to stop extraction (inclusive).
 * @returns {Promise<{text: string, pageCount: number}>}
 */
export async function extractTextFromPdf(file, onProgress, startPage = 1, endPage = null) {
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
    
    // Validate range
    const start = Math.max(1, Math.min(startPage, numPages));
    const end = endPage ? Math.max(start, Math.min(endPage, numPages)) : numPages;

    for (let i = start; i <= end; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `--- Sayfa ${i} ---\n${pageText}\n\n`;
      
      if (onProgress) {
        const totalPagesToExtract = (end - start) + 1;
        const currentExtracted = (i - start) + 1;
        const percent = 40 + Math.round((currentExtracted / totalPagesToExtract) * 60);
        onProgress(percent);
      }
    }

    return {
      text: fullText.trim(),
      pageCount: numPages,
      extractedRange: `${start}-${end}`
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('PDF dosyası okunurken hata oluştu. Lütfen dosyanın bozuk olmadığından emin olun veya alternatif bir PDF deneyin.');
  }
}
