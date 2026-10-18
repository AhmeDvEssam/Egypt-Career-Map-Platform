import sys
import pypdfium2 as pdfium
import easyocr
import numpy as np

def run_ocr(pdf_path):
    reader = easyocr.Reader(['en'], verbose=False)
    pdf = pdfium.PdfDocument(pdf_path)
    full_text = []
    for i in range(len(pdf)):
        page = pdf[i]
        bitmap = page.render(scale=2)
        pil_image = bitmap.to_pil()
        img_array = np.array(pil_image)
        results = reader.readtext(img_array, detail=0)
        full_text.append('\n'.join(results))
    return '\n'.join(full_text)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python ocr_extractor.py <path_to_pdf>")
        sys.exit(1)
    pdf_path = sys.argv[1]
    text = run_ocr(pdf_path)
    # Output raw UTF-8 text to stdout
    sys.stdout.buffer.write(text.encode('utf-8'))
