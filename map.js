// خوذ بايك — وحدة الخرائط التفاعلية عبر Leaflet.js (v1.4-TN)
window.KB_MAP = (() => {
  'use strict';

  const D = window.KB_DATA;
  const ARCGIS_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
  const ARCGIS_ATTR = 'Tiles &copy; Esri';

  let mainMap = null;
  let mainMarkersLayer = null;
  let pickerMap = null;
  let pickerMarker = null;
  let lastGeoKey = '';

  function makePinIcon(bg, emoji) {
    return L.divIcon({
      className: '',
      html: `<div class="kb-pin" style="background:${bg}">${emoji}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  function showDetailCard(kind, item) {
    const box = document.getElementById('mapDetailCard');
    if (!box) return;
    const ph = D.cleanPhone(item.phone);
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    if (kind === 'market') {
      const cat = D.getMarketCatInfo(item.cat);
      const imgHtml = item.imageUrl
        ? `<img src="${D.escHtml(item.imageUrl)}" alt="" class="h-36 w-full rounded-xl object-cover border border-[#E2DDD0]" />`
        : '';
      box.innerHTML = `
        <div class="space-y-2">
          ${imgHtml}
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-900">🟢 ${cat.icon} ${D.escHtml(cat.label)}</span>
            <span class="text-sm font-black text-[#0D6857]">${D.escHtml(item.price)} د.ت</span>
          </div>
          <h4 class="text-sm font-black text-emerald-950">${D.escHtml(item.title)}</h4>
          ${item.desc ? `<p class="text-xs font-semibold text-slate-700">${D.escHtml(item.desc)}</p>` : ''}
          <p class="text-xs font-bold text-slate-500">📍 ${D.escHtml(item.gov)} • ${D.escHtml(item.seller)} • ⏱️ ${D.escHtml(D.formatRemaining(item.expiresAt))}</p>
          <div class="grid grid-cols-2 gap-2">
            ${ph ? `<a href="tel:+216${ph}" class="rounded-xl bg-[#0D6857] py-2 text-center text-xs font-extrabold text-white">📞 اتصال</a>` : ''}
            ${ph ? `<a href="https://wa.me/216${ph}" target="_blank" rel="noopener" class="rounded-xl bg-emerald-600 py-2 text-center text-xs font-extrabold text-white">💬 واتساب</a>` : ''}
          </div>
        </div>
      `;
    } else if (kind === 'crafts') {
      const sp = D.getCraftCatInfo(item.spec);
      const rating = Number(item.rating || 5).toFixed(1);
      const reviews = Number(item.reviews || 1);
      box.innerHTML = `
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-black text-blue-900">🔵 حرفي • ${sp.icon} ${D.escHtml(sp.label)}</span>
            <span class="text-xs font-black text-amber-800">⭐ ${rating} (${reviews})</span>
          </div>
          <h4 class="text-sm font-black text-emerald-950">${D.escHtml(item.name)}</h4>
          <p class="text-xs font-bold text-slate-600">📍 ${D.escHtml(item.gov)} — ${D.escHtml(item.area)} • ${D.escHtml(item.note)}</p>
          <div class="grid grid-cols-2 gap-2">
            ${ph ? `<a href="tel:+216${ph}" class="rounded-xl bg-blue-700 py-2 text-center text-xs font-extrabold text-white">📞 اتصال مباشر</a>` : ''}
            ${ph ? `<a href="https://wa.me/216${ph}" target="_blank" rel="noopener" class="rounded-xl bg-emerald-600 py-2 text-center text-xs font-extrabold text-white">💬 واتساب</a>` : ''}
          </div>
        </div>
      `;
    } else {
      const imgHtml = item.imageUrl
        ? `<img src="${D.escHtml(item.imageUrl)}" alt="" class="h-36 w-full rounded-xl object-cover border border-rose-200" />`
        : '';
      box.innerHTML = `
        <div class="space-y-2">
          ${imgHtml}
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-800">🔴 بلاغ طارئ • ${D.escHtml(item.type)}</span>
            <span class="text-[11px] font-bold text-slate-500">🕒 ${D.escHtml(D.formatAgo(item.createdAt))}</span>
          </div>
          <p class="text-xs sm:text-sm font-bold text-slate-800">${D.escHtml(item.desc)}</p>
          <p class="text-xs font-bold text-rose-700">📍 ${D.escHtml(item.gov)}</p>
          <div class="grid grid-cols-2 gap-2">
            ${ph ? `<a href="tel:+216${ph}" class="rounded-xl bg-rose-600 py-2 text-center text-xs font-extrabold text-white">📞 اتصال (${D.escHtml(ph)})</a>` : ''}
            ${hasCoords ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat + ',' + lng)}" target="_blank" rel="noopener" class="rounded-xl border border-rose-200 bg-rose-50 py-2 text-center text-xs font-extrabold text-rose-900">🧭 التوجّه بـ Google Maps</a>` : ''}
          </div>
        </div>
      `;
    }
  }

  function renderMain(opts) {
    if (typeof L === 'undefined') return;
    const { refPoint, radius, layers, offers, crafts, emergencies, focusTarget } = opts;
    const geoKey = `${Number(refPoint.lat).toFixed(3)},${Number(refPoint.lng).toFixed(3)},${radius}`;
    let justCreated = false;

    if (!mainMap) {
      mainMap = L.map('mainMap', { zoomControl: true }).setView([refPoint.lat, refPoint.lng], 11);
      L.tileLayer(ARCGIS_TILE_URL, { attribution: ARCGIS_ATTR, maxZoom: 18 }).addTo(mainMap);
      mainMarkersLayer = L.layerGroup().addTo(mainMap);
      justCreated = true;
    }
    mainMarkersLayer.clearLayers();

    if (layers.market) {
      offers.forEach((o) => {
        const lat = Number(o.lat), lng = Number(o.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const pinEmoji = o.cat === 'vehicles' ? '🚗' : '🛒';
        const m = L.marker([lat, lng], { icon: makePinIcon('#0D6857', pinEmoji) }).addTo(mainMarkersLayer);
        m.on('click', () => showDetailCard('market', o));
        if (focusTarget && focusTarget.kind === 'market' && focusTarget.id === o.id) {
          mainMap.setView([lat, lng], 13);
          showDetailCard('market', o);
        }
      });
    }
    if (layers.crafts) {
      crafts.forEach((c) => {
        const lat = Number(c.lat), lng = Number(c.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const m = L.marker([lat, lng], { icon: makePinIcon('#1D4ED8', '🛠️') }).addTo(mainMarkersLayer);
        m.on('click', () => showDetailCard('crafts', c));
        if (focusTarget && focusTarget.kind === 'crafts' && focusTarget.id === c.id) {
          mainMap.setView([lat, lng], 13);
          showDetailCard('crafts', c);
        }
      });
    }
    if (layers.emergency) {
      emergencies.forEach((e) => {
        const lat = Number(e.lat), lng = Number(e.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const m = L.marker([lat, lng], { icon: makePinIcon('#DC2626', '🚨') }).addTo(mainMarkersLayer);
        m.on('click', () => showDetailCard('emergency', e));
        if (focusTarget && focusTarget.kind === 'emergency' && focusTarget.id === e.id) {
          mainMap.setView([lat, lng], 13);
          showDetailCard('emergency', e);
        }
      });
    }

    // لا نعيد تمركز الخريطة عند تبديل الطبقات أو التحديث؛ فقط عند تغيير الولاية/النطاق أو التهيئة الأولى
    if (!focusTarget && (justCreated || geoKey !== lastGeoKey)) {
      const z = radius === 'all' ? 6 : (radius === '100' ? 8 : 11);
      mainMap.setView([refPoint.lat, refPoint.lng], z);
      lastGeoKey = geoKey;
    }
    setTimeout(() => { if (mainMap) mainMap.invalidateSize(); }, 80);
  }

  function ensurePicker(coords, onPick) {
    if (typeof L === 'undefined') return;
    if (!pickerMap) {
      pickerMap = L.map('emPickerMap').setView([coords.lat, coords.lng], 12);
      L.tileLayer(ARCGIS_TILE_URL, { attribution: ARCGIS_ATTR, maxZoom: 18 }).addTo(pickerMap);
      pickerMarker = L.marker([coords.lat, coords.lng], { icon: makePinIcon('#DC2626', '🚨') }).addTo(pickerMap);
      pickerMap.on('click', (ev) => {
        const pt = { lat: ev.latlng.lat, lng: ev.latlng.lng };
        pickerMarker.setLatLng([pt.lat, pt.lng]);
        if (typeof onPick === 'function') onPick(pt);
      });
    } else {
      pickerMap.setView([coords.lat, coords.lng], 12);
      pickerMarker.setLatLng([coords.lat, coords.lng]);
    }
    setTimeout(() => { if (pickerMap) pickerMap.invalidateSize(); }, 120);
  }

  function movePicker(lat, lng, zoom) {
    if (pickerMap && pickerMarker) {
      pickerMap.setView([lat, lng], zoom || 12);
      pickerMarker.setLatLng([lat, lng]);
    }
  }

  return { renderMain, ensurePicker, movePicker };
})();