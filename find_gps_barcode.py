import re
import sys

def find_barcode(filename):
    with open(filename, "rb") as f:
        data = f.read()
        # Look for sequences starting with 858 and having around 44 digits
        # The PDF might have it split or encoded, but often it's in clear text if it's a text object
        # Or in the metadata/keywords
        
        # Try to find the digitizable line format: 85810000001-8 ...
        # Regex for digitizable line parts
        text = ""
        for char in data:
            if 32 <= char <= 126:
                text += chr(char)
            else:
                text += " "
        
        # Look for 858... pattern
        matches = re.findall(r"858\d{8,}", text)
        for m in matches:
            print(f"Found candidate: {m}")

        # Look for formatted digitizable line
        matches_formatted = re.findall(r"858\d{10}-\d", text)
        for m in matches_formatted:
            print(f"Found formatted: {m}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        find_barcode(sys.argv[1])
