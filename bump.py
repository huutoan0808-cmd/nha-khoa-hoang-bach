# -*- coding: utf-8 -*-
"""Doi so phien ban trong index.html de trinh duyet nhan ban moi."""
import io, re, sys
V = sys.argv[1] if len(sys.argv) > 1 else '1'
s = io.open('index.html', encoding='utf-8').read()
for f in ['app.css', 'qr.js', 'config.js', 'cloud.js', 'sync.js', 'importer.js', 'wards.js', 'app.js']:
    s = re.sub(re.escape(f) + r'(\?v=[\w.]+)?"', f + '?v=' + V + '"', s)
io.open('index.html', 'w', encoding='utf-8', newline='\n').write(s)
print('v=' + V)
