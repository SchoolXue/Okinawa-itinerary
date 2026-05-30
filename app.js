// ============================================================
//  沖繩旅遊攻略 - 主要互動邏輯 (v2)
// ============================================================

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  let HOTELS = [];
  const getItem = (id) => ATTRACTIONS.find(a => a.id === id) || HOTELS.find(h => h.id === id);

  let activeAttractionId = null;
  let activeFilter       = 'all';
  let numDays            = 5;
  const MAX_DAYS         = 7;
  const MIN_DAYS         = 1;
  const MAX_PER_DAY      = 8;

  // New state for 6 features
  let notes     = {};     // notes["dayIdx_id"] = text
  let startDate = null;   // ISO date string or null
  let dragState = null;   // { fromDay, fromId }

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
  const dayPickerOverlay  = document.getElementById('day-picker-overlay');
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
  const pdfItinBtn        = document.getElementById('pdf-itinerary');
  const shareItinBtn      = document.getElementById('share-itinerary');
  const searchInput       = document.getElementById('attraction-search');
  const startDateInput    = document.getElementById('start-date');
  const summaryTotal      = document.getElementById('summary-total');
  const summaryTime       = document.getElementById('summary-time');

  // ── Init ────────────────────────────────────────────────────
  function init() {
    initItinerary();
    buildAttractionCards();
    initHotels();
    bindMapMarkers();
    bindFilterButtons();
    bindMapOverviewRegions();
    bindItineraryControls();
    bindDetailPanel();
    observeCards();
    checkShareHash();            // ← restore from URL hash if present
    restoreFromLocalStorage();   // ← then overlay with localStorage
    renderItineraryDays();
    updateSummary();
  }

  // ── Init Hotels ─────────────────────────────────────────────
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
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>加入行程`;
      
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDayPicker(h.id);
      });

      const row = card.querySelector('.hotel-info-row');
      if (row) row.appendChild(btn);
    });
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
    // Only show detail for attractions (not hotels)
    const attr = ATTRACTIONS.find(a => a.id === id);
    if (!attr) return;

    // Don't re-animate if same card clicked
    const isSame = activeAttractionId === id && detailSection.style.display !== 'none';
    activeAttractionId = id;

    // Populate
    detailImage.src = attr.image || '';
    detailImage.alt = attr.name;
    detailImage.onerror = function () { this.src = attr.fallback || ''; this.onerror = null; };
    detailRegionBadge.textContent = attr.regionLabel  || '';
    detailRating.textContent      = attr.rating ? `⭐ ${attr.rating}` : '';
    detailCategory.textContent    = attr.category     || '';
    detailName.textContent        = attr.name         || '';
    detailNameJp.textContent      = attr.nameJp       || '';
    detailDesc.textContent        = attr.desc         || '';
    infoTimeVal.textContent       = attr.timeNeeded   || '';
    infoTicketVal.textContent     = attr.ticket       || '';
    infoHoursVal.textContent      = attr.hours        || '';
    infoAccessVal.textContent     = attr.access       || '';
    detailTags.innerHTML          = (attr.tags  || []).map(t => `<span class="tag">${t}</span>`).join('');
    detailTipsList.innerHTML      = (attr.tips  || []).map(t => `<li>${t}</li>`).join('');

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
    closeDayPicker();
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
        applyFilters();
        if (activeAttractionId) {
          const a = getItem(activeAttractionId);
          if (activeFilter !== 'all' && a?.region !== activeFilter) closeDetail();
        }
      });
    });
    if (searchInput) {
      searchInput.addEventListener('input', () => applyFilters());
      // ESC clears search
      searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') { searchInput.value = ''; applyFilters(); } });
    }
  }

  // ── Combined filter: region + search term ──────────────────────
  function applyFilters() {
    const term = searchInput ? searchInput.value.trim().toLowerCase() : '';
    let count = 0;
    document.querySelectorAll('.attraction-card').forEach(card => {
      const attr = ATTRACTIONS.find(a => a.id === card.dataset.id);
      const matchRegion = activeFilter === 'all' || card.dataset.region === activeFilter;
      const matchSearch = !term || !attr ? true : [
        attr.name, attr.nameJp, attr.category, attr.regionLabel,
        ...(attr.tags || []), attr.desc || ''
      ].some(s => s && s.toLowerCase().includes(term));
      const show = matchRegion && matchSearch;
      card.classList.toggle('hidden', !show);
      if (show) count++;
    });
    if (filterCount) {
      const regionLabel = { north:'北部', central:'中部', south:'南部' }[activeFilter] || '';
      if (term) {
        filterCount.textContent = `搜尋「${searchInput.value.trim()}」：${count} 個景點`;
      } else {
        filterCount.textContent = `顯示 ${count} 個${regionLabel}景點`;
      }
    }
    filterMapMarkers(activeFilter);
  }

  function filterAttractions(filter) {
    activeFilter = filter;
    applyFilters();
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
    detailAddBtn.addEventListener('click', () => openDayPicker(activeAttractionId));
    dayPickerClose.addEventListener('click', closeDayPicker);
    // Close picker when clicking outside the modal box
    if (dayPickerOverlay) {
      dayPickerOverlay.addEventListener('click', e => {
        if (e.target === dayPickerOverlay) closeDayPicker();
      });
    }
    // ESC key closes picker
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDayPicker();
    });
  }

  // ── Day picker ───────────────────────────────────────────────
  function openDayPicker(attractionId) {
    if (!attractionId) return;
    const item    = getItem(attractionId);
    const titleEl = dayPicker ? dayPicker.querySelector('.day-picker-title') : null;
    if (titleEl) {
      titleEl.textContent = item
        ? `🗓️ 將「${item.name}」加入…`
        : '🗓️ 選擇要加入第幾天';
    }
    dayPickerDays.innerHTML = '';
    for (let d = 0; d < numDays; d++) {
      const isFull  = itinerary[d].length >= MAX_PER_DAY;
      const isAdded = itinerary[d].includes(attractionId);
      const btn = document.createElement('button');
      btn.className = 'day-picker-btn' + (isFull && !isAdded ? ' day-full' : '');
      btn.textContent = isAdded ? `✓ 第 ${d+1} 天` : `第 ${d+1} 天`;
      if (isAdded) {
        btn.style.background  = 'rgba(21,128,61,0.12)';
        btn.style.color       = '#15803d';
        btn.style.borderColor = 'rgba(21,128,61,0.35)';
      }
      if (!isFull || isAdded) {
        btn.addEventListener('click', () => {
          if (isAdded) removeFromDay(d, attractionId);
          else         addToDay(d, attractionId);
          closeDayPicker();
        });
      }
      dayPickerDays.appendChild(btn);
    }
    if (dayPickerOverlay) dayPickerOverlay.style.display = 'flex';
  }

  function closeDayPicker() {
    if (dayPickerOverlay) dayPickerOverlay.style.display = 'none';
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

  // ── Render itinerary days (with DnD, notes, date labels) ───────
  function renderItineraryDays() {
    itineraryDaysEl.innerHTML = '';

    for (let d = 0; d < numDays; d++) {
      const dayIds = itinerary[d] || [];
      const totalHrs = dayIds.reduce((sum, id) => {
        const a = getItem(id); return sum + (a && !a.isHotel ? a.timeHours : 0);
      }, 0);

      // Date label
      let dateLabel = '';
      if (startDate) {
        const dt = new Date(startDate + 'T00:00:00');
        dt.setDate(dt.getDate() + d);
        dateLabel = dt.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
      }

      const card = document.createElement('div');
      card.className = 'day-card';
      card.dataset.day = d;

      const statsText = dayIds.length ? `${dayIds.length} 個景點・約 ${totalHrs} 小時` : '尚未加入景點';

      card.innerHTML = `
        <div class="day-header">
          <div class="day-num">第 ${d + 1} 天${dateLabel ? `<span class="day-date-label">${dateLabel}</span>` : ''}</div>
          <div class="day-stats">${statsText}</div>
        </div>
        <div class="day-attractions" id="day-list-${d}" data-day="${d}">
          ${dayIds.length === 0 ? '<div class="day-empty">點擊景點卡片的「加入行程」<br/>將景點加入此天行程</div>' : ''}
        </div>
      `;
      itineraryDaysEl.appendChild(card);

      const listEl = card.querySelector(`#day-list-${d}`);

      // ── Drop zone events ──────────────────────────────────────
      listEl.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        listEl.classList.add('drag-over');
        // Move/create placeholder
        let ph = document.querySelector('.drag-placeholder');
        if (!ph) { ph = document.createElement('div'); ph.className = 'drag-placeholder'; }
        const afterEl = getDragAfterElement(listEl, e.clientY);
        if (afterEl) listEl.insertBefore(ph, afterEl);
        else listEl.appendChild(ph);
      });
      listEl.addEventListener('dragleave', e => {
        if (!listEl.contains(e.relatedTarget)) listEl.classList.remove('drag-over');
      });
      listEl.addEventListener('drop', e => {
        e.preventDefault();
        listEl.classList.remove('drag-over');
        if (!dragState) return;
        const { fromDay, fromId } = dragState;
        const toDay = parseInt(listEl.dataset.day, 10);

        // Determine insert position from placeholder
        const ph = listEl.querySelector('.drag-placeholder');
        const siblings = [...listEl.querySelectorAll('.day-item')];
        let insertIdx = ph ? siblings.indexOf(ph) : siblings.length;
        if (insertIdx < 0) insertIdx = siblings.length;

        // Remove from source
        itinerary[fromDay] = itinerary[fromDay].filter(id => id !== fromId);
        // Remove duplicate in target if exists
        itinerary[toDay] = itinerary[toDay].filter(id => id !== fromId);
        // Adjust index if source and target are same and src was before
        itinerary[toDay].splice(insertIdx, 0, fromId);

        dragState = null;
        saveToLocalStorage();
        renderItineraryDays();
        updateSummary();
      });

      // ── Items ────────────────────────────────────────────────
      dayIds.forEach((id, idx) => {
        const attr = getItem(id);
        if (!attr) return;
        const noteKey = `${d}_${id}`;
        const noteVal = notes[noteKey] || '';

        const item = document.createElement('div');
        item.className = 'day-item';
        item.draggable = true;
        item.dataset.day = d;
        item.dataset.id = id;

        item.innerHTML = `
          <span class="drag-handle" title="拖拉排序">⠇</span>
          <div class="day-item-main">
            <span class="day-item-emoji">${attr.emoji}</span>
            <div class="day-item-info">
              <div class="day-item-name">${attr.name}</div>
              <div class="day-item-time">${attr.isHotel ? '住宿' : `約 ${attr.timeHours} 小時`}</div>
              ${noteVal ? `<div class="day-item-note-preview">✏️ ${noteVal}</div>` : ''}
            </div>
          </div>
          <button class="note-btn${noteVal ? ' has-note' : ''}" title="備忘筆記">📝</button>
          <button class="day-item-remove" title="移除" aria-label="從第${d+1}天移除${attr.name}">✕</button>
          <div class="note-area" style="display:${noteVal ? 'block' : 'none'}">
            <textarea placeholder="備注這個景點…" maxlength="150" rows="2">${noteVal}</textarea>
          </div>
        `;

        // Drag events on item
        item.addEventListener('dragstart', e => {
          dragState = { fromDay: d, fromId: id };
          item.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', id);
        });
        item.addEventListener('dragend', () => {
          item.classList.remove('dragging');
          dragState = null;
          document.querySelectorAll('.drag-placeholder').forEach(p => p.remove());
          document.querySelectorAll('.day-attractions').forEach(c => c.classList.remove('drag-over'));
        });

        // Note button toggle
        const noteBtn  = item.querySelector('.note-btn');
        const noteArea = item.querySelector('.note-area');
        const textarea = item.querySelector('textarea');
        noteBtn.addEventListener('click', e => {
          e.stopPropagation();
          const open = noteArea.style.display !== 'none';
          noteArea.style.display = open ? 'none' : 'block';
          if (!open) textarea.focus();
        });
        textarea.addEventListener('input', () => {
          notes[noteKey] = textarea.value;
          noteBtn.classList.toggle('has-note', !!textarea.value);
          const preview = item.querySelector('.day-item-note-preview');
          if (preview) preview.textContent = textarea.value ? `✏️ ${textarea.value}` : '';
          saveToLocalStorage();
        });

        // Remove button
        item.querySelector('.day-item-remove').addEventListener('click', () => {
          delete notes[noteKey];
          removeFromDay(d, id);
        });

        listEl.appendChild(item);
      });
    }
  }

  // ── Summary ──────────────────────────────────────────────────
  function updateSummary() {
    const allIds = itinerary.slice(0, numDays).flat();
    const unique = [...new Set(allIds)];
    const totalHrs = unique.reduce((sum, id) => {
      const a = getItem(id);
      return sum + (a ? a.timeHours : 0);
    }, 0);
    summaryTotal.textContent = `📍 共規劃 ${unique.length} 個景點`;
    summaryTime.textContent  = `⏱️ 預計遊覽時間 ${totalHrs} 小時（不含交通）`;
  }

  // ── Itinerary controls ───────────────────────────────────────
  function bindItineraryControls() {
    daysMinus.addEventListener('click', () => {
      if (numDays > MIN_DAYS) { numDays--; daysCountEl.textContent = numDays; saveToLocalStorage(); renderItineraryDays(); updateSummary(); }
    });
    daysPlus.addEventListener('click', () => {
      if (numDays < MAX_DAYS) { numDays++; daysCountEl.textContent = numDays; saveToLocalStorage(); renderItineraryDays(); updateSummary(); }
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
    if (pdfItinBtn)   pdfItinBtn.addEventListener('click', exportToPdf);
    if (shareItinBtn) shareItinBtn.addEventListener('click', shareItinerary);
    exportClose.addEventListener('click', () => { exportModal.style.display = 'none'; });
    exportModal.addEventListener('click', e => { if (e.target === exportModal) exportModal.style.display = 'none'; });
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(exportText.textContent)
        .then(() => { showToast('已複製到剪貼簿 ✓'); exportModal.style.display = 'none'; })
        .catch(() => showToast('複製失敗，請手動選取文字'));
    });
    // Date picker
    if (startDateInput) {
      startDateInput.addEventListener('change', () => {
        startDate = startDateInput.value || null;
        saveToLocalStorage();
        renderItineraryDays();
      });
    }
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
          const a = getItem(id);
          if (a) {
            if (a.isHotel) {
              text += `   ${i + 1}. 🏨 住宿: ${a.name}\n`;
              text += `      📍 ${a.regionLabel}  💰 ${a.ticket}\n`;
            } else {
              text += `   ${i + 1}. ${a.emoji} ${a.name}（${a.nameJp}）\n`;
              text += `      📍 ${a.regionLabel}  🕐 約 ${a.timeHours} 小時  🎟️ ${a.ticket}\n`;
              dayHrs += a.timeHours;
            }
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

  // ── Export to PDF (open styled print page in new window) ──────
  function exportToPdf() {
    const allIds  = itinerary.slice(0, numDays).flat();
    const unique  = [...new Set(allIds)];
    const totalHrs = unique.reduce((s, id) => { const a = getItem(id); return s + (a && !a.isHotel ? a.timeHours : 0); }, 0);
    const today   = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

    let daysHtml = '';
    for (let d = 0; d < numDays; d++) {
      const dayIds = itinerary[d] || [];
      const dayHrs = dayIds.reduce((s, id) => { const a = getItem(id); return s + (a && !a.isHotel ? a.timeHours : 0); }, 0);
      let spotsHtml = dayIds.length === 0
        ? '<div class="empty-msg">尚未安排景點</div>'
        : dayIds.map((id, idx) => {
            const a = getItem(id);
            if (!a) return '';
            if (a.isHotel) return `
              <div class="spot hotel">
                <div class="spot-emo">🏨</div>
                <div class="spot-body">
                  <div class="spot-name">${a.name}</div>
                  <div class="spot-jp">${a.regionLabel}</div>
                  <div class="spot-pills"><span>🏠 住宿</span><span>💰 ${a.ticket}</span></div>
                </div>
              </div>`;
            const shortDesc = a.desc ? a.desc.substring(0, 90) + '…' : '';
            return `
              <div class="spot">
                <div class="spot-emo">${a.emoji}</div>
                <div class="spot-body">
                  <div class="spot-name">${idx + 1}. ${a.name}</div>
                  <div class="spot-jp">${a.nameJp || ''}</div>
                  <div class="spot-pills">
                    <span>📍 ${a.regionLabel}</span>
                    <span>🕐 約${a.timeHours}小時</span>
                    <span>🎟️ ${a.ticket}</span>
                    ${a.hours ? `<span>⏰ ${a.hours}</span>` : ''}
                  </div>
                  ${shortDesc ? `<div class="spot-desc">${shortDesc}</div>` : ''}
                </div>
              </div>`;
          }).join('');
      daysHtml += `
        <div class="day-block">
          <div class="day-hd">
            <span class="day-hd-num">第 ${d + 1} 天</span>
            <span class="day-hd-meta">${dayIds.length > 0 ? `${dayIds.length} 個景點 &nbsp;·&nbsp; 約 ${dayHrs} 小時` : '尚未安排'}</span>
          </div>
          ${spotsHtml}
        </div>`;
    }

    const html = `<!DOCTYPE html>
<html lang="zh-TW"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>我的沖繩旅遊行程</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans TC',sans-serif;color:#1e293b;background:#fff}
.ph{background:linear-gradient(135deg,#0c4a6e 0%,#0369a1 55%,#0284c7 100%);padding:36px 48px;color:#fff}
.ph-logo{font-size:1rem;letter-spacing:.12em;opacity:.8;margin-bottom:8px}
.ph-title{font-family:'Playfair Display',serif;font-size:2.4rem;font-weight:700;line-height:1.1;margin-bottom:6px}
.ph-sub{font-size:.85rem;opacity:.72;margin-bottom:24px}
.ph-stats{display:flex;gap:14px;flex-wrap:wrap}
.ph-stat{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);border-radius:12px;padding:10px 22px;text-align:center}
.ph-stat b{display:block;font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:700}
.ph-stat small{font-size:.65rem;opacity:.75;letter-spacing:.05em}
.pb{padding:32px 48px}
.day-block{margin-bottom:28px;page-break-inside:avoid}
.day-hd{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(90deg,#e0f2fe,#f0f9ff);border-left:4px solid #0ea5e9;border-radius:0 10px 10px 0;padding:10px 18px;margin-bottom:12px}
.day-hd-num{font-family:'Playfair Display',serif;font-size:1.2rem;color:#0c4a6e;font-weight:700}
.day-hd-meta{font-size:.75rem;color:#0369a1;font-weight:600;background:#fff;padding:3px 12px;border-radius:9999px;border:1px solid #bae6fd}
.spot{display:flex;align-items:flex-start;gap:14px;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;margin-bottom:9px;background:#fafafa;page-break-inside:avoid}
.spot.hotel{background:#f0f9ff;border-color:#bae6fd}
.spot-emo{font-size:1.6rem;flex-shrink:0;width:40px;text-align:center;padding-top:2px}
.spot-body{flex:1;min-width:0}
.spot-name{font-weight:700;font-size:.96rem;color:#1e293b;margin-bottom:2px}
.spot-jp{font-size:.68rem;color:#94a3b8;margin-bottom:7px}
.spot-pills{display:flex;gap:7px;flex-wrap:wrap}
.spot-pills span{font-size:.68rem;color:#475569;background:#fff;border:1px solid #e2e8f0;padding:2px 9px;border-radius:9999px}
.spot-desc{font-size:.75rem;color:#64748b;line-height:1.7;margin-top:7px;border-top:1px solid #f1f5f9;padding-top:7px}
.empty-msg{padding:14px;text-align:center;color:#94a3b8;font-style:italic;font-size:.82rem;border:1.5px dashed #e2e8f0;border-radius:12px}
.pf{border-top:1px solid #e2e8f0;padding:20px 48px;text-align:center;color:#94a3b8;font-size:.72rem}
.fab{position:fixed;bottom:24px;right:24px;display:flex;gap:10px;z-index:99}
.fab-close{background:#f1f5f9;color:#475569;border:none;padding:13px 20px;border-radius:9999px;font-size:.88rem;font-weight:600;cursor:pointer;font-family:'Noto Sans TC',sans-serif}
.fab-print{background:#0369a1;color:#fff;border:none;padding:13px 26px;border-radius:9999px;font-size:.88rem;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(3,105,161,.4);font-family:'Noto Sans TC',sans-serif}
.fab-print:hover{background:#0284c7}
@media print{.fab{display:none!important}.pb{padding:20px 32px}.ph{padding:28px 32px}}
</style></head><body>
<div class="ph">
  <div class="ph-logo">🌺 沖繩旅遊攻略</div>
  <div class="ph-title">我的沖繩旅遊行程</div>
  <div class="ph-sub">精心規劃 · 完美旅程 · 生成於 ${today}</div>
  <div class="ph-stats">
    <div class="ph-stat"><b>${numDays}</b><small>天行程</small></div>
    <div class="ph-stat"><b>${unique.length}</b><small>個景點</small></div>
    <div class="ph-stat"><b>${totalHrs}</b><small>小時遊覽</small></div>
  </div>
</div>
<div class="pb">${daysHtml}</div>
<div class="pf">🌺 由 沖繩旅遊攻略 自動生成 · 資料僅供參考，請以官方最新資訊為準</div>
<div class="fab">
  <button class="fab-close" onclick="window.close()">✕ 關閉</button>
  <button class="fab-print" onclick="window.print()">🖨️ 列印 / 儲存 PDF</button>
</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=860,height=920,scrollbars=yes,resizable=yes');
    if (!win) { showToast('請允許彈出視窗以匯出 PDF ⚠️'); return; }
    win.document.write(html);
    win.document.close();
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

  // ── Drag & drop helper ───────────────────────────────────
  function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll('.day-item:not(.dragging)')];
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // ── Share itinerary (URL hash) ───────────────────────────
  function shareItinerary() {
    try {
      const payload = JSON.stringify({ itinerary, numDays, startDate, notes });
      const encoded = btoa(unescape(encodeURIComponent(payload)));
      const url = `${location.origin}${location.pathname}#share=${encoded}`;
      navigator.clipboard.writeText(url)
        .then(() => showToast('🔗 分享連結已複製！發送給旅伴即可還原行程 ✓'))
        .catch(() => {
          prompt('複製以下連結分享行程：', url);
        });
    } catch (e) { showToast('分享失敗，請重試'); }
  }

  function checkShareHash() {
    try {
      const hash = location.hash;
      if (!hash.startsWith('#share=')) return;
      const encoded = hash.slice(7);
      const payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
      if (payload.itinerary) payload.itinerary.forEach((day, i) => { if (i < MAX_DAYS) itinerary[i] = day; });
      if (payload.numDays) { numDays = Math.min(Math.max(payload.numDays, MIN_DAYS), MAX_DAYS); if (daysCountEl) daysCountEl.textContent = numDays; }
      if (payload.notes)     notes = payload.notes;
      if (payload.startDate) { startDate = payload.startDate; if (startDateInput) startDateInput.value = startDate; }
      history.replaceState(null, '', location.pathname);
      showToast('🔗 已成功從分享連結導入行程！');
    } catch (e) {}
  }

  // ── LocalStorage ──────────────────────────────────────────────
  function saveToLocalStorage() {
    try {
      localStorage.setItem('okinawa_itinerary', JSON.stringify(itinerary));
      localStorage.setItem('okinawa_numdays',   String(numDays));
      localStorage.setItem('okinawa_notes',     JSON.stringify(notes));
      localStorage.setItem('okinawa_startdate', startDate || '');
    } catch (e) {}
  }
  function restoreFromLocalStorage() {
    try {
      const saved = localStorage.getItem('okinawa_itinerary');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.forEach((day, i) => { if (i < MAX_DAYS) itinerary[i] = day; });
      }
      const savedDays = localStorage.getItem('okinawa_numdays');
      if (savedDays) {
        const n = parseInt(savedDays, 10);
        if (!isNaN(n)) { numDays = Math.min(Math.max(n, MIN_DAYS), MAX_DAYS); if (daysCountEl) daysCountEl.textContent = numDays; }
      }
      const savedNotes = localStorage.getItem('okinawa_notes');
      if (savedNotes) notes = JSON.parse(savedNotes);
      const savedDate = localStorage.getItem('okinawa_startdate');
      if (savedDate) {
        startDate = savedDate || null;
        if (startDateInput && startDate) startDateInput.value = startDate;
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
