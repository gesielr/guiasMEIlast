import re
import sys

def extract_strings(filename, min_len=4):
    with open(filename, "rb") as f:
        data = f.read()
        # Find sequences of printable characters
        # This is a simple "strings" implementation
        result = ""
        for char in data:
            if 32 <= char <= 126:
                result += chr(char)
            else:
                if len(result) >= min_len:
                    print(result)
                result = ""
        if len(result) >= min_len:
            print(result)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        extract_strings(sys.argv[1])
    else:
        print("Usage: python extract_strings.py <filename>")
