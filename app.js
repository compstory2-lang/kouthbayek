// خوذ بايك — منطق الواجهة والأحداث والتبويبات الخمسة
(() => {
  'use strict';

  const C = window.KB_CONFIG;
  const D = window.KB_DATA;
  const M = window.KB_MAP;
  const $ = (id) => document.getElementById(id);

  const savedPrefs = D.lsGet(D.STORE_KEYS.prefs, { gov: 'قابس', radius: 'gov' });
  const state = {
    activeTab: 'market',
    gov: savedPrefs.gov || 'قابس',
    radius: savedPrefs.radius || 'gov',
    userCoords: null,
    marketSearch: '',
    marketCat: 'all',
    craftSearch: '',
    craftCat: 'all',
    emergCat: 'all',
    mapLayers: { market: true, crafts: true, emergency: true },
    offers: D.lsGet(D.STORE_KEYS.offers, null) || C.SEED_OFFERS.slice(),
    crafts: D.lsGet(D.STORE_KEYS.crafts, null) || C.SEED_CRAFTS.slice(),
    emergencies: D.lsGet(D.STORE_KEYS.emergencies, null) || C.SEED_EMERGENCIES.slice(),
    account: D.lsGet(D.STORE_KEYS.account, null),
    pickerCoords: { lat: 33.8815, lng: 10.0982 }
  };

  let toastTimer = null;
  function showToast(msg) {
    const el = $('kbToast');
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  function getReferencePoint() {
    if (state.userCoords) return state.userCoords;
    const g = D.getGovObj(state.gov);
    return { lat: g.lat, lng: g.lng };
  }

  function matchesGeo(item) {
    if (state.radius === 'all') return true;
    if (state.radius === 'gov') return item.gov === state.gov;
    const maxKm = Number(state.radius);
    if (!maxKm || !item.lat || !item.lng) return item.gov === state.gov;
    const ref = getReferencePoint();
    return D.haversineKm(ref.lat, ref.lng, item.lat, item.lng) <= maxKm;
  }

  function getDistBadge(item) {
    if (!item.lat || !item.lng) return '';
    const ref = getReferencePoint();
    const km = D.haversineKm(ref.lat, ref.lng, item.lat, item.lng);
    return km < 1 ? 'أقل من 1 كم' : `${km.toFixed(1)} كم`;
  }

  function populateSelects() {
    const govOpts = C.TN_GOVERNORATES.map((g) => `<option value="${D.escHtml(g.ar)}">${D.escHtml(g.ar)}</option>`).join('');
    ['govSelect', 'emGov', 'ofGov', 'crGov'].forEach((id) => {
      const el = $(id);
      if (el) { el.innerHTML = govOpts; el.value = state.gov; }
    });
    $('radiusSelect').value = state.radius;

    $('ofCat').innerHTML = C.MARKET_CATS.filter((c) => c.id !== 'all')
      .map((c) => `<option value="${D.escHtml(c.id)}">${c.icon} ${D.escHtml(c.label)}</option>`).join('');
    $('crSpec').innerHTML = C.CRAFT_CATS.filter((c) => c.id !== 'all')
      .map((c) => `<option value="${D.escHtml(c.id)}">${c.icon} ${D.escHtml(c.label)}</option>`).join('');
  }

  function renderCategoryBars() {
    $('marketCatBar').innerHTML = C.MARKET_CATS.map((c) => `
      <button type="button" data-market-cat="${D.escHtml(c.id)}" class="kb-pill ${state.marketCat === c.id ? 'active' : 'bg-white text-emerald-950 border-[#DDD7C8]'} rounded-full border px-3 py-1.5 text-xs font-extrabold">
        ${c.icon} ${D.escHtml(c.label)}
      </button>
    `).join('');

    $('craftCatBar').innerHTML = C.CRAFT_CATS.map((c) => `
      <button type="button" data-craft-cat="${D.escHtml(c.id)}" class="kb-pill ${state.craftCat === c.id ? 'active' : 'bg-white text-emerald-950 border-[#DDD7C8]'} rounded-full border px-3 py-1.5 text-xs font-extrabold">
        ${c.icon} ${D.escHtml(c.label)}
      </button>
    `).join('');

    $('emergCatBar').innerHTML = C.EMERG_CATS.map((c) => `
      <button type="button" data-emerg-cat="${D.escHtml(c.id)}" class="kb-pill ${state.emergCat === c.id ? 'active' : 'bg-white text-rose-900 border-rose-200'} rounded-full border px-3 py-1.5 text-xs font-extrabold">
        ${c.icon} ${D.escHtml(c.label)}
      </button>
    `).join('');
  }

  function getFilteredOffers() {
    const q = state.marketSearch.trim().toLowerCase();
    return state.offers.filter((o) => {
      if (o.expiresAt && o.expiresAt <= Date.now()) return false;
      if (!matchesGeo(o)) return false;
      if (state.marketCat !== 'all' && o.cat !== state.marketCat) return false;
      if (q) {
        const hay = `${o.title} ${o.seller} ${o.gov} ${D.getMarketCatInfo(o.cat).label}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }

  function renderMarket() {
    const list = getFilteredOffers();
    const totalActive = state.offers.filter((o) => !o.expiresAt || o.expiresAt > Date.now()).length;
    $('statOffersCount').textContent = `${totalActive} عرض سارٍ`;
    $('marketResultCount').textContent = `${list.length} عرض`;

    const box = $('marketList');
    if (!list.length) {
      box.innerHTML = `
        <div class="rounded-2xl border border-dashed border-[#D6CFC0] bg-white p-6 text-center space-y-2">
          <div class="text-2xl">🛒</div>
          <p class="text-xs font-extrabold text-slate-600">لا توجد عروض مطابقة في «${D.escHtml(state.gov)}» بهذا الفلتر حالياً.</p>
          <button type="button" data-expand-all="1" class="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100">عرض كل تونس</button>
        </div>
      `;
      return;
    }

    box.innerHTML = list.map((o) => {
      const cat = D.getMarketCatInfo(o.cat);
      const ph = D.cleanPhone(o.phone);
      const dist = getDistBadge(o);
      return `
        <article class="rounded-2xl border border-[#E2DDD0] bg-white p-3.5 shadow-sm space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <span class="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">${cat.icon} ${D.escHtml(cat.label)}</span>
                <span class="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">⏱️ ${D.escHtml(D.formatRemaining(o.expiresAt))}</span>
              </div>
              <h3 class="text-sm font-black text-emerald-950 leading-snug">${D.escHtml(o.title)}</h3>
              <p class="mt-0.5 text-[11px] font-bold text-slate-500">📍 ${D.escHtml(o.gov)}${dist ? ' • ' + D.escHtml(dist) : ''} • ${D.escHtml(o.seller)}</p>
            </div>
            <div class="shrink-0 rounded-2xl bg-[#EAF5F0] px-3 py-1.5 text-center">
              <div class="text-sm font-black text-[#0E5A3E]">${D.escHtml(o.price)}</div>
              <div class="text-[10px] font-extrabold text-emerald-800">د.ت</div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
            <a href="tel:+216${ph}" class="flex items-center justify-center gap-1 rounded-xl bg-[#0E5A3E] py-2 text-xs font-extrabold text-white hover:bg-[#0A422D] transition"><span>📞</span><span>اتصال</span></a>
            <a href="https://wa.me/216${ph}?text=${encodeURIComponent('مرحباً، بخصوص عرضك على خوذ بايك: ' + o.title)}" target="_blank" rel="noopener" class="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 transition"><span>💬</span><span>واتساب</span></a>
            <button type="button" data-focus-map="market:${D.escHtml(o.id)}" class="flex items-center justify-center gap-1 rounded-xl border border-[#DDD7C8] bg-[#FAF9F5] py-2 text-xs font-extrabold text-emerald-950 hover:bg-emerald-50 transition"><span>🗺️</span><span>الخريطة</span></button>
          </div>
        </article>
      `;
    }).join('');
  }

  function getFilteredCrafts() {
    const q = state.craftSearch.trim().toLowerCase();
    return state.crafts.filter((c) => {
      if (!matchesGeo(c)) return false;
      if (state.craftCat !== 'all' && c.spec !== state.craftCat) return false;
      if (q) {
        const hay = `${c.name} ${c.area} ${c.gov} ${c.note} ${D.getCraftCatInfo(c.spec).label}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.rating - a.rating);
  }

  function renderCrafts() {
    const list = getFilteredCrafts();
    $('craftResultCount').textContent = `${list.length} حرفي`;

    const box = $('craftList');
    if (!list.length) {
      box.innerHTML = `
        <div class="rounded-2xl border border-dashed border-[#D6CFC0] bg-white p-6 text-center space-y-2">
          <div class="text-2xl">🛠️</div>
          <p class="text-xs font-extrabold text-slate-600">لا يوجد حرفيون مطابقون في «${D.escHtml(state.gov)}» بهذا التخصص حالياً.</p>
          <button type="button" data-expand-all="1" class="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-800 hover:bg-blue-100">عرض كل تونس</button>
        </div>
      `;
      return;
    }

    box.innerHTML = list.map((c) => {
      const sp = D.getCraftCatInfo(c.spec);
      const ph = D.cleanPhone(c.phone);
      const dist = getDistBadge(c);
      return `
        <article class="rounded-2xl border border-[#E2DDD0] bg-white p-3.5 shadow-sm space-y-2.5">
          <div>
            <div class="flex flex-wrap items-center gap-1.5 mb-1">
              <span class="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">${sp.icon} ${D.escHtml(sp.label)}</span>
              <span class="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">⭐ ${Number(c.rating).toFixed(1)} (${c.reviews})</span>
            </div>
            <h3 class="text-sm font-black text-emerald-950 leading-snug">${D.escHtml(c.name)}</h3>
            <p class="mt-0.5 text-[11px] font-bold text-slate-500">📍 ${D.escHtml(c.gov)} — ${D.escHtml(c.area)}${dist ? ' • ' + D.escHtml(dist) : ''}</p>
            <p class="mt-1 text-xs font-semibold text-slate-700">${D.escHtml(c.note)}</p>
          </div>
          <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
            <a href="tel:+216${ph}" class="flex items-center justify-center gap-1 rounded-xl bg-blue-700 py-2 text-xs font-extrabold text-white hover:bg-blue-800 transition"><span>📞</span><span>اتصال مباشر</span></a>
            <a href="https://wa.me/216${ph}?text=${encodeURIComponent('مرحباً، وجدت رقمك على خوذ بايك وأحتاج خدمة: ' + sp.label)}" target="_blank" rel="noopener" class="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 transition"><span>💬</span><span>واتساب</span></a>
            <button type="button" data-focus-map="crafts:${D.escHtml(c.id)}" class="flex items-center justify-center gap-1 rounded-xl border border-[#DDD7C8] bg-[#FAF9F5] py-2 text-xs font-extrabold text-emerald-950 hover:bg-blue-50 transition"><span>🗺️</span><span>الموقع</span></button>
          </div>
        </article>
      `;
    }).join('');
  }

  function getFilteredEmergencies() {
    return state.emergencies.filter((e) => {
      if (e.status !== 'open') return false;
      if (!matchesGeo(e)) return false;
      if (state.emergCat !== 'all' && e.type !== state.emergCat) return false;
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }

  function renderEmergencies() {
    const allOpen = state.emergencies.filter((e) => e.status === 'open').length;
    const list = getFilteredEmergencies();
    $('openEmergencyCounter').textContent = String(allOpen);
    $('statEmergQuick').textContent = `${allOpen} بلاغ مفتوح`;
    $('navEmergBadge').textContent = String(allOpen);

    const box = $('emergencyList');
    if (!list.length) {
      box.innerHTML = `
        <div class="rounded-2xl border border-dashed border-rose-200 bg-white p-6 text-center space-y-2">
          <div class="text-2xl">✅</div>
          <p class="text-xs font-extrabold text-slate-600">لا توجد بلاغات طوارئ مفتوحة في «${D.escHtml(state.gov)}» حالياً.</p>
          <button type="button" data-expand-all="1" class="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-extrabold text-rose-700 hover:bg-rose-100">عرض بلاغات كل تونس</button>
        </div>
      `;
      return;
    }

    box.innerHTML = list.map((e) => {
      const ph = D.cleanPhone(e.phone);
      const dist = getDistBadge(e);
      return `
        <article class="rounded-2xl border border-rose-200 bg-white p-3.5 shadow-sm space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-800">🚨 ${D.escHtml(e.type)}</span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">🕒 ${D.escHtml(D.formatAgo(e.createdAt))}</span>
            </div>
            <span class="text-[11px] font-extrabold text-rose-700">📍 ${D.escHtml(e.gov)}${dist ? ' • ' + D.escHtml(dist) : ''}</span>
          </div>
          <p class="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">${D.escHtml(e.desc)}</p>
          <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-rose-100">
            ${ph ? `<a href="tel:+216${ph}" class="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-rose-600 py-2 px-3 text-xs font-extrabold text-white hover:bg-rose-700"><span>📞</span><span>اتصال (${D.escHtml(ph)})</span></a>` : ''}
            <button type="button" data-focus-map="emergency:${D.escHtml(e.id)}" class="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 py-2 px-3 text-xs font-extrabold text-rose-800 hover:bg-rose-100"><span>🗺️</span><span>موقع البلاغ</span></button>
            <button type="button" data-resolve-emerg="${D.escHtml(e.id)}" class="rounded-xl border border-emerald-200 bg-emerald-50 py-2 px-2.5 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100">✓ تم الحل</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderAccount() {
    const acc = state.account;
    if (!acc) {
      $('accountAuthBox').classList.remove('hidden');
      $('accountDashBox').classList.add('hidden');
      return;
    }
    $('accountAuthBox').classList.add('hidden');
    $('accountDashBox').classList.remove('hidden');

    const roleLbl = acc.role === 'craftsman' ? '🛠️ حرفي / ورشة' : '🛒 معلن / بائع';
    $('dashName').textContent = acc.name;
    $('dashMeta').textContent = `${roleLbl} • +216 ${acc.phone} • ${acc.gov}`;

    const totalMs = 60 * 24 * C.HR;
    const elapsed = Math.max(0, Date.now() - acc.createdAt);
    const leftDays = Math.max(0, Math.ceil((totalMs - elapsed) / (24 * C.HR)));
    const pct = Math.max(5, Math.min(100, Math.round((leftDays / 60) * 100)));
    $('trialDaysLeft').textContent = `متبقي ${leftDays} يوماً`;
    $('trialBar').style.width = `${pct}%`;
    const endDate = new Date(acc.createdAt + totalMs);
    $('trialEndTxt').textContent = `تنتهي التجربة المجانية في: ${endDate.toLocaleDateString('ar-TN')}`;

    const myOffers = state.offers.filter((o) => D.cleanPhone(o.phone) === D.cleanPhone(acc.phone));
    const myCrafts = state.crafts.filter((c) => D.cleanPhone(c.phone) === D.cleanPhone(acc.phone));
    const myEmerg = state.emergencies.filter((e) => D.cleanPhone(e.phone) === D.cleanPhone(acc.phone));
    const items = [
      ...myOffers.map((o) => `🛒 ${D.escHtml(o.title)} (${D.escHtml(o.price)} د.ت)`),
      ...myCrafts.map((c) => `🛠️ ${D.escHtml(c.name)} (${D.escHtml(c.gov)})`),
      ...myEmerg.map((e) => `🚨 ${D.escHtml(e.type)} (${e.status === 'open' ? 'مفتوح' : 'مغلق'})`)
    ];
    $('myPostsList').innerHTML = items.length
      ? items.map((t) => `<div class="rounded-xl bg-[#FAF9F5] border border-[#E2DDD0] px-3 py-2 text-emerald-950">${t}</div>`).join('')
      : '<p class="text-slate-400">لم تنشر بعد أي عروض أو بطاقات بهذا الرقم.</p>';
  }

  function updateLocationHeader() {
    const rMap = { gov: 'في ولايتي', '15': 'ضمن 15 كم', '50': 'ضمن 50 كم', '100': 'ضمن 100 كم', all: 'كل تونس' };
    const gpsTag = state.userCoords ? ' (GPS مفعّل)' : '';
    $('locStatusTxt').textContent = `الولاية: ${state.gov}${gpsTag} • النطاق: ${rMap[state.radius] || 'في ولايتي'}`;
  }

  function renderMapNow(focusTarget) {
    M.renderMain({
      refPoint: getReferencePoint(),
      radius: state.radius,
      layers: state.mapLayers,
      offers: getFilteredOffers(),
      crafts: getFilteredCrafts(),
      emergencies: getFilteredEmergencies(),
      focusTarget
    });
  }

  function renderAll(mapFocus) {
    updateLocationHeader();
    renderCategoryBars();
    renderMarket();
    renderCrafts();
    renderEmergencies();
    renderAccount();
    if (state.activeTab === 'map' || mapFocus) renderMapNow(mapFocus);
  }

  function switchTab(tabId, mapFocus) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab-panel').forEach((sec) => {
      sec.classList.toggle('hidden', sec.id !== 'tab-' + tabId);
    });
    document.querySelectorAll('.kb-nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    if (tabId === 'map') renderMapNow(mapFocus);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openModal(id) {
    $(id).classList.remove('hidden');
    if (id === 'emergencyModal') {
      $('emGov').value = state.gov;
      if (state.account && state.account.phone) $('emPhone').value = state.account.phone;
      const g = D.getGovObj(state.gov);
      state.pickerCoords = state.userCoords ? { ...state.userCoords } : { lat: g.lat, lng: g.lng };
      $('emCoordsTxt').textContent = `${state.pickerCoords.lat.toFixed(4)}, ${state.pickerCoords.lng.toFixed(4)}`;
      M.ensurePicker(state.pickerCoords, (pt) => {
        state.pickerCoords = pt;
        $('emCoordsTxt').textContent = `${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}`;
      });
    } else if (id === 'offerModal') {
      $('ofGov').value = state.gov;
      if (state.account) {
        $('ofPhone').value = state.account.phone || '';
        $('ofSeller').value = state.account.name || '';
      }
    } else if (id === 'craftModal') {
      $('crGov').value = state.gov;
      if (state.account) {
        $('crPhone').value = state.account.phone || '';
        $('crName').value = state.account.name || '';
      }
    }
  }

  function closeModal(id) {
    $(id).classList.add('hidden');
  }

  function updateMapLayerButtons() {
    const styles = {
      market: ['bg-emerald-600', 'text-white'],
      crafts: ['bg-blue-700', 'text-white'],
      emergency: ['bg-rose-600', 'text-white']
    };
    document.querySelectorAll('[data-map-layer]').forEach((btn) => {
      const k = btn.dataset.mapLayer;
      btn.classList.remove('bg-emerald-600', 'bg-blue-700', 'bg-rose-600', 'text-white', 'bg-white', 'text-slate-500');
      if (state.mapLayers[k]) btn.classList.add(...styles[k]);
      else btn.classList.add('bg-white', 'text-slate-500');
    });
  }

  // ==================== EVENTS ====================
  $('govSelect').addEventListener('change', (e) => {
    state.gov = e.target.value;
    state.userCoords = null;
    D.lsSet(D.STORE_KEYS.prefs, { gov: state.gov, radius: state.radius });
    renderAll();
    showToast(`📍 تم تغيير الولاية إلى ${state.gov}`);
  });

  $('radiusSelect').addEventListener('change', (e) => {
    state.radius = e.target.value;
    D.lsSet(D.STORE_KEYS.prefs, { gov: state.gov, radius: state.radius });
    renderAll();
  });

  $('geoBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return showToast('⚠️ المتصفح لا يدعم تحديد الموقع؛ يمكنك اختيار الولاية يدوياً.');
    showToast('📡 جاري تحديد موقعك الجغرافي...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        state.userCoords = { lat: latitude, lng: longitude };
        const best = D.detectNearestGov(latitude, longitude);
        state.gov = best.ar;
        $('govSelect').value = state.gov;
        D.lsSet(D.STORE_KEYS.prefs, { gov: state.gov, radius: state.radius });
        renderAll();
        showToast(`✓ تم ربط موقعك بأقرب ولاية: ${state.gov}`);
      },
      () => showToast('⚠️ تعذر قراءة GPS؛ تم الإبقاء على ولاية ' + state.gov),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  });

  $('marketSearch').addEventListener('input', (e) => { state.marketSearch = e.target.value; renderMarket(); });
  $('craftSearch').addEventListener('input', (e) => { state.craftSearch = e.target.value; renderCrafts(); });

  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-tab]');
    if (navBtn) return switchTab(navBtn.dataset.tab);

    const mCat = e.target.closest('[data-market-cat]');
    if (mCat) { state.marketCat = mCat.dataset.marketCat; renderCategoryBars(); renderMarket(); return; }

    const cCat = e.target.closest('[data-craft-cat]');
    if (cCat) { state.craftCat = cCat.dataset.craftCat; renderCategoryBars(); renderCrafts(); return; }

    const eCat = e.target.closest('[data-emerg-cat]');
    if (eCat) { state.emergCat = eCat.dataset.emergCat; renderCategoryBars(); renderEmergencies(); return; }

    const qa = e.target.closest('[data-quick-action]');
    if (qa) {
      const act = qa.dataset.quickAction;
      if (act === 'fast24') { state.marketCat = 'fast24'; renderCategoryBars(); renderMarket(); }
      else if (act === 'livestock') { state.marketCat = 'livestock'; renderCategoryBars(); renderMarket(); }
      else if (act === 'go-emergency') switchTab('emergency');
      return;
    }

    if (e.target.closest('[data-expand-all]')) {
      state.radius = 'all';
      $('radiusSelect').value = 'all';
      D.lsSet(D.STORE_KEYS.prefs, { gov: state.gov, radius: state.radius });
      renderAll();
      return;
    }

    const focusBtn = e.target.closest('[data-focus-map]');
    if (focusBtn) {
      const [kind, id] = focusBtn.dataset.focusMap.split(':');
      state.mapLayers[kind] = true;
      updateMapLayerButtons();
      switchTab('map', { kind, id });
      return;
    }

    const resolveBtn = e.target.closest('[data-resolve-emerg]');
    if (resolveBtn) {
      const id = resolveBtn.dataset.resolveEmerg;
      state.emergencies = state.emergencies.map((em) => em.id === id ? { ...em, status: 'resolved' } : em);
      D.lsSet(D.STORE_KEYS.emergencies, state.emergencies);
      renderEmergencies();
      showToast('✓ تم تحديث حالة البلاغ إلى «تم الحل»');
      return;
    }

    const layerBtn = e.target.closest('[data-map-layer]');
    if (layerBtn) {
      const l = layerBtn.dataset.mapLayer;
      state.mapLayers[l] = !state.mapLayers[l];
      updateMapLayerButtons();
      renderMapNow();
      return;
    }

    const closeBtn = e.target.closest('[data-close-modal]');
    if (closeBtn) closeModal(closeBtn.dataset.closeModal);
  });

  $('openEmergencyModalBtn').addEventListener('click', () => openModal('emergencyModal'));
  $('openOfferModalBtn').addEventListener('click', () => openModal('offerModal'));
  $('openCraftModalBtn').addEventListener('click', () => openModal('craftModal'));
  $('dashAddOfferBtn').addEventListener('click', () => openModal('offerModal'));
  $('dashAddCraftBtn').addEventListener('click', () => openModal('craftModal'));
  $('openTermsBtn').addEventListener('click', () => openModal('termsModal'));

  $('emGov').addEventListener('change', (e) => {
    const g = D.getGovObj(e.target.value);
    state.pickerCoords = { lat: g.lat, lng: g.lng };
    M.movePicker(g.lat, g.lng, 12);
    $('emCoordsTxt').textContent = `${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}`;
  });

  $('emUseGpsBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return showToast('⚠️ GPS غير متاح');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        state.pickerCoords = { lat: latitude, lng: longitude };
        M.movePicker(latitude, longitude, 14);
        $('emCoordsTxt').textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        showToast('📍 تم تحديد موقع البلاغ عبر GPS');
      },
      () => showToast('⚠️ تعذر قراءة الموقع، اضغط مباشرة على الخريطة')
    );
  });

  $('emergencyForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const newEm = {
      id: 'em-' + Date.now(),
      type: $('emType').value,
      gov: $('emGov').value,
      desc: $('emDesc').value.trim(),
      phone: D.cleanPhone($('emPhone').value),
      lat: state.pickerCoords.lat,
      lng: state.pickerCoords.lng,
      createdAt: Date.now(),
      status: 'open'
    };
    state.emergencies.unshift(newEm);
    D.lsSet(D.STORE_KEYS.emergencies, state.emergencies);
    D.pushEmergency(newEm);
    e.target.reset();
    closeModal('emergencyModal');
    renderAll();
    showToast('🚨 تم نشر البلاغ الطارئ بنجاح!');
  });

  $('offerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const g = D.getGovObj($('ofGov').value);
    const jitter = () => (Math.random() - 0.5) * 0.025;
    const newOf = {
      id: 'of-' + Date.now(),
      title: $('ofTitle').value.trim(),
      cat: $('ofCat').value,
      price: Number($('ofPrice').value),
      gov: $('ofGov').value,
      phone: D.cleanPhone($('ofPhone').value),
      seller: $('ofSeller').value.trim(),
      lat: g.lat + jitter(),
      lng: g.lng + jitter(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * C.HR
    };
    state.offers.unshift(newOf);
    D.lsSet(D.STORE_KEYS.offers, state.offers);
    D.pushOffer(newOf);
    e.target.reset();
    closeModal('offerModal');
    renderAll();
    showToast('✓ تم نشر عرضك في سوق الحومة لمدة 24 ساعة!');
  });

  $('craftForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const g = D.getGovObj($('crGov').value);
    const jitter = () => (Math.random() - 0.5) * 0.025;
    const newCr = {
      id: 'cr-' + Date.now(),
      name: $('crName').value.trim(),
      spec: $('crSpec').value,
      gov: $('crGov').value,
      area: $('crArea').value.trim(),
      phone: D.cleanPhone($('crPhone').value),
      note: $('crNote').value.trim(),
      rating: 5.0,
      reviews: 1,
      lat: g.lat + jitter(),
      lng: g.lng + jitter()
    };
    state.crafts.unshift(newCr);
    D.lsSet(D.STORE_KEYS.crafts, state.crafts);
    D.pushCraft(newCr);
    e.target.reset();
    closeModal('craftModal');
    renderAll();
    showToast('✓ تمت إضافة بطاقتك في دليل الحرفيين!');
  });

  $('accountForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const ph = D.cleanPhone($('accPhone').value);
    const pin = $('accPin').value.trim();
    if (ph.length !== 8) return showToast('⚠️ يرجى إدخال رقم هاتف تونسي صحيح من 8 أرقام.');
    if (pin.length < 4) return showToast('⚠️ الرمز السري يجب أن يتكون من 4 إلى 6 أرقام.');
    state.account = {
      name: $('accName').value.trim(),
      role: $('accRole').value,
      phone: ph,
      gov: state.gov,
      createdAt: Date.now()
    };
    D.lsSet(D.STORE_KEYS.account, state.account);
    renderAccount();
    showToast('🎉 مرحباً بك! تم تفعيل فترة التجربة المجانية (60 يوماً).');
  });

  $('logoutBtn').addEventListener('click', () => {
    state.account = null;
    D.lsRemove(D.STORE_KEYS.account);
    renderAccount();
    showToast('تم تسجيل الخروج بنجاح.');
  });

  setInterval(() => {
    if (state.activeTab === 'market') renderMarket();
  }, 60000);

  // ==================== INIT ====================
  populateSelects();
  renderAll();
  if (D.isSupabaseConnected()) {
    $('syncBadge').textContent = '🟢 متصل بـ Supabase';
    D.syncFromSupabase(state).then((ok) => { if (ok) renderAll(); });
  }
})();
