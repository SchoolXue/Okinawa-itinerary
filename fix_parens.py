js_file = r'c:\Users\10804008\Desktop\antigravity\沖繩攻略\app.js'
with open(js_file, encoding='utf-8') as f:
    js = f.read()

js = js.replace('getItem(id))', 'getItem(id)')
js = js.replace('getItem(activeAttractionId))', 'getItem(activeAttractionId)')

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Parens fixed.")
