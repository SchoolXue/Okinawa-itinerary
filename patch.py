import re, sys

js_file = r'c:\Users\10804008\Desktop\antigravity\沖繩攻略\app.js'
with open(js_file, encoding='utf-8') as f:
    js = f.read()

# 1. Add HOTELS array and getItem helper
insertion1 = '''  let HOTELS = [];
  const getItem = (id) => ATTRACTIONS.find(a => a.id === id) || HOTELS.find(h => h.id === id);'''

js = js.replace('  let activeAttractionId', insertion1 + '\n\n  let activeAttractionId')

# 2. Add initHotels() function
insertion2 = '''  // ── Init Hotels ─────────────────────────────────────────────
  function initHotels() {
    document.querySelectorAll('.hotel-card').forEach(card => {
      const h = {
        id: card.dataset.hotelId,
        name: card.dataset.hotelName,
        nameJp: '',
        emoji: card.dataset.hotelEmoji,
        regionLabel: card.dataset.hotelRegion,
        ticket: card.dataset.hotelPrice + ' / ' + card.dataset.hotelStars,
        timeHours: 0, // Hotels do not add sightseeing time
        isHotel: true
      };
      if(h.id) HOTELS.push(h);

      // Create "Add to itinerary" button for hotel
      const btn = document.createElement('button');
      btn.className = 'card-btn-add hotel-add-btn';
      btn.innerHTML = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>加入行程;
      
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDayPicker(h.id);
      });

      const row = card.querySelector('.hotel-info-row');
      if (row) row.appendChild(btn);
    });
  }
'''
js = js.replace('  // ── Itinerary init', insertion2 + '\n  // ── Itinerary init')

# 3. Add initHotels() call
js = js.replace('initItinerary();\n    buildAttractionCards();', 'initItinerary();\n    buildAttractionCards();\n    initHotels();')

# 4. Replace ATTRACTIONS.find
js = re.sub(r'ATTRACTIONS\.find\([a-zA-Z]+ => [a-zA-Z]+\.id === [a-zA-Z]+\)', r'getItem(\g<0>)', js) # This regex is too strict or wrong.
# Let's just do text replacements for the exact strings
js = js.replace('ATTRACTIONS.find(a => a.id === id)', 'getItem(id)')
js = js.replace('ATTRACTIONS.find(x => x.id === id)', 'getItem(id)')
js = js.replace('ATTRACTIONS.find(x => x.id === activeAttractionId)', 'getItem(activeAttractionId)')

# 5. Make day-item render hotel differently (e.g. no time, different color)
old_item_render = '''        const item = document.createElement('div');
        item.className = 'day-item';
        item.innerHTML = 
          <span class="day-item-emoji"></span>
          <div class="day-item-info">
            <div class="day-item-name"></div>
            <div class="day-item-time">約  小時</div>
          </div>
          <button class="day-item-remove" title="移除" aria-label="從第天移除">✕</button>
        ;'''

new_item_render = '''        const item = document.createElement('div');
        item.className = 'day-item' + (attr.isHotel ? ' hotel-day-item' : '');
        item.innerHTML = 
          <span class="day-item-emoji"></span>
          <div class="day-item-info">
            <div class="day-item-name"></div>
            <div class="day-item-time"></div>
          </div>
          <button class="day-item-remove" title="移除" aria-label="從第天移除">✕</button>
        ;'''
js = js.replace(old_item_render, new_item_render)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)

print("JS patched.")

css_file = r'c:\Users\10804008\Desktop\antigravity\沖繩攻略\style.css'
with open(css_file, encoding='utf-8') as f:
    css = f.read()

# Append CSS for hotel itinerary items and button
css_addon = '''
/* Hotel itinerary item */
.hotel-day-item { background: rgba(14,165,233,.2); border: 1px solid rgba(14,165,233,.3); }
.hotel-day-item .day-item-name { color: #bae6fd; }

/* Hotel Add Button */
.hotel-add-btn {
  padding: 6px 12px; font-size: .75rem; 
  background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;
  border-radius: var(--radius-md); display: flex; align-items: center; gap: 4px;
  cursor: pointer; transition: var(--ease-smooth); font-weight: 600;
}
.hotel-add-btn:hover { background: #15803d; color: white; }
'''
if '.hotel-day-item' not in css:
    css += css_addon
    with open(css_file, 'w', encoding='utf-8') as f:
        f.write(css)
    print("CSS patched.")

