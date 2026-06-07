import re

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any print("...❌...") with print("...[Error]...")
content = content.replace('print(f"❌ ', 'print(f"[Error] ')
content = content.replace('print(f"🚀 ', 'print(f"[Info] ')

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)
