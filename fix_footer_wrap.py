import re

with open('inh-ratio-mix/script.js', 'r') as f:
    content = f.read()

# Add white-space: nowrap; to prevent wrapping in the footer table
content = content.replace('vertical-align: top; text-align: left;"><span style="color:#6366f1', 'vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1')

with open('inh-ratio-mix/script.js', 'w') as f:
    f.write(content)
