html_file = "/Users/praveenasok/Desktop/inhsuite/delegated-orders.html"

with open(html_file, "r") as f:
    lines = f.readlines()

import re

depth = 0
open_divs = []

for line_idx, line_content in enumerate(lines):
    line_num = line_idx + 1
    matches = re.finditer(r'(<div\b[^>]*>|</div>)', line_content, re.IGNORECASE)
    for m in matches:
        token = m.group(1)
        if token.startswith("<div"):
            depth += 1
            id_match = re.search(r'id=["\']([^"\']+)["\']', token)
            id_str = f" id='{id_match.group(1)}'" if id_match else ""
            open_divs.append((line_num, token.strip() + id_str))
        else:
            if open_divs:
                opened_line, opened_tag = open_divs.pop()
            else:
                print(f"L{line_num:03d}: ❌ CLOSE </div> with no matching open tag!")
            depth -= 1

print(f"Final depth at end of file: {depth}")
print(f"Remaining open divs:")
for line, tag in open_divs:
    print(f"  - L{line}: {tag}")
