import pypdf

def extract_text(pdf_path, out_path):
    with open(pdf_path, 'rb') as file:
        reader = pypdf.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        with open(out_path, 'w', encoding='utf-8') as out_file:
            out_file.write(text)

extract_text('The Mosaic Chase - Chronological Independent Blueprint.pdf', 'pdf_text.txt')
