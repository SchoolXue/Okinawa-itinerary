import re

js_file = r'c:\Users\10804008\Desktop\antigravity\沖繩攻略\app.js'
with open(js_file, encoding='utf-8') as f:
    js = f.read()

# Fix getItem definition
js = js.replace('const getItem = (id) => getItem(getItem(id)) || HOTELS.find(h => h.id === id);', 
                'const getItem = (id) => ATTRACTIONS.find(a => a.id === id) || HOTELS.find(h => h.id === id);')

# Fix getItem(getItem(id)) usages
js = js.replace('getItem(getItem(', 'getItem(')

# Fix export modal
old_export = '''        dayIds.forEach((id, i) => {
          const a = getItem(id);
          if (a) {
            text +=    .  （）\\n;
            text +=       📍   🕐 約  小時  🎟️ \\n;
            dayHrs += a.timeHours;
            hasContent = true;
          }
        });'''

new_export = '''        dayIds.forEach((id, i) => {
          const a = getItem(id);
          if (a) {
            if (a.isHotel) {
              text +=    . 🏨 住宿: \\n;
              text +=       📍   💰 \\n;
            } else {
              text +=    .  （）\\n;
              text +=       📍   🕐 約  小時  🎟️ \\n;
              dayHrs += a.timeHours;
            }
            hasContent = true;
          }
        });'''

js = js.replace(old_export, new_export)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Fix applied.")
