// خوذ بايك — منطق الواجهة والأحداث والشبكة الثنائية للفئات (v1.2-TN)
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
    showMarketCatGrid: false,
    marketLimit: 15,
    craftSearch: '',
    craftGroup: 'all',
    craftCat: 'all',
    emergCat: 'all',
    mapLayers: { market: true, crafts: true, emergency: true },
    offers: D.lsGet(D.STORE_KEYS.offers, null) || C.SEED_OFFERS.slice(),
    crafts: D.lsGet(D.STORE_KEYS.crafts, null) || C.SEED_CRAFTS.slice(),
    emergencies: D.lsGet(D.STORE_KEYS.emergencies, null) || C.SEED_EMERGENCIES.slice(),
    claimedEmergencies: D.lsGet(D.STORE_KEYS.claimed, []),
    authUser: null,
    account: D.lsGet(D.STORE_KEYS.account, null),
    pickerCoords: { lat: 33.8815, lng: 10.0982 },
    offerCoords: null,
    pendingOfferPhoto: null,
    reportTarget: null
  };

  let toastTimer = null;
  function showToast(msg) {
    const el = $('kbToast');
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3400);
  }

  function isAccountActive() {
    return Boolean(state.account && state.account.verified && D.isValidTnPhone(state.account.phone));
  }

  function requireActiveAccount(reasonMsg) {
    if (isAccountActive()) return true;
    showToast(reasonMsg || '⚠️ سجّل دخولك عبر Google وأكمل رقم هاتفك التونسي أولاً.');
    switchTab('account');
    return false;
  }

  function getReferencePoint() {
    if (state.userCoords) return state.userCoords;
    const g = D.getGovObj(state.gov);
    return { lat: g.lat, lng: g.lng };
  }

  function distanceOf(item) {
    if (!item || !item.lat || !item.lng) return 99999;
    const ref = getReferencePoint();
    return D.haversineKm(ref.lat, ref.lng, item.lat, item.lng);
  }

  function matchesGeo(item) {
    if (state.radius === 'all') return true;
    if (state.radius === 'gov') return item.gov === state.gov;
    const maxKm = Number(state.radius);
    if (!maxKm || !item.lat || !item.lng) return item.gov === state.gov;
    return distanceOf(item) <= maxKm;
  }

  function getDistBadge(item) {
    if (!item.lat || !item.lng) return '';
    const km = distanceOf(item);
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

  // ==================== 2-COLUMN CATEGORY TILE GRIDS (MATCHES SCREENSHOTS) ====================
  function renderCategoryBars() {
    // 1. Market 2-Column Tiles with live offer counts
    const geoOffers = state.offers.filter((o) => o.status !== 'sold' && (!o.expiresAt || o.expiresAt > Date.now()) && matchesGeo(o));
    $('marketCatBar').innerHTML = C.MARKET_CATS.filter((c) => c.id !== 'all').map((c) => {
      const cnt = geoOffers.filter((o) => o.cat === c.id).length;
      const isSelected = state.marketCat === c.id;
      const hasAny = cnt > 0;
      const tileCls = isSelected
        ? 'border-2 border-[#0D6857] bg-[#E8F6F2]'
        : (hasAny ? 'border border-amber-300 bg-amber-50/40' : 'border border-[#E4EAE8] bg-white');
      const pillCls = hasAny ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500';
      return `
        <button type="button" data-market-cat="${D.escHtml(c.id)}" class="kb-cat-tile rounded-3xl ${tileCls} p-4 text-center shadow-sm flex flex-col items-center justify-center gap-2">
          <span class="text-3xl leading-none">${c.icon}</span>
          <span class="text-xs sm:text-sm font-black text-[#132A23] leading-snug">${D.escHtml(c.label)}</span>
          <span class="rounded-full ${pillCls} px-3 py-0.5 text-[11px] font-extrabold">${cnt} عرض اليوم</span>
        </button>
      `;
    }).join('');

    // 2. Crafts Group Pills
    const totalSpecs = C.CRAFT_CATS.filter((c) => c.id !== 'all').length;
    $('craftGroupBar').innerHTML = C.CRAFT_GROUPS.map((g) => {
      const lbl = g.id === 'all' ? `${g.label} (${totalSpecs})` : `${g.icon} ${g.label}`;
      return `
        <button type="button" data-craft-group="${D.escHtml(g.id)}" class="kb-pill ${state.craftGroup === g.id ? 'active' : 'bg-white text-[#132A23] border-[#DCE4E1]'} rounded-full border px-3.5 py-1.5 text-xs font-extrabold">
          ${D.escHtml(lbl)}
        </button>
      `;
    }).join('');

    // 3. Crafts 2-Column Specialty Tiles with live craftsman counts
    const geoCrafts = state.crafts.filter((c) => matchesGeo(c));
    const visibleSpecs = C.CRAFT_CATS.filter((c) => c.id !== 'all' && (state.craftGroup === 'all' || c.group === state.craftGroup));
    $('craftCatBar').innerHTML = visibleSpecs.map((c) => {
      const cnt = geoCrafts.filter((x) => x.spec === c.id).length;
      const isSelected = state.craftCat === c.id;
      const hasAny = cnt > 0;
      const tileCls = isSelected
        ? 'border-2 border-[#0D6857] bg-[#E8F6F2]'
        : (hasAny ? 'border border-emerald-300 bg-emerald-50/40' : 'border border-[#E4EAE8] bg-white');
      const pillCls = hasAny ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-500';
      return `
        <button type="button" data-craft-cat="${D.escHtml(c.id)}" class="kb-cat-tile rounded-3xl ${tileCls} p-4 text-center shadow-sm flex flex-col items-center justify-center gap-2">
          <span class="text-3xl leading-none">${c.icon}</span>
          <span class="text-xs sm:text-sm font-black text-[#132A23] leading-snug">${D.escHtml(c.label)}</span>
          <span class="rounded-full ${pillCls} px-3 py-0.5 text-[11px] font-extrabold">${cnt} عرض اليوم</span>
        </button>
      `;
    }).join('');

    // 4. Emergency Filter Pills
    $('emergCatBar').innerHTML = C.EMERG_CATS.map((c) => `
      <button type="button" data-emerg-cat="${D.escHtml(c.id)}" class="kb-pill kb-pill-red ${state.emergCat === c.id ? 'active' : 'bg-white text-[#132A23] border-slate-200'} rounded-full border px-3.5 py-1.5 text-xs font-extrabold">
        ${c.icon} ${D.escHtml(c.label)}
      </button>
    `).join('');
  }

  // ==================== MARKET (SORTED NEAREST-FIRST + MAGAZINE CARDS) ====================
  function getFilteredOffers() {
    const q = state.marketSearch.trim().toLowerCase();
    return state.offers.filter((o) => {
      if (o.status === 'sold') return false;
      if (o.expiresAt && o.expiresAt <= Date.now()) return false;
      if (!matchesGeo(o)) return false;
      if (state.marketCat !== 'all' && o.cat !== state.marketCat) return false;
      if (q) {
        const hay = `${o.title} ${o.desc || ''} ${o.seller} ${o.gov} ${D.getMarketCatInfo(o.cat).label}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => distanceOf(a) - distanceOf(b) || (b.createdAt - a.createdAt));
  }

  function isOfferOwner(o) {
    if (!isAccountActive()) return false;
    if (o.userId && state.account.userId && o.userId === state.account.userId) return true;
    return D.cleanPhone(o.phone) === D.cleanPhone(state.account.phone);
  }

  function renderMarket() {
    const list = getFilteredOffers();
    const totalActive = state.offers.filter((o) => o.status !== 'sold' && (!o.expiresAt || o.expiresAt > Date.now()) && matchesGeo(o)).length;
    $('statOffersCount').textContent = String(totalActive);
    $('marketResultCount').textContent = `${list.length} عرض • الأقرب أولاً`;

    $('marketCatGridWrap').classList.toggle('hidden', !state.showMarketCatGrid);
    const activeChip = $('marketActiveCatChip');
    if (state.marketCat !== 'all') {
      const ci = D.getMarketCatInfo(state.marketCat);
      $('marketActiveCatLbl').textContent = `${ci.icon} ${ci.label}`;
      activeChip.classList.remove('hidden');
    } else {
      activeChip.classList.add('hidden');
    }

    const box = $('marketList');
    if (!list.length) {
      box.innerHTML = `
        <div class="rounded-3xl border border-dashed border-[#CFD9D5] bg-white p-6 text-center space-y-2">
          <div class="text-2xl">🧺</div>
          <p class="text-xs font-extrabold text-slate-600">لا توجد عروض مطابقة في «${D.escHtml(state.gov)}» حالياً.</p>
          <button type="button" data-expand-all="1" class="rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-extrabold text-[#0D6857] hover:bg-emerald-100">عرض كل تونس</button>
        </div>
      `;
      return;
    }

    const visibleList = list.slice(0, state.marketLimit);
    const cardsHtml = visibleList.map((o, idx) => {
      const cat = D.getMarketCatInfo(o.cat);
      const ph = D.cleanPhone(o.phone);
      const dist = getDistBadge(o);
      const owner = isOfferOwner(o);
      const isClosest = idx === 0;
      const cardBorder = isClosest ? 'border-2 border-amber-400/90 shadow-md' : 'border border-[#E4EAE8] shadow-sm';
      const topBadge = isClosest
        ? `<span class="inline-flex items-center gap-1 rounded-full bg-amber-100/90 border border-amber-200 px-3 py-1 text-[11px] font-black text-amber-900">⭐ الأقرب إليك</span>`
        : `<span class="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-[11px] font-black text-amber-950">${cat.icon} ${D.escHtml(cat.label)}</span>`;
      const imgBlock = o.imageUrl
        ? `<div class="overflow-hidden rounded-2xl border border-[#EAE5D8] bg-slate-100"><img src="${D.escHtml(o.imageUrl)}" alt="${D.escHtml(o.title)}" loading="lazy" decoding="async" class="h-52 w-full object-cover" /></div>`
        : `<div class="flex h-36 w-full flex-col items-center justify-center rounded-2xl border border-[#EAE5D8] bg-gradient-to-br from-[#E8F6F2] via-[#F7F9F8] to-[#FEF3C7]/60 text-center px-4">
             <div class="text-4xl">${cat.icon}</div>
             <div class="mt-1.5 text-xs font-extrabold text-[#0D6857]/80">${D.escHtml(cat.label)} • ${D.escHtml(o.gov)}</div>
           </div>`;
      return `
        <article class="rounded-3xl ${cardBorder} bg-white p-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            ${topBadge}
            ${dist ? `<span class="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-black text-[#0D6857]">${D.escHtml(dist)}</span>` : ''}
          </div>
          <h3 class="text-base sm:text-lg font-black text-[#132A23] leading-snug">${D.escHtml(o.title)}</h3>
          <div class="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-600">
            <span>${D.escHtml(o.seller)}</span>
            <span class="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">✅ موثّق</span>
            <span>• 📍 ${D.escHtml(o.gov)}</span>
            <span class="text-amber-800">• ⏱️ ${D.escHtml(D.formatRemaining(o.expiresAt))}</span>
          </div>
          ${imgBlock}
          <div class="rounded-2xl border-r-4 border-amber-500 bg-[#FFF9EC] px-3.5 py-2.5 space-y-1">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-extrabold text-amber-950">💰 السعر:</span>
              <span class="text-base font-black text-[#0D6857]">${D.escHtml(o.price)} د.ت</span>
            </div>
            ${o.desc ? `<p class="text-xs font-bold text-slate-700 leading-relaxed">• ${D.escHtml(o.desc)}</p>` : ''}
          </div>
          <div class="grid grid-cols-3 gap-1.5 pt-1">
            <a href="tel:+216${ph}" class="flex items-center justify-center gap-1 rounded-xl bg-[#0D6857] py-2.5 text-xs font-extrabold text-white hover:bg-[#094D40] transition"><span>📞</span><span>اتصال</span></a>
            <a href="https://wa.me/216${ph}?text=${encodeURIComponent('مرحباً، بخصوص عرضك على خوذ بايك: ' + o.title)}" target="_blank" rel="noopener" class="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 transition"><span>💬</span><span>واتساب</span></a>
            <button type="button" data-focus-map="market:${D.escHtml(o.id)}" class="flex items-center justify-center gap-1 rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] py-2.5 text-xs font-extrabold text-[#132A23] hover:bg-emerald-50 transition"><span>🗺️</span><span>الخريطة</span></button>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 text-[11px] font-extrabold">
            <div class="flex items-center gap-1.5">
              <button type="button" data-share-offer="${D.escHtml(o.id)}" class="rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-slate-700 transition">📤 مشاركة</button>
              <button type="button" data-report-offer="${D.escHtml(o.id)}" class="rounded-lg bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-rose-700 transition">🚩 إبلاغ</button>
            </div>
            ${owner ? `<button type="button" data-mark-sold="${D.escHtml(o.id)}" class="rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1 text-amber-950 transition">✅ تم البيع</button>` : ''}
          </div>
        </article>
      `;
    }).join('');
    const moreBtn = list.length > state.marketLimit
      ? `<button type="button" data-load-more-market="1" class="w-full rounded-2xl border border-[#0D6857] bg-white py-3 text-xs font-black text-[#0D6857] hover:bg-emerald-50 transition">⬇️ عرض المزيد (${list.length - state.marketLimit} عرض متبقٍ)</button>`
      : '';
    box.innerHTML = cardsHtml + moreBtn;
  }

  // ==================== CRAFTSMEN ====================
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
    }).sort((a, b) => distanceOf(a) - distanceOf(b) || (b.rating - a.rating));
  }

  function renderCrafts() {
    const list = getFilteredCrafts();
    const specInfo = state.craftCat !== 'all' ? D.getCraftCatInfo(state.craftCat) : null;
    $('craftListTitle').textContent = specInfo ? `${specInfo.icon} ${specInfo.label}` : '🛠️ أقرب الحرفيين المتاحين';
    $('craftResultCount').textContent = `${list.length} حرفي • الأقرب أولاً`;

    const box = $('craftList');
    if (!list.length) {
      box.innerHTML = `
        <div class="rounded-3xl border border-dashed border-[#CFD9D5] bg-white p-6 text-center space-y-2">
          <div class="text-2xl">🛠️</div>
          <p class="text-xs font-extrabold text-slate-600">لا يوجد حرفيون مسجّلون في هذا الاختصاص ضمن «${D.escHtml(state.gov)}» حالياً.</p>
          <button type="button" data-expand-all="1" class="rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-extrabold text-[#0D6857]">عرض كل تونس</button>
        </div>
      `;
      return;
    }

    box.innerHTML = list.map((c) => {
      const sp = D.getCraftCatInfo(c.spec);
      const ph = D.cleanPhone(c.phone);
      const dist = getDistBadge(c);
      return `
        <article class="rounded-3xl border border-[#E4EAE8] bg-white p-4 shadow-sm space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-black text-[#0D6857]">${sp.icon} ${D.escHtml(sp.label)}</span>
            ${dist ? `<span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700">📍 ${D.escHtml(dist)}</span>` : ''}
          </div>
          <h3 class="text-sm sm:text-base font-black text-[#132A23]">${D.escHtml(c.name)}</h3>
          <p class="text-xs font-bold text-slate-500">⭐ ${Number(c.rating).toFixed(1)} (${c.reviews}) • 📍 ${D.escHtml(c.gov)} — ${D.escHtml(c.area)}</p>
          <p class="text-xs font-semibold text-slate-700">${D.escHtml(c.note)}</p>
          <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
            <a href="tel:+216${ph}" class="flex items-center justify-center gap-1 rounded-xl bg-[#0D6857] py-2 text-xs font-extrabold text-white"><span>📞</span><span>اتصال</span></a>
            <a href="https://wa.me/216${ph}?text=${encodeURIComponent('مرحباً، وجدت رقمك على خوذ بايك وأحتاج خدمة: ' + sp.label)}" target="_blank" rel="noopener" class="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 text-xs font-extrabold text-white"><span>💬</span><span>واتساب</span></a>
            <button type="button" data-focus-map="crafts:${D.escHtml(c.id)}" class="flex items-center justify-center gap-1 rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] py-2 text-xs font-extrabold text-[#132A23]"><span>🗺️</span><span>الموقع</span></button>
          </div>
        </article>
      `;
    }).join('');
  }

  // ==================== EMERGENCIES ====================
  function getFilteredEmergencies() {
    return state.emergencies.filter((e) => {
      if (e.status !== 'open') return false;
      if (!matchesGeo(e)) return false;
      if (state.emergCat !== 'all' && e.type !== state.emergCat) return false;
      return true;
    }).sort((a, b) => distanceOf(a) - distanceOf(b) || (b.createdAt - a.createdAt));
  }

  function renderEmergencies() {
    const allOpen = state.emergencies.filter((e) => e.status === 'open').length;
    const list = getFilteredEmergencies();
    $('emergBannerTitle').textContent = `🚨 طوارئ المواطنين 24/24 — ${state.gov}`;
    $('openEmergencyCounter').textContent = String(allOpen);
    $('navEmergBadge').textContent = String(allOpen);

    const claimedWrap = $('myClaimedBox');
    if (state.claimedEmergencies.length) {
      claimedWrap.classList.remove('hidden');
      $('myClaimedList').innerHTML = state.claimedEmergencies.map((e) => {
        const ph = D.cleanPhone(e.phone);
        return `
          <div class="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1.5">
            <div class="flex items-center justify-between text-xs font-black text-emerald-950">
              <span>✅ استلمت: ${D.escHtml(e.type)} (${D.escHtml(e.gov)})</span>
              <button type="button" data-finish-claimed="${D.escHtml(e.id)}" class="rounded-lg bg-white border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">إنهاء</button>
            </div>
            <p class="text-xs font-semibold text-slate-700">${D.escHtml(e.desc)}</p>
            <div class="flex gap-1.5 pt-1">
              ${ph ? `<a href="tel:+216${ph}" class="flex-1 rounded-lg bg-[#0D6857] py-1.5 text-center text-xs font-extrabold text-white">📞 اتصال (${D.escHtml(ph)})</a>` : ''}
              <a href="https://maps.google.com/?q=${e.lat},${e.lng}" target="_blank" rel="noopener" class="flex-1 rounded-lg bg-white border border-emerald-300 py-1.5 text-center text-xs font-extrabold text-emerald-900">🧭 فتح في الخرائط</a>
            </div>
          </div>
        `;
      }).join('');
    } else {
      claimedWrap.classList.add('hidden');
    }

    const box = $('emergencyList');
    if (!list.length) {
      box.innerHTML = `
        <div class="rounded-3xl border border-[#E4EAE8] bg-white p-6 text-center space-y-2 shadow-sm">
          <p class="text-sm font-extrabold text-slate-600">لا توجد بلاغات طوارئ مفتوحة حالياً في نطاق ${D.escHtml(state.gov)}.</p>
          <button type="button" data-expand-all="1" class="rounded-xl bg-rose-50 px-3.5 py-1.5 text-xs font-extrabold text-rose-700">عرض بلاغات كل تونس</button>
        </div>
      `;
      return;
    }

    box.innerHTML = list.map((e) => {
      const ph = D.cleanPhone(e.phone);
      const dist = getDistBadge(e);
      return `
        <article class="rounded-3xl border border-rose-200 bg-white p-4 shadow-sm space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-800">🚨 ${D.escHtml(e.type)}</span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">🕒 ${D.escHtml(D.formatAgo(e.createdAt))}</span>
            </div>
            <span class="text-[11px] font-extrabold text-rose-700">📍 ${D.escHtml(e.gov)}${dist ? ' • ' + D.escHtml(dist) : ''}</span>
          </div>
          <p class="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">${D.escHtml(e.desc)}</p>
          <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-rose-100">
            ${ph ? `<a href="tel:+216${ph}" class="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-rose-600 py-2 px-2.5 text-xs font-extrabold text-white"><span>📞</span><span>اتصال</span></a>` : ''}
            <button type="button" data-focus-map="emergency:${D.escHtml(e.id)}" class="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 py-2 px-2.5 text-xs font-extrabold text-rose-800"><span>🗺️</span><span>الموقع</span></button>
            <button type="button" data-claim-emerg="${D.escHtml(e.id)}" class="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-[#0D6857] py-2 px-2.5 text-xs font-extrabold text-white"><span>✅</span><span>استلام</span></button>
          </div>
        </article>
      `;
    }).join('');
  }

  // ==================== ACCOUNT ====================
  function renderAccount() {
    const authBox = $('accountGoogleBox');
    const phoneBox = $('accountPhoneStepBox');
    const dashBox = $('accountDashBox');

    if (isAccountActive()) {
      authBox.classList.add('hidden');
      phoneBox.classList.add('hidden');
      dashBox.classList.remove('hidden');

      const acc = state.account;
      const roleLbl = acc.role === 'craftsman' ? '🛠️ حرفي / ورشة' : '🛒 معلن / بائع';
      $('dashName').textContent = acc.name;
      $('dashMeta').textContent = `${roleLbl} • +216 ${acc.phone} • ${acc.gov}`;
      $('dashEmail').textContent = acc.email ? `📧 ${acc.email}` : '';

      const endMs = acc.trialEndsAt || (acc.createdAt + 60 * 24 * C.HR);
      const leftDays = Math.max(0, Math.ceil((endMs - Date.now()) / (24 * C.HR)));
      const pct = Math.max(5, Math.min(100, Math.round((leftDays / 60) * 100)));
      $('trialDaysLeft').textContent = `متبقي ${leftDays} يوماً`;
      $('trialBar').style.width = `${pct}%`;
      $('trialEndTxt').textContent = `تنتهي التجربة المجانية في: ${new Date(endMs).toLocaleDateString('ar-TN')}`;

      const myOffers = state.offers.filter((o) => isOfferOwner(o) && o.status !== 'sold');
      const myCrafts = state.crafts.filter((c) => D.cleanPhone(c.phone) === D.cleanPhone(acc.phone));
      const items = [
        ...myOffers.map((o) => `<div class="flex items-center justify-between gap-2 rounded-xl bg-[#F8FAF9] border border-[#E4EAE8] px-3 py-2 text-[#132A23]"><span class="truncate">🧺 ${D.escHtml(o.title)} (${D.escHtml(o.price)} د.ت)</span><button type="button" data-mark-sold="${D.escHtml(o.id)}" class="shrink-0 rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-950">✅ تم البيع</button></div>`),
        ...myCrafts.map((c) => `<div class="rounded-xl bg-[#F8FAF9] border border-[#E4EAE8] px-3 py-2 text-[#132A23]">🛠️ ${D.escHtml(c.name)} (${D.escHtml(c.gov)})</div>`)
      ];
      $('myPostsList').innerHTML = items.length ? items.join('') : '<p class="text-slate-400">لم تنشر بعد أي عروض أو بطاقات بهذا الحساب.</p>';
      return;
    }

    dashBox.classList.add('hidden');
    if (state.authUser) {
      authBox.classList.add('hidden');
      phoneBox.classList.remove('hidden');
      $('googleSignedEmail').textContent = state.authUser.email || '';
      if (!$('accName').value && state.authUser.user_metadata && state.authUser.user_metadata.full_name) {
        $('accName').value = state.authUser.user_metadata.full_name;
      }
    } else {
      authBox.classList.remove('hidden');
      phoneBox.classList.add('hidden');
    }
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
    $('locStatusTxt').textContent = `الولاية: ${state.gov}`;
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

  function toggleVehicleFields() {
    $('vehicleSpecsBox').classList.toggle('hidden', $('ofCat').value !== 'vehicles');
  }

  function openModal(id) {
    if (id === 'offerModal' && !requireActiveAccount('⚠️ لنشر عرض، فعّل حسابك عبر Google ورقم الهاتف التونسي أولاً.')) return;
    if (id === 'craftModal' && !requireActiveAccount('⚠️ لإضافة مهنتك، فعّل حسابك عبر Google ورقم الهاتف التونسي أولاً.')) return;

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
      $('ofPhone').value = (state.account && state.account.phone) || '';
      $('ofSeller').value = (state.account && state.account.name) || '';
      state.pendingOfferPhoto = null;
      state.offerCoords = state.userCoords ? { ...state.userCoords } : null;
      $('ofPhotoPreview').classList.add('hidden');
      $('ofPhotoStatus').textContent = '📸 اضغط لالتقاط صورة المنتوج أو السيارة (تُضغط تلقائياً < 100 KB)';
      $('ofGpsStatus').textContent = state.offerCoords ? `✓ موقع GPS جاهز (${state.offerCoords.lat.toFixed(3)}, ${state.offerCoords.lng.toFixed(3)})` : 'سيُستخدم موقع الولاية أو اضغط لتحديد موقعك الدقيق';
      toggleVehicleFields();
    } else if (id === 'craftModal') {
      $('crGov').value = state.gov;
      $('crPhone').value = (state.account && state.account.phone) || '';
      $('crName').value = (state.account && state.account.name) || '';
    }
  }

  function closeModal(id) { $(id).classList.add('hidden'); }

  function updateMapLayerButtons() {
    const styles = {
      market: ['bg-[#0D6857]', 'text-white'],
      crafts: ['bg-blue-700', 'text-white'],
      emergency: ['bg-rose-600', 'text-white']
    };
    document.querySelectorAll('[data-map-layer]').forEach((btn) => {
      const k = btn.dataset.mapLayer;
      btn.classList.remove('bg-[#0D6857]', 'bg-blue-700', 'bg-rose-600', 'text-white', 'bg-white', 'text-slate-500');
      if (state.mapLayers[k]) btn.classList.add(...styles[k]);
      else btn.classList.add('bg-white', 'text-slate-500');
    });
  }

  // ==================== EVENTS ====================
  $('govSelect').addEventListener('change', async (e) => {
    state.gov = e.target.value;
    state.userCoords = null;
    state.marketLimit = 15;
    D.lsSet(D.STORE_KEYS.prefs, { gov: state.gov, radius: state.radius });
    renderAll();
    showToast(`📍 تم تغيير الولاية إلى ${state.gov}`);
    if (await D.syncFromSupabase(state, true)) renderAll();
  });

  $('radiusSelect').addEventListener('change', async (e) => {
    state.radius = e.target.value;
    state.marketLimit = 15;
    D.lsSet(D.STORE_KEYS.prefs, { gov: state.gov, radius: state.radius });
    renderAll();
    if (await D.syncFromSupabase(state, true)) renderAll();
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
        showToast(`✓ تم ربط موقعك بولاية ${state.gov} وترتيب الأقرب أولاً`);
      },
      () => showToast('⚠️ تعذر قراءة GPS؛ تم الإبقاء على ولاية ' + state.gov),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  });

  $('marketShowAllBtn').addEventListener('click', () => {
    state.marketCat = 'all';
    state.showMarketCatGrid = false;
    renderAll();
  });

  $('marketToggleCatsBtn').addEventListener('click', () => {
    state.showMarketCatGrid = !state.showMarketCatGrid;
    $('marketCatGridWrap').classList.toggle('hidden', !state.showMarketCatGrid);
  });

  $('marketClearCatBtn').addEventListener('click', () => {
    state.marketCat = 'all';
    renderAll();
  });

  $('marketSearch').addEventListener('input', (e) => { state.marketSearch = e.target.value; renderMarket(); });
  $('craftSearch').addEventListener('input', (e) => { state.craftSearch = e.target.value; renderCrafts(); });
  $('ofCat').addEventListener('change', toggleVehicleFields);

  $('ofPhotoInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    $('ofPhotoStatus').textContent = '⏳ جاري ضغط الصورة...';
    try {
      const res = await D.compressImageFile(file, 680, 55000);
      state.pendingOfferPhoto = res;
      $('ofPhotoPreview').src = res.dataUrl;
      $('ofPhotoPreview').classList.remove('hidden');
      $('ofPhotoStatus').textContent = `✓ الصورة جاهزة (${res.sizeKb} KB — مضغوطة وسريعة)`;
    } catch (_) {
      state.pendingOfferPhoto = null;
      $('ofPhotoStatus').textContent = '⚠️ تعذر قراءة الصورة، جرّب صورة أخرى.';
    }
  });

  $('ofGpsBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return showToast('⚠️ GPS غير متاح');
    $('ofGpsStatus').textContent = '📡 جاري التقاط موقعك الدقيق...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.offerCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        $('ofGpsStatus').textContent = `✓ تم التقاط موقعك الدقيق (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
      },
      () => { $('ofGpsStatus').textContent = '⚠️ تعذر قراءة GPS؛ سيُستخدم موقع الولاية.'; }
    );
  });

  document.addEventListener('click', async (e) => {
    const navBtn = e.target.closest('[data-tab]');
    if (navBtn) return switchTab(navBtn.dataset.tab);

    const mCat = e.target.closest('[data-market-cat]');
    if (mCat) {
      state.marketCat = mCat.dataset.marketCat;
      state.showMarketCatGrid = false;
      renderCategoryBars();
      renderMarket();
      return;
    }

    const cGrp = e.target.closest('[data-craft-group]');
    if (cGrp) {
      state.craftGroup = cGrp.dataset.craftGroup;
      state.craftCat = 'all';
      renderCategoryBars();
      renderCrafts();
      return;
    }

    const cCat = e.target.closest('[data-craft-cat]');
    if (cCat) {
      state.craftCat = state.craftCat === cCat.dataset.craftCat ? 'all' : cCat.dataset.craftCat;
      renderCategoryBars();
      renderCrafts();
      $('craftListTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const eCat = e.target.closest('[data-emerg-cat]');
    if (eCat) { state.emergCat = eCat.dataset.emergCat; renderCategoryBars(); renderEmergencies(); return; }

    if (e.target.closest('[data-load-more-market]')) {
      state.marketLimit += 15;
      renderMarket();
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

    const soldBtn = e.target.closest('[data-mark-sold]');
    if (soldBtn) {
      const id = soldBtn.dataset.markSold;
      await D.markOfferSold(id, state.account && state.account.userId);
      state.offers = state.offers.map((o) => o.id === id ? { ...o, status: 'sold' } : o);
      D.lsSet(D.STORE_KEYS.offers, state.offers);
      renderAll();
      showToast('✅ تم تحديد الإعلان كمباع وإخفاؤه من السوق.');
      return;
    }

    const shareBtn = e.target.closest('[data-share-offer]');
    if (shareBtn) {
      const o = state.offers.find((x) => x.id === shareBtn.dataset.shareOffer);
      if (!o) return;
      const text = `🧺 ${o.title}\n💰 السعر: ${o.price} د.ت — 📍 ${o.gov}\n📞 ${D.cleanPhone(o.phone)}\nعبر تطبيق خوذ بايك: ${window.location.href}`;
      if (navigator.share) navigator.share({ title: o.title, text, url: window.location.href }).catch(() => {});
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      return;
    }

    const repBtn = e.target.closest('[data-report-offer]');
    if (repBtn) {
      const o = state.offers.find((x) => x.id === repBtn.dataset.reportOffer);
      if (!o) return;
      state.reportTarget = { type: 'offer', id: o.id, title: o.title };
      $('reportTargetTitle').textContent = o.title;
      openModal('reportModal');
      return;
    }

    const claimBtn = e.target.closest('[data-claim-emerg]');
    if (claimBtn) {
      if (!requireActiveAccount('⚠️ لاستلام بلاغ طارئ، فعّل حسابك عبر Google ورقم الهاتف أولاً.')) return;
      const id = claimBtn.dataset.claimEmerg;
      const item = state.emergencies.find((x) => x.id === id);
      if (!item) return;
      const res = await D.claimEmergencyAtomic(id, state.account && state.account.userId);
      if (res.alreadyClaimed) {
        state.emergencies = state.emergencies.filter((x) => x.id !== id);
        renderAll();
        showToast('⚠️ تم استلام هذا البلاغ للتو من طرف شخص آخر.');
        return;
      }
      state.emergencies = state.emergencies.map((em) => em.id === id ? { ...em, status: 'claimed', claimedBy: state.account.userId } : em);
      state.claimedEmergencies.unshift({ ...item, status: 'claimed' });
      D.lsSet(D.STORE_KEYS.emergencies, state.emergencies);
      D.lsSet(D.STORE_KEYS.claimed, state.claimedEmergencies);
      renderAll();
      showToast('✅ تم استلام البلاغ وإخفاؤه من القائمة العامة — بيانات التواصل محفوظة لك بالأعلى.');
      return;
    }

    const finBtn = e.target.closest('[data-finish-claimed]');
    if (finBtn) {
      const id = finBtn.dataset.finishClaimed;
      state.claimedEmergencies = state.claimedEmergencies.filter((x) => x.id !== id);
      D.lsSet(D.STORE_KEYS.claimed, state.claimedEmergencies);
      renderEmergencies();
      showToast('✓ تم إغلاق البلاغ بنجاح.');
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
  $('openDeleteAccModalBtn').addEventListener('click', () => openModal('deleteAccountModal'));

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

  $('googleSignInBtn').addEventListener('click', async () => {
    try {
      showToast('⏳ جاري التحويل لحساب Google...');
      await D.signInWithGoogle();
    } catch (err) {
      showToast('⚠️ تعذر الاتصال بـ Google: ' + ((err && err.message) || 'تأكد من تفعيل Google في Supabase Auth'));
    }
  });

  $('phoneActivationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ph = D.cleanPhone($('accPhone').value);
    if (!D.isValidTnPhone(ph)) {
      return showToast('⚠️ رقم الهاتف التونسي إجباري ويجب أن يكون 8 أرقام صحيحة.');
    }
    const name = $('accName').value.trim();
    if (!name) return showToast('⚠️ يرجى إدخال الاسم أو اسم الورشة.');

    const now = Date.now();
    const acc = {
      userId: (state.authUser && state.authUser.id) || '',
      email: (state.authUser && state.authUser.email) || '',
      name,
      role: $('accRole').value,
      phone: ph,
      gov: state.gov,
      createdAt: now,
      trialEndsAt: now + 60 * 24 * C.HR,
      verified: true
    };
    const saved = await D.saveCloudAccount(acc);
    if (!saved.ok && D.isSupabaseConnected()) {
      showToast('⚠️ تعذر حفظ الحساب سحابياً — تأكد من تشغيل ملف supabase_v1.1_migration.sql');
    }
    state.account = acc;
    D.lsSet(D.STORE_KEYS.account, acc);
    renderAccount();
    showToast('🎉 تم تفعيل حسابك بنجاح مع فترة تجربة مجانية لمدة 60 يوماً!');
  });

  $('logoutBtn').addEventListener('click', async () => {
    await D.signOutGoogle();
    state.authUser = null;
    state.account = null;
    renderAccount();
    showToast('تم تسجيل الخروج بنجاح.');
  });

  $('cancelGoogleStepBtn').addEventListener('click', async () => {
    await D.signOutGoogle();
    state.authUser = null;
    state.account = null;
    renderAccount();
  });

  $('confirmDeleteAccBtn').addEventListener('click', async () => {
    const uid = (state.account && state.account.userId) || (state.authUser && state.authUser.id) || '';
    await D.deleteUserAccountAndData(uid);
    state.authUser = null;
    state.account = null;
    state.claimedEmergencies = [];
    closeModal('deleteAccountModal');
    renderAll();
    showToast('✓ تم حذف حسابك وبياناتك نهائياً.');
  });

  $('emergencyForm').addEventListener('submit', async (e) => {
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
      status: 'open',
      claimedBy: ''
    };
    const res = await D.pushEmergency(newEm);
    newEm.id = res.id || newEm.id;
    state.emergencies.unshift(newEm);
    D.lsSet(D.STORE_KEYS.emergencies, state.emergencies);
    e.target.reset();
    closeModal('emergencyModal');
    renderAll();
    showToast('🚨 تم نشر البلاغ الطارئ بنجاح!');
  });

  $('offerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireActiveAccount()) return;
    const submitBtn = $('ofSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري رفع الصورة ونشر العرض...';
    try {
      const g = D.getGovObj($('ofGov').value);
      const jitter = () => (Math.random() - 0.5) * 0.015;
      const lat = state.offerCoords ? state.offerCoords.lat : (g.lat + jitter());
      const lng = state.offerCoords ? state.offerCoords.lng : (g.lng + jitter());

      let imageUrl = '';
      if (state.pendingOfferPhoto) {
        imageUrl = await D.uploadOfferImage(state.pendingOfferPhoto.blob, state.pendingOfferPhoto.dataUrl, state.account.userId);
      }

      let desc = $('ofDesc').value.trim();
      if ($('ofCat').value === 'vehicles') {
        const specs = [
          $('vehBrand').value.trim(),
          $('vehYear').value.trim() ? `سنة ${$('vehYear').value.trim()}` : '',
          $('vehKm').value.trim() ? `${$('vehKm').value.trim()} كم` : '',
          $('vehFuel').value
        ].filter(Boolean).join(' • ');
        if (specs) desc = specs + (desc ? ' — ' + desc : '');
      }

      const newOf = {
        id: 'of-' + Date.now(),
        title: $('ofTitle').value.trim(),
        cat: $('ofCat').value,
        price: Number($('ofPrice').value),
        gov: $('ofGov').value,
        phone: D.cleanPhone($('ofPhone').value || state.account.phone),
        seller: $('ofSeller').value.trim(),
        desc,
        imageUrl,
        status: 'active',
        userId: state.account.userId || '',
        lat, lng,
        createdAt: Date.now(),
        expiresAt: Date.now() + C.OFFER_TTL_HOURS * C.HR
      };
      const res = await D.pushOffer(newOf);
      if (!res.ok && res.error && res.error.includes('10')) {
        showToast('⚠️ ' + res.error);
        return;
      }
      newOf.id = res.id || newOf.id;
      state.offers.unshift(newOf);
      D.lsSet(D.STORE_KEYS.offers, state.offers);
      e.target.reset();
      state.pendingOfferPhoto = null;
      closeModal('offerModal');
      renderAll();
      showToast('✓ تم نشر عرضك (يختفي تلقائياً بعد 3 أيام أو عند الضغط على تم البيع)');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'نشر العرض الآن (صالح 3 أيام)';
    }
  });

  $('craftForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireActiveAccount()) return;
    const g = D.getGovObj($('crGov').value);
    const jitter = () => (Math.random() - 0.5) * 0.015;
    const newCr = {
      id: 'cr-' + Date.now(),
      name: $('crName').value.trim(),
      spec: $('crSpec').value,
      gov: $('crGov').value,
      area: $('crArea').value.trim(),
      phone: D.cleanPhone($('crPhone').value || state.account.phone),
      note: $('crNote').value.trim(),
      userId: state.account.userId || '',
      rating: 5.0,
      reviews: 1,
      lat: state.userCoords ? state.userCoords.lat : (g.lat + jitter()),
      lng: state.userCoords ? state.userCoords.lng : (g.lng + jitter())
    };
    await D.pushCraft(newCr);
    state.crafts.unshift(newCr);
    D.lsSet(D.STORE_KEYS.crafts, state.crafts);
    e.target.reset();
    closeModal('craftModal');
    renderAll();
    showToast('✓ تمت إضافة بطاقتك في دليل الحرفيين!');
  });

  $('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.reportTarget) return;
    await D.submitReport(state.reportTarget.type, state.reportTarget.id, $('reportReason').value, state.account && state.account.userId);
    closeModal('reportModal');
    showToast('🚩 شكراً لك، تم إرسال البلاغ لمراجعة الإعلان.');
  });

  setInterval(() => {
    if (state.activeTab === 'market') renderMarket();
  }, 60000);

  async function init() {
    populateSelects();
    renderAll();
    if (D.isSupabaseConnected()) {
      $('syncBadge').textContent = '🟢 متصل بـ Supabase';
      const [authUser, synced] = await Promise.all([D.getAuthUser(), D.syncFromSupabase(state)]);
      if (authUser) {
        state.authUser = authUser;
        const cloudAcc = await D.fetchCloudAccount(authUser.id);
        if (cloudAcc && cloudAcc.verified) {
          state.account = cloudAcc;
          D.lsSet(D.STORE_KEYS.account, cloudAcc);
        } else if (state.account && state.account.userId !== authUser.id) {
          state.account = null;
        }
      }
      if (synced || authUser) renderAll();
    }
  }

  init();
})();