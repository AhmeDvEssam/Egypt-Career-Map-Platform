import sys
import pypdfium2 as pdfium

def extract_pdf(pdf_path):
    try:
        pdf = pdfium.PdfDocument(pdf_path)
        pages_text = []
        for page in pdf:
            textpage = page.get_textpage()
            text = textpage.get_text_range()
            if text:
                pages_text.append(text)
        return "\n".join(pages_text).strip()
    except Exception as e:
        sys.stderr.write(f"PDFium extraction error: {e}\n")
        return ""

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(1)
    
    result = extract_pdf(sys.argv[1])
    sys.stdout.buffer.write(result.encode('utf-8'))
