// خوذ بايك — وحدة الخرائط التفاعلية عبر Leaflet.js
window.KB_MAP = (() => {
  'use strict';

  const D = window.KB_DATA;
  const ARCGIS_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
  const ARCGIS_ATTR = 'Tiles &copy; Esri';

  let mainMap = null;
  let mainMarkersLayer = null;
  let pickerMap = null;
  let pickerMarker = null;

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
    if (kind === 'market') {
      const cat = D.getMarketCatInfo(item.cat);
      box.innerHTML = `
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-900">🟢 عرض سوق • ${cat.icon} ${D.escHtml(cat.label)}</span>
            <span class="text-sm font-black text-[#0E5A3E]">${D.escHtml(item.price)} د.ت</span>
          </div>
          <h4 class="text-sm font-black text-emerald-950">${D.escHtml(item.title)}</h4>
          <p class="text-xs font-bold text-slate-600">📍 ${D.escHtml(item.gov)} • ${D.escHtml(item.seller)} • ⏱️ ${D.escHtml(D.formatRemaining(item.expiresAt))}</p>
          <div class="grid grid-cols-2 gap-2">
            <a href="tel:+216${ph}" class="rounded-xl bg-[#0E5A3E] py-2 text-center text-xs font-extrabold text-white">📞 اتصال</a>
            <a href="https://wa.me/216${ph}" target="_blank" rel="noopener" class="rounded-xl bg-emerald-600 py-2 text-center text-xs font-extrabold text-white">💬 واتساب</a>
          </div>
        </div>
      `;
    } else if (kind === 'crafts') {
      const sp = D.getCraftCatInfo(item.spec);
      box.innerHTML = `
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-black text-blue-900">🔵 حرفي • ${sp.icon} ${D.escHtml(sp.label)}</span>
            <span class="text-xs font-black text-amber-800">⭐ ${Number(item.rating).toFixed(1)}</span>
          </div>
          <h4 class="text-sm font-black text-emerald-950">${D.escHtml(item.name)}</h4>
          <p class="text-xs font-bold text-slate-600">📍 ${D.escHtml(item.gov)} — ${D.escHtml(item.area)} • ${D.escHtml(item.note)}</p>
          <div class="grid grid-cols-2 gap-2">
            <a href="tel:+216${ph}" class="rounded-xl bg-blue-700 py-2 text-center text-xs font-extrabold text-white">📞 اتصال مباشر</a>
            <a href="https://wa.me/216${ph}" target="_blank" rel="noopener" class="rounded-xl bg-emerald-600 py-2 text-center text-xs font-extrabold text-white">💬 واتساب</a>
          </div>
        </div>
      `;
    } else {
      box.innerHTML = `
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-800">🔴 بلاغ طارئ • ${D.escHtml(item.type)}</span>
            <span class="text-[11px] font-bold text-slate-500">🕒 ${D.escHtml(D.formatAgo(item.createdAt))}</span>
          </div>
          <p class="text-xs sm:text-sm font-bold text-slate-800">${D.escHtml(item.desc)}</p>
          <p class="text-xs font-bold text-rose-700">📍 ${D.escHtml(item.gov)}</p>
          ${ph ? `<a href="tel:+216${ph}" class="block rounded-xl bg-rose-600 py-2 text-center text-xs font-extrabold text-white">📞 اتصال بالمبلّغ (${D.escHtml(ph)})</a>` : ''}
        </div>
      `;
    }
  }

  function renderMain(opts) {
    if (typeof L === 'undefined') return;
    const { refPoint, radius, layers, offers, crafts, emergencies, focusTarget } = opts;
    if (!mainMap) {
      mainMap = L.map('mainMap', { zoomControl: true }).setView([refPoint.lat, refPoint.lng], 11);
      L.tileLayer(ARCGIS_TILE_URL, { attribution: ARCGIS_ATTR, maxZoom: 18 }).addTo(mainMap);
      mainMarkersLayer = L.layerGroup().addTo(mainMap);
    }
    mainMarkersLayer.clearLayers();

    if (layers.market) {
      offers.forEach((o) => {
        if (!o.lat || !o.lng) return;
        const m = L.marker([o.lat, o.lng], { icon: makePinIcon('#0E5A3E', '🛒') }).addTo(mainMarkersLayer);
        m.on('click', () => showDetailCard('market', o));
        if (focusTarget && focusTarget.kind === 'market' && focusTarget.id === o.id) {
          mainMap.setView([o.lat, o.lng], 13);
          showDetailCard('market', o);
        }
      });
    }
    if (layers.crafts) {
      crafts.forEach((c) => {
        if (!c.lat || !c.lng) return;
        const m = L.marker([c.lat, c.lng], { icon: makePinIcon('#1D4ED8', '🛠️') }).addTo(mainMarkersLayer);
        m.on('click', () => showDetailCard('crafts', c));
        if (focusTarget && focusTarget.kind === 'crafts' && focusTarget.id === c.id) {
          mainMap.setView([c.lat, c.lng], 13);
          showDetailCard('crafts', c);
        }
      });
    }
    if (layers.emergency) {
      emergencies.forEach((e) => {
        if (!e.lat || !e.lng) return;
        const m = L.marker([e.lat, e.lng], { icon: makePinIcon('#DC2626', '🚨') }).addTo(mainMarkersLayer);
        m.on('click', () => showDetailCard('emergency', e));
        if (focusTarget && focusTarget.kind === 'emergency' && focusTarget.id === e.id) {
          mainMap.setView([e.lat, e.lng], 13);
          showDetailCard('emergency', e);
        }
      });
    }

    if (!focusTarget) {
      const z = radius === 'all' ? 6 : (radius === '100' ? 8 : 11);
      mainMap.setView([refPoint.lat, refPoint.lng], z);
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

  return {
    renderMain,
    ensurePicker,
    movePicker
  };
})();
