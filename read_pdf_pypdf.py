import sys
import re

try:
    from pypdf import PdfReader
except ImportError:
    print("pypdf not installed")
    sys.exit(1)

def read_pdf(filename):
    try:
        reader = PdfReader(filename)
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text() + "\n"
        
        # Normalize text (remove newlines inside potential numbers)
        normalized = full_text.replace("\n", " ")
        
        # Look for the barcode pattern
        # 858 followed by digits/spaces/dashes
        # The line usually has 4 blocks of ~12 chars
        matches = re.findall(r"858[\d\s\.\-]{10,}", normalized)
        
        print("--- EXTRACTED BARCODES ---")
        for m in matches:
            # Clean up the match to see if it looks like a valid line
            clean = re.sub(r"[^\d]", "", m)
            if len(clean) >= 44:
                print(f"Original: {m}")
                print(f"Clean: {clean}")
                print(f"Length: {len(clean)}")

        print("\n--- FULL TEXT DUMP (First 500 chars) ---")
        print(full_text[:500])

    except Exception as e:
        print(f"Error reading PDF: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        read_pdf(sys.argv[1])
