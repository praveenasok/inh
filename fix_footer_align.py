import re

with open('inh-ratio-mix/script.js', 'r') as f:
    content = f.read()

# Add text-align: left; to all footer table cells to override global table td centering
content = content.replace('vertical-align: top;"><span style="color:#6366f1', 'vertical-align: top; text-align: left;"><span style="color:#6366f1')

with open('inh-ratio-mix/script.js', 'w') as f:
    f.write(content)
