// ============================================================
//  沖繩旅遊攻略 - 主要互動邏輯 (v2)
// ============================================================

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  let activeAttractionId = null;
  let activeFilter       = 'all';
  let numDays            = 3;
  const MAX_DAYS         = 7;
  const MIN_DAYS         = 1;
  const MAX_PER_DAY      = 8;

  // itinerary[dayIndex] = [ attractionId, ... ]
  let itinerary = [];

  // ── DOM Refs ────────────────────────────────────────────────
  const attractionsGrid   = document.getElementById('attractions-grid');
  const filterCount       = document.getElementById('filter-count');
  const detailSection     = document.getElementById('detail-section');
  const detailImage       = document.getElementById('detail-image');
  const detailRegionBadge = document.getElementById('detail-region-badge');
  const detailRating      = document.getElementById('detail-rating');
  const detailCategory    = document.getElementById('detail-category');
  const detailName        = document.getElementById('detail-name');
  const detailNameJp      = document.getElementById('detail-name-jp');
  const detailTags        = document.getElementById('detail-tags');
  const detailDesc        = document.getElementById('detail-desc');
  const infoTimeVal       = document.getElementById('info-time-val');
  const infoTicketVal     = document.getElementById('info-ticket-val');
  const infoHoursVal      = document.getElementById('info-hours-val');
  const infoAccessVal     = document.getElementById('info-access-val');
  const detailTipsList    = document.getElementById('detail-tips-list');
  const detailCloseBtn    = document.getElementById('detail-close-btn');
  const detailAddBtn      = document.getElementById('detail-add-btn');
  const dayPicker         = document.getElementById('day-picker');
  const dayPickerDays     = document.getElementById('day-picker-days');
  const dayPickerClose    = document.getElementById('day-picker-close');
  const daysCountEl       = document.getElementById('days-count');
  const daysMinus         = document.getElementById('days-minus');
  const daysPlus          = document.getElementById('days-plus');
  const itineraryDaysEl   = document.getElementById('itinerary-days');
  const clearItinBtn      = document.getElementById('clear-itinerary');
  const exportItinBtn     = document.getElementById('export-itinerary');
  const exportModal       = document.getElementById('export-modal-overlay');
  const exportText        = document.getElementById('export-text');
  const exportClose       = document.getElementById('export-close');
  const copyBtn           = document.getElementById('copy-btn');
  const summaryTotal      = document.getElementById('summary-total');
  const summaryTime       = document.getElementById('summary-time');

  // ── Init ────────────────────────────────────────────────────
  function init() {
    initItinerary();
    buildAttractionCards();
    bindMapMarkers();
    bindFilterButtons();
    bindMapOverviewRegions();
    bindItineraryControls();
    bindDetailPanel();
    observeCards();
    restoreFromLocalStorage();
    renderItineraryDays();
    updateSummary();
  }

  // ── Itinerary init ──────────────────────────────────────────
  function initItinerary() {
    itinerary = Array.from({ length: MAX_DAYS }, () => []);
  }

  // ── Build cards ─────────────────────────────────────────────
  function buildAttractionCards() {
    attractionsGrid.innerHTML = '';
    const regionColors = { north: '#3b82f6', central: '#10b981', south: '#ef4444' };
    const regionNames  = { north: '北部', central: '中部', south: '南部・那霸' };

    ATTRACTIONS.forEach(attr => {
      const card = document.createElement('div');
      card.className = 'attraction-card';
      card.dataset.id = attr.id;
      card.dataset.region = attr.region;
      card.setAttribute('role', 'article');
      card.setAttribute('aria-label', attr.name);

      card.innerHTML = `
        <div class="card-image-wrap">
          <img class="card-image" src="${attr.image}" alt="${attr.name}" loading="lazy"/>
          <div class="card-region-tag" style="background:${regionColors[attr.region]}">${regionNames[attr.region]}</div>
          <div class="card-rating-tag">⭐ ${attr.rating}</div>
        </div>
        <div class="card-body">
          <div class="card-category">${attr.category}</div>
          <div class="card-name">${attr.name}</div>
          <div class="card-name-jp">${attr.nameJp}</div>
          <p class="card-desc">${attr.desc}</p>
          <div class="card-tags">${attr.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
          <div class="card-actions">
            <button class="card-btn-detail" data-id="${attr.id}" aria-label="查看${attr.name}詳細資訊">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              查看詳細資訊
            </button>
            <button class="card-btn-add" data-id="${attr.id}" aria-label="將${attr.name}加入行程">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              加入行程
            </button>
          </div>
        </div>
      `;

      // Set fallback image
      const img = card.querySelector('.card-image');
      img.onerror = function () { this.src = attr.fallback; this.onerror = null; };

      // ── DETAIL button (the fix: directly on the button, not the card) ──
      card.querySelector('.card-btn-detail').addEventListener('click', function (e) {
        e.stopPropagation();
        showDetail(attr.id);
      });

      // ── ADD TO ITINERARY button ──
      card.querySelector('.card-btn-add').addEventListener('click', function (e) {
        e.stopPropagation();
        showDetail(attr.id);      // also open detail so user sees context
        openDayPicker(attr.id);   // then show the day picker
      });

      attractionsGrid.appendChild(card);
    });

    updateFilterCount();
  }

  // ── Show detail (slides in BELOW the attractions grid) ──────
  function showDetail(id) {
    const attr = ATTRACTIONS.find(a => a.id === id);
    if (!attr) return;

    // Don't re-animate if same card clicked
    const isSame = activeAttractionId === id && detailSection.style.display !== 'none';
    activeAttractionId = id;

    // Populate
    detailImage.src = attr.image;
    detailImage.alt = attr.name;
    detailImage.onerror = function () { this.src = attr.fallback; this.onerror = null; };
    detailRegionBadge.textContent = attr.regionLabel;
    detailRating.textContent      = `⭐ ${attr.rating}`;
    detailCategory.textContent    = attr.category;
    detailName.textContent        = attr.name;
    detailNameJp.textContent      = attr.nameJp;
    detailDesc.textContent        = attr.desc;
    infoTimeVal.textContent       = attr.timeNeeded;
    infoTicketVal.textContent     = attr.ticket;
    infoHoursVal.textContent      = attr.hours;
    infoAccessVal.textContent     = attr.access;
    detailTags.innerHTML          = attr.tags.map(t => `<span class="tag">${t}</span>`).join('');
    detailTipsList.innerHTML      = attr.tips.map(t => `<li>${t}</li>`).join('');

    // Show section
    detailSection.style.display = 'block';
    if (!isSame) {
      detailSection.style.animation = 'none';
      void detailSection.offsetWidth;
      detailSection.style.animation = 'fadeInDown .4s ease both';
    }

    // Scroll to detail
    setTimeout(() => {
      detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);

    // Highlight card
    updateActiveCard(id);
    updateMarkerStates(id);
  }

  // ── Close detail panel ──────────────────────────────────────
  function closeDetail() {
    detailSection.style.display = 'none';
    activeAttractionId = null;
    dayPicker.style.display = 'none';
    document.querySelectorAll('.attraction-card').forEach(c => c.classList.remove('is-active'));
    document.querySelectorAll('.marker-group').forEach(m => m.classList.remove('active-marker', 'dimmed'));
  }

  // ── Update active card highlight ────────────────────────────
  function updateActiveCard(id) {
    document.querySelectorAll('.attraction-card').forEach(c => {
      c.classList.toggle('is-active', c.dataset.id === id);
    });
  }

  // ── Update map marker states ─────────────────────────────────
  function updateMarkerStates(activeId) {
    document.querySelectorAll('.marker-group').forEach(m => {
      m.classList.remove('active-marker', 'dimmed');
      if (m.dataset.id === activeId) {
        m.classList.add('active-marker');
      } else {
        m.classList.add('dimmed');
      }
    });
  }

  // ── Bind map markers ────────────────────────────────────────
  function bindMapMarkers() {
    document.querySelectorAll('.marker-group').forEach(marker => {
      const id = marker.dataset.id;
      marker.addEventListener('click', () => {
        showDetail(id);
        // On mobile, scroll to detail which is below grid
        if (window.innerWidth < 900) {
          document.getElementById('attractions-section').scrollIntoView({ behavior: 'smooth' });
        }
      });
      marker.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(id); }
      });
    });
  }

  // ── Bind map overview region cards ──────────────────────────
  function bindMapOverviewRegions() {
    ['north', 'central', 'south'].forEach(region => {
      const el = document.getElementById(`ov-${region}`);
      if (!el) return;
      el.addEventListener('click', () => {
        // Activate that filter
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.filter-btn[data-filter="${region}"]`);
        if (btn) btn.classList.add('active');
        activeFilter = region;
        filterAttractions(region);
        filterMapMarkers(region);
        // Scroll to attractions
        document.getElementById('attractions-section').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // ── Bind filter buttons ──────────────────────────────────────
  function bindFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        filterAttractions(activeFilter);
        filterMapMarkers(activeFilter);
        // If active detail is not in this filter, close it
        if (activeAttractionId) {
          const a = ATTRACTIONS.find(x => x.id === activeAttractionId);
          if (activeFilter !== 'all' && a?.region !== activeFilter) closeDetail();
        }
      });
    });
  }

  function filterAttractions(filter) {
    let count = 0;
    document.querySelectorAll('.attraction-card').forEach(card => {
      const show = filter === 'all' || card.dataset.region === filter;
      card.classList.toggle('hidden', !show);
      if (show) count++;
    });
    if (filterCount) {
      const label = filter === 'all' ? '全部' : { north: '北部', central: '中部', south: '南部' }[filter];
      filterCount.textContent = `顯示 ${count} 個${label}景點`;
    }
  }

  function filterMapMarkers(filter) {
    document.querySelectorAll('.marker-group').forEach(m => {
      m.classList.remove('dimmed');
      if (filter !== 'all' && m.dataset.region !== filter) m.classList.add('dimmed');
    });
    document.querySelectorAll('.island-land').forEach(l => {
      l.classList.toggle('dimmed-land', filter !== 'all' && l.dataset.region !== filter);
    });
  }

  function updateFilterCount() {
    if (filterCount) filterCount.textContent = `顯示 ${ATTRACTIONS.length} 個景點`;
  }

  // ── Detail panel controls ────────────────────────────────────
  function bindDetailPanel() {
    detailCloseBtn.addEventListener('click', closeDetail);
    detailAddBtn.addEventListener('click', () => {
      if (dayPicker.style.display === 'none') {
        openDayPicker(activeAttractionId);
      } else {
        dayPicker.style.display = 'none';
      }
    });
    dayPickerClose.addEventListener('click', () => { dayPicker.style.display = 'none'; });
    // Close picker on outside click
    document.addEventListener('click', e => {
      if (!dayPicker.contains(e.target) && e.target !== detailAddBtn && !detailAddBtn.contains(e.target)) {
        dayPicker.style.display = 'none';
      }
    }, true);
  }

  // ── Day picker ───────────────────────────────────────────────
  function openDayPicker(attractionId) {
    if (!attractionId) return;
    dayPickerDays.innerHTML = '';
    for (let d = 0; d < numDays; d++) {
      const isFull = itinerary[d].length >= MAX_PER_DAY;
      const isAdded = itinerary[d].includes(attractionId);
      const btn = document.createElement('button');
      btn.className = 'day-picker-btn' + (isFull && !isAdded ? ' day-full' : '');
      btn.textContent = isAdded ? `✓ 第 ${d+1} 天` : `第 ${d+1} 天`;
      btn.style.background = isAdded ? 'rgba(21,128,61,0.15)' : '';
      btn.style.color = isAdded ? '#15803d' : '';
      if (!isFull || isAdded) {
        btn.addEventListener('click', () => {
          if (isAdded) {
            removeFromDay(d, attractionId);
          } else {
            addToDay(d, attractionId);
          }
          dayPicker.style.display = 'none';
        });
      }
      dayPickerDays.appendChild(btn);
    }
    dayPicker.style.display = 'block';
  }

  // ── Itinerary add / remove ────────────────────────────────────
  function addToDay(dayIndex, attractionId) {
    if (itinerary[dayIndex].length >= MAX_PER_DAY) return;
    if (itinerary[dayIndex].includes(attractionId)) return;
    itinerary[dayIndex].push(attractionId);
    saveToLocalStorage();
    renderItineraryDays();
    updateSummary();
    showToast(`已加入第 ${dayIndex + 1} 天行程 ✓`);
  }

  function removeFromDay(dayIndex, attractionId) {
    itinerary[dayIndex] = itinerary[dayIndex].filter(id => id !== attractionId);
    saveToLocalStorage();
    renderItineraryDays();
    updateSummary();
  }

  // ── Render itinerary days ────────────────────────────────────
  function renderItineraryDays() {
    itineraryDaysEl.innerHTML = '';
    for (let d = 0; d < numDays; d++) {
      const dayIds = itinerary[d] || [];
      const totalHrs = dayIds.reduce((sum, id) => {
        const a = ATTRACTIONS.find(x => x.id === id);
        return sum + (a ? a.timeHours : 0);
      }, 0);

      const card = document.createElement('div');
      card.className = 'day-card';
      card.dataset.day = d;

      const statsText = dayIds.length
        ? `${dayIds.length} 個景點・約 ${totalHrs} 小時`
        : '尚未加入景點';

      card.innerHTML = `
        <div class="day-header">
          <div class="day-num">第 ${d + 1} 天</div>
          <div class="day-stats">${statsText}</div>
        </div>
        <div class="day-attractions" id="day-list-${d}">
          ${dayIds.length === 0 ? `<div class="day-empty">點擊景點卡片的「加入行程」<br/>將景點加入此天行程</div>` : ''}
        </div>
      `;

      itineraryDaysEl.appendChild(card);

      const listEl = card.querySelector(`#day-list-${d}`);
      dayIds.forEach(id => {
        const attr = ATTRACTIONS.find(a => a.id === id);
        if (!attr) return;
        const item = document.createElement('div');
        item.className = 'day-item';
        item.innerHTML = `
          <span class="day-item-emoji">${attr.emoji}</span>
          <div class="day-item-info">
            <div class="day-item-name">${attr.name}</div>
            <div class="day-item-time">約 ${attr.timeHours} 小時</div>
          </div>
          <button class="day-item-remove" title="移除" aria-label="從第${d+1}天移除${attr.name}">✕</button>
        `;
        item.querySelector('.day-item-remove').addEventListener('click', () => removeFromDay(d, id));
        listEl.appendChild(item);
      });
    }
  }

  // ── Summary ──────────────────────────────────────────────────
  function updateSummary() {
    const allIds = itinerary.slice(0, numDays).flat();
    const unique = [...new Set(allIds)];
    const totalHrs = unique.reduce((sum, id) => {
      const a = ATTRACTIONS.find(x => x.id === id);
      return sum + (a ? a.timeHours : 0);
    }, 0);
    summaryTotal.textContent = `📍 共規劃 ${unique.length} 個景點`;
    summaryTime.textContent  = `⏱️ 預計遊覽時間 ${totalHrs} 小時（不含交通）`;
  }

  // ── Itinerary controls ───────────────────────────────────────
  function bindItineraryControls() {
    daysMinus.addEventListener('click', () => {
      if (numDays > MIN_DAYS) { numDays--; daysCountEl.textContent = numDays; renderItineraryDays(); updateSummary(); }
    });
    daysPlus.addEventListener('click', () => {
      if (numDays < MAX_DAYS) { numDays++; daysCountEl.textContent = numDays; renderItineraryDays(); updateSummary(); }
    });
    clearItinBtn.addEventListener('click', () => {
      if (confirm('確定要清除所有行程安排嗎？')) {
        initItinerary();
        saveToLocalStorage();
        renderItineraryDays();
        updateSummary();
        showToast('行程已清除');
      }
    });
    exportItinBtn.addEventListener('click', showExportModal);
    exportClose.addEventListener('click', () => { exportModal.style.display = 'none'; });
    exportModal.addEventListener('click', e => { if (e.target === exportModal) exportModal.style.display = 'none'; });
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(exportText.textContent)
        .then(() => { showToast('已複製到剪貼簿 ✓'); exportModal.style.display = 'none'; })
        .catch(() => showToast('複製失敗，請手動選取文字'));
    });
  }

  // ── Export modal ──────────────────────────────────────────────
  function showExportModal() {
    let text = '🌺 我的沖繩旅遊行程\n' + '═'.repeat(30) + '\n\n';
    let hasContent = false;
    for (let d = 0; d < numDays; d++) {
      const dayIds = itinerary[d] || [];
      text += `📅 第 ${d + 1} 天\n`;
      if (dayIds.length === 0) {
        text += '   （尚未安排景點）\n';
      } else {
        let dayHrs = 0;
        dayIds.forEach((id, i) => {
          const a = ATTRACTIONS.find(x => x.id === id);
          if (a) {
            text += `   ${i + 1}. ${a.emoji} ${a.name}（${a.nameJp}）\n`;
            text += `      📍 ${a.regionLabel}  🕐 約 ${a.timeHours} 小時  🎟️ ${a.ticket}\n`;
            dayHrs += a.timeHours;
            hasContent = true;
          }
        });
        text += `   ⏱️ 當日合計約 ${dayHrs} 小時\n`;
      }
      text += '\n';
    }
    if (!hasContent) text += '（行程尚未安排任何景點）\n';
    text += '─'.repeat(30) + '\n';
    text += '由 沖繩旅遊攻略 生成 🌺\n';
    exportText.textContent = text;
    exportModal.style.display = 'flex';
  }

  // ── Toast notification ────────────────────────────────────────
  function showToast(msg) {
    let toast = document.getElementById('okinawa-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'okinawa-toast';
      toast.style.cssText = `
        position:fixed; bottom:28px; left:50%; transform:translateX(-50%);
        background:#0f172a; color:white; padding:10px 22px;
        border-radius:9999px; font-family:'Noto Sans TC',sans-serif;
        font-size:.85rem; font-weight:600; z-index:9999;
        box-shadow:0 8px 32px rgba(0,0,0,.3);
        transition:opacity .3s ease, transform .3s ease;
        pointer-events:none;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
    }, 2400);
  }

  // ── LocalStorage ──────────────────────────────────────────────
  function saveToLocalStorage() {
    try { localStorage.setItem('okinawa_itinerary', JSON.stringify(itinerary)); } catch (e) {}
  }
  function restoreFromLocalStorage() {
    try {
      const saved = localStorage.getItem('okinawa_itinerary');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge into current itinerary array
        parsed.forEach((day, i) => { if (i < MAX_DAYS) itinerary[i] = day; });
      }
    } catch (e) {}
  }

  // ── Intersection Observer (fade-in cards) ────────────────────
  function observeCards() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.style.transitionDelay = `${(i % 6) * 60}ms`;
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          io.unobserve(el);
        }
      });
    }, { threshold: 0.08 });

    document.querySelectorAll('.attraction-card, .tips-card').forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(22px)';
      card.style.transition = 'opacity .5s ease, transform .5s ease';
      io.observe(card);
    });
  }

  // ── Hotel Region Tabs ────────────────────────────────────────
  function initHotelTabs() {
    const tabs   = document.querySelectorAll('.hotel-tab');
    const panels = document.querySelectorAll('.hotel-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        panels.forEach(p => { p.style.display = 'none'; });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const panel = document.getElementById(`hpanel-${target}`);
        if (panel) {
          panel.style.display = 'block';
          panel.style.animation = 'none';
          void panel.offsetWidth;
          panel.style.animation = 'fadeInUp .35s ease both';
        }
      });
    });
  }

  // ── Start ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => { init(); initHotelTabs(); });

})();
