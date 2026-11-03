import sys
import pypdfium2 as pdfium

def extract_text(pdf_path):
    pdf = pdfium.PdfDocument(pdf_path)
    extracted = []
    for i, page in enumerate(pdf):
        textpage = page.get_textpage()
        text = textpage.get_text_range()
        if text:
            extracted.append(text)
    
    full_text = "\n".join(extracted).strip()
    
    # If text is empty or very short, try OCR fallback
    if len(full_text) < 50:
        try:
            import easyocr
            import numpy as np
            reader = easyocr.Reader(['en', 'ar'], verbose=False)
            ocr_pages = []
            for page in pdf:
                bitmap = page.render(scale=2)
                pil_image = bitmap.to_pil()
                img_array = np.array(pil_image)
                results = reader.readtext(img_array, detail=0)
                ocr_pages.append("\n".join(results))
            full_text = "\n".join(ocr_pages).strip()
        except Exception as e:
            pass

    return full_text

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python pdf_extractor.py <file>")
        sys.exit(1)
    
    res = extract_text(sys.argv[1])
    sys.stdout.buffer.write(res.encode('utf-8'))
