// خوذ بايك — منطق الواجهة الكامل (v1.5-TN: أنا هنا الآن، تخفيض السعر، 24س، مشاركة فيسبوك، إعادة فتح الطوارئ، تبديل الحساب، حماية المعطيات)
(() => {
  'use strict';

  const C = window.KB_CONFIG;
  const D = window.KB_DATA;
  const M = window.KB_MAP;
  const P = window.KB_PRIVACY;
  const $ = (id) => document.getElementById(id);

  const savedPrefs = D.lsGet(D.STORE_KEYS.prefs, { gov: 'قابس', radius: 'gov' });
  const defaultFavs = D.lsGet(D.STORE_KEYS.favCats, ['produce', 'meat', 'fish', 'dairy']);
  const state = {
    activeTab: 'market',
    gov: savedPrefs.gov || 'قابس',
    radius: savedPrefs.radius || 'gov',
    userCoords: null,
    marketSearch: '',
    marketCat: 'all',
    showMarketCatGrid: false,
    showFavsOnly: false,
    showFavsPanel: false,
    favCats: Array.isArray(defaultFavs) ? defaultFavs : [],
    showMarketFilters: false,
    marketSort: 'nearest',
    minPrice: '',
    maxPrice: '',
    vehBrand: '',
    vehYear: '',
    vehKm: '',
    marketLimit: 15,
    craftSearch: '',
    craftGroup: 'all',
    craftCat: 'all',
    emergCat: 'all',
    mapLayers: { market: true, crafts: true, emergency: true },
    offers: D.lsGet(D.STORE_KEYS.offers, []),
    crafts: D.lsGet(D.STORE_KEYS.crafts, []),
    emergencies: D.lsGet(D.STORE_KEYS.emergencies, []),
    authUser: null,
    account: D.lsGet(D.STORE_KEYS.account, null),
    pickerCoords: { lat: 33.8815, lng: 10.0982 },
    emLocationConfirmed: false,
    pendingEmPhoto: null,
    offerCoords: null,
    pendingOfferPhoto: null,
    reportTarget: null,
    quickPriceTarget: null,
    shareTarget: null,
    shareKind: 'offer',
    editingCraftId: null,
    sharedOfferId: null,
    liveWatchId: null,
    liveOfferId: null,
    lastLivePushAt: 0
  };

  let toastTimer = null;
  function showToast(msg) {
    const el = $('kbToast');
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3600);
  }

  function isAccountActive() {
    return Boolean(state.account && state.account.verified && D.isValidTnPhone(state.account.phone));
  }

  function getMyCraftSpecs() {
    const uid = (state.account && state.account.userId) || (state.authUser && state.authUser.id) || '';
    if (!uid) return [];
    return state.crafts
      .filter((c) => c.userId === uid)
      .map((c) => String(c.spec || '').trim())
      .filter(Boolean);
  }

  function canClaimEmergency(emergType) {
    const mySpecs = getMyCraftSpecs();
    if (!mySpecs.length) return false;

    const specMap = {
      'سبّاك طوارئ': ['plumbing'],
      'كهربائي طوارئ': ['electric'],
      'تسرب غاز': ['plumbing', 'heating'],
      'عطل سيارة': ['auto', 'auto_elec'],
      'مساعدة عاجلة': ['handyman', 'worker']
    };

    const allowedSpecs = specMap[emergType] || [];
    return mySpecs.some((sp) => allowedSpecs.includes(sp));
  }

  function isEmergencyVisibleToUser(_em) {
    return true;
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
    if (!item || !Number.isFinite(Number(item.lat)) || !Number.isFinite(Number(item.lng))) return 99999;
    const ref = getReferencePoint();
    return D.haversineKm(ref.lat, ref.lng, Number(item.lat), Number(item.lng));
  }

  function matchesGeo(item) {
    if (state.radius === 'all') return true;
    if (state.radius === 'gov') return item.gov === state.gov;
    const maxKm = Number(state.radius);
    if (!maxKm || !Number.isFinite(Number(item.lat)) || !Number.isFinite(Number(item.lng))) return item.gov === state.gov;
    return distanceOf(item) <= maxKm;
  }

  function getDistBadge(item) {
    if (!item || !Number.isFinite(Number(item.lat)) || !Number.isFinite(Number(item.lng))) return '';
    const km = distanceOf(item);
    return km < 1 ? 'أقل من 1 كم' : `${km.toFixed(1)} كم`;
  }

  function updateEmDistancePreview() {
    const ref = getReferencePoint();
    const km = D.haversineKm(ref.lat, ref.lng, state.pickerCoords.lat, state.pickerCoords.lng);
    const distTxt = km < 1 ? 'أقل من 1 كم' : `${km.toFixed(1)} كم`;
    $('emDistPreview').textContent = `📏 المسافة: ${distTxt}`;
    $('emCoordsTxt').textContent = `${state.pickerCoords.lat.toFixed(4)}, ${state.pickerCoords.lng.toFixed(4)}`;
    const badge = $('emLocBadge');
    if (state.emLocationConfirmed) {
      badge.textContent = '✓ تم تأكيد موقع البلاغ بنجاح';
      badge.className = 'text-emerald-700 font-black';
    } else {
      badge.textContent = '⚠️ اضغط على الخريطة أو زر GPS لتأكيد الموقع';
      badge.className = 'text-rose-700 font-bold';
    }
  }

  function stopLiveLocationBroadcast(silent = false) {
    if (state.liveWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(state.liveWatchId);
    }
    const prevId = state.liveOfferId;
    state.liveWatchId = null;
    state.liveOfferId = null;
    if (prevId && state.account && state.account.userId) {
      D.updateOfferLiveLocation(prevId, state.account.userId, 0, 0, false).catch(() => {});
      state.offers = state.offers.map((o) => o.id === prevId ? { ...o, liveLocation: false } : o);
      D.lsSet(D.STORE_KEYS.offers, state.offers);
      renderAll();
      if (!silent) showToast('⏹️ تم إيقاف بث موقعك المباشر.');
    }
  }

  function startLiveLocationBroadcast(offerId) {
    if (!navigator.geolocation) return showToast('⚠️ تحديد الموقع GPS غير متاح على هذا الجهاز.');
    if (state.liveOfferId && state.liveOfferId !== offerId) {
      stopLiveLocationBroadcast(true);
    }
    showToast('📡 جاري تفعيل «أنا هنا الآن» وتحديث موقعك...');
    const pushPos = async (lat, lng, isFirst) => {
      const now = Date.now();
      if (!isFirst && (now - state.lastLivePushAt) < 25000) return;
      state.lastLivePushAt = now;
      const res = await D.updateOfferLiveLocation(offerId, state.account.userId, lat, lng, true);
      if (!res.ok) {
        if (isFirst) showToast('⚠️ تعذر تحديث الموقع: ' + (res.error || 'حاول مجدداً'));
        return;
      }
      state.offers = state.offers.map((o) => o.id === offerId ? { ...o, lat, lng, liveLocation: true, liveUpdatedAt: now } : o);
      D.lsSet(D.STORE_KEYS.offers, state.offers);
      renderAll();
      if (isFirst) showToast('🟢 تم تفعيل «أنا هنا الآن» — يتحدّث موقعك تلقائياً حتى تضغط إيقاف.');
    };

    state.liveOfferId = offerId;
    state.lastLivePushAt = 0;
    navigator.geolocation.getCurrentPosition(
      (pos) => pushPos(pos.coords.latitude, pos.coords.longitude, true),
      () => {
        state.liveOfferId = null;
        showToast('⚠️ تعذر قراءة GPS، تأكد من تفعيل الموقع في الهاتف.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
    state.liveWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (state.liveOfferId === offerId) pushPos(pos.coords.latitude, pos.coords.longitude, false);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
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

  function renderFavCatsPanel() {
    $('favCatsCount').textContent = String(state.favCats.length);
    const btn = $('marketFavsBtn');
    if (state.showFavsOnly) {
      btn.className = 'rounded-full bg-amber-500 px-3 py-1 text-xs font-extrabold text-white shadow-sm';
    } else {
      btn.className = 'rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-950';
    }
    $('favCatsPanel').classList.toggle('hidden', !state.showFavsPanel);
    $('favCatsChips').innerHTML = C.MARKET_CATS.filter((c) => c.id !== 'all').map((c) => {
      const active = state.favCats.includes(c.id);
      const cls = active
        ? 'bg-[#0D6857] text-white border-[#0D6857]'
        : 'bg-white text-[#132A23] border-amber-200';
      return `
        <button type="button" data-toggle-fav-cat="${D.escHtml(c.id)}" class="rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition ${cls}">
          ${active ? '⭐' : '+'} ${c.icon} ${D.escHtml(c.label)}
        </button>
      `;
    }).join('');
  }

  function renderCategoryBars() {
    const geoOffers = state.offers.filter((o) => o.status === 'active' && (!o.expiresAt || o.expiresAt > Date.now()) && matchesGeo(o));
    $('marketCatBar').innerHTML = C.MARKET_CATS.filter((c) => c.id !== 'all').map((c) => {
      const cnt = geoOffers.filter((o) => o.cat === c.id).length;
      const isSelected = state.marketCat === c.id;
      const isFav = state.favCats.includes(c.id);
      const hasAny = cnt > 0;
      const tileCls = isSelected
        ? 'border-2 border-[#0D6857] bg-[#E8F6F2]'
        : (hasAny ? 'border border-amber-300 bg-amber-50/40' : 'border border-[#E4EAE8] bg-white');
      const pillCls = hasAny ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500';
      return `
        <button type="button" data-market-cat="${D.escHtml(c.id)}" class="kb-cat-tile relative rounded-3xl ${tileCls} p-4 text-center shadow-sm flex flex-col items-center justify-center gap-2">
          ${isFav ? '<span class="absolute top-2.5 left-2.5 text-xs" title="في المفضلة">⭐</span>' : ''}
          <span class="text-3xl leading-none">${c.icon}</span>
          <span class="text-xs sm:text-sm font-black text-[#132A23] leading-snug">${D.escHtml(c.label)}</span>
          <span class="rounded-full ${pillCls} px-3 py-0.5 text-[11px] font-extrabold">${cnt} عرض اليوم</span>
        </button>
      `;
    }).join('');

    const totalSpecs = C.CRAFT_CATS.filter((c) => c.id !== 'all').length;
    $('craftGroupBar').innerHTML = C.CRAFT_GROUPS.map((g) => {
      const lbl = g.id === 'all' ? `${g.label} (${totalSpecs})` : `${g.icon} ${g.label}`;
      return `
        <button type="button" data-craft-group="${D.escHtml(g.id)}" class="kb-pill ${state.craftGroup === g.id ? 'active' : 'bg-white text-[#132A23] border-[#DCE4E1]'} rounded-full border px-3.5 py-1.5 text-xs font-extrabold">
          ${D.escHtml(lbl)}
        </button>
      `;
    }).join('');

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
          <span class="rounded-full ${pillCls} px-3 py-0.5 text-[11px] font-extrabold">${cnt} حرفي</span>
        </button>
      `;
    }).join('');

    $('emergCatBar').innerHTML = C.EMERG_CATS.map((c) => `
      <button type="button" data-emerg-cat="${D.escHtml(c.id)}" class="kb-pill kb-pill-red ${state.emergCat === c.id ? 'active' : 'bg-white text-[#132A23] border-slate-200'} rounded-full border px-3.5 py-1.5 text-xs font-extrabold">
        ${c.icon} ${D.escHtml(c.label)}
      </button>
    `).join('');
  }

  function getFilteredOffers() {
    const q = D.normalizeAr(state.marketSearch);
    const minP = state.minPrice !== '' ? Number(state.minPrice) : null;
    const maxP = state.maxPrice !== '' ? Number(state.maxPrice) : null;
    const vBrand = D.normalizeAr(state.vehBrand);
    const vYear = state.vehYear !== '' ? Number(state.vehYear) : null;
    const vKm = state.vehKm !== '' ? Number(state.vehKm) : null;

    return state.offers.filter((o) => {
      if (o.status !== 'active') return false;
      if (o.expiresAt && o.expiresAt <= Date.now()) return false;
      if (!matchesGeo(o)) return false;
      if (state.marketCat !== 'all' && o.cat !== state.marketCat) return false;
      if (state.showFavsOnly && state.favCats.length && !state.favCats.includes(o.cat)) return false;
      if (minP !== null && Number(o.price) < minP) return false;
      if (maxP !== null && Number(o.price) > maxP) return false;
      if (q) {
        const hay = D.normalizeAr(`${o.title} ${o.desc || ''} ${o.seller} ${o.gov} ${D.getMarketCatInfo(o.cat).label}`);
        if (!hay.includes(q)) return false;
      }
      if (state.marketCat === 'vehicles' && (vBrand || vYear !== null || vKm !== null)) {
        const vText = D.normalizeAr(`${o.title} ${o.desc || ''}`);
        if (vBrand && !vText.includes(vBrand)) return false;
        if (vYear !== null) {
          const mY = String(o.desc || '').match(/(?:19[89]\d|20[0-2]\d)/);
          if (!mY || Number(mY[0]) < vYear) return false;
        }
        if (vKm !== null) {
          const mK = String(o.desc || '').replace(/,/g, '').match(/(\d{3,6})\s*كم/);
          if (!mK || Number(mK[1]) > vKm) return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (state.showFavsOnly) {
        const fa = state.favCats.includes(a.cat) ? 0 : 1;
        const fb = state.favCats.includes(b.cat) ? 0 : 1;
        if (fa !== fb) return fa - fb;
      }
      if (state.marketSort === 'newest') return (b.createdAt - a.createdAt);
      if (state.marketSort === 'cheapest') return (Number(a.price) - Number(b.price));
      return distanceOf(a) - distanceOf(b) || (b.createdAt - a.createdAt);
    });
  }

  function isOfferOwner(o) {
    if (!isAccountActive()) return false;
    return Boolean(o.userId && state.account.userId && o.userId === state.account.userId);
  }

  function renderMarket() {
    renderFavCatsPanel();
    const list = getFilteredOffers();
    const totalActive = state.offers.filter((o) => o.status === 'active' && (!o.expiresAt || o.expiresAt > Date.now()) && matchesGeo(o)).length;
    $('statOffersCount').textContent = String(totalActive);
    const sortLbl = state.marketSort === 'newest' ? 'الأحدث' : (state.marketSort === 'cheapest' ? 'الأرخص' : 'الأقرب أولاً');
    $('marketResultCount').textContent = `${list.length} عرض • ${sortLbl}`;

    $('marketCatGridWrap').classList.toggle('hidden', !state.showMarketCatGrid);
    $('marketFiltersBox').classList.toggle('hidden', !state.showMarketFilters);
    $('vehicleFilterRow').classList.toggle('hidden', state.marketCat !== 'vehicles');

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
      const isClosest = idx === 0 && state.marketSort === 'nearest';
      const hasDiscount = Number.isFinite(o.prevPrice) && o.prevPrice > Number(o.price);
      const isBroadcasting = state.liveOfferId === o.id || Boolean(o.liveLocation);
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
        <article id="offer-card-${D.escHtml(o.id)}" class="rounded-3xl ${state.sharedOfferId === o.id ? 'border-2 border-[#0D6857] ring-4 ring-emerald-200/70 shadow-lg' : cardBorder} bg-white p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-1.5">
            <div class="flex flex-wrap items-center gap-1.5">
              ${topBadge}
              ${hasDiscount ? '<span class="inline-flex items-center gap-0.5 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">تخفيض الآن 🔥</span>' : ''}
              ${isBroadcasting ? '<span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-[10px] font-black text-emerald-900">🟢 هنا الآن</span>' : ''}
            </div>
            ${dist ? `<span class="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-black text-[#0D6857]">${D.escHtml(dist)}</span>` : ''}
          </div>
          <h3 class="text-base sm:text-lg font-black text-[#132A23] leading-snug">${D.escHtml(o.title)}</h3>
          <div class="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-600">
            <span>${D.escHtml(o.seller)}</span>
            <span class="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">✓ حساب Google</span>
            <span>• 📍 ${D.escHtml(o.gov)}</span>
            <span class="text-amber-800">• ⏱️ ${D.escHtml(D.formatRemaining(o.expiresAt))}</span>
          </div>
          ${imgBlock}
          <div class="rounded-2xl border-r-4 ${hasDiscount ? 'border-rose-500 bg-rose-50/50' : 'border-amber-500 bg-[#FFF9EC]'} px-3.5 py-2.5 space-y-1">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-extrabold text-amber-950">💰 السعر:</span>
              <div class="flex items-center gap-2">
                ${hasDiscount ? `<span class="text-xs font-bold text-slate-400 line-through">${D.escHtml(o.prevPrice)} د.ت</span>` : ''}
                <span class="text-base font-black ${hasDiscount ? 'text-rose-700' : 'text-[#0D6857]'}">${D.escHtml(o.price)} د.ت</span>
              </div>
            </div>
            ${o.desc ? `<p class="text-xs font-bold text-slate-700 leading-relaxed">• ${D.escHtml(o.desc)}</p>` : ''}
          </div>
          <div class="grid grid-cols-3 gap-1.5 pt-1">
            ${ph ? `<a href="tel:+216${ph}" class="flex items-center justify-center gap-1 rounded-xl bg-[#0D6857] py-2.5 text-xs font-extrabold text-white hover:bg-[#094D40] transition"><span>📞</span><span>اتصال</span></a>` : '<span></span>'}
            ${ph ? `<a href="https://wa.me/216${ph}?text=${encodeURIComponent('مرحباً، بخصوص عرضك على خوذ بايك: ' + o.title)}" target="_blank" rel="noopener" class="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 transition"><span>💬</span><span>واتساب</span></a>` : '<span></span>'}
            <button type="button" data-focus-map="market:${D.escHtml(o.id)}" class="flex items-center justify-center gap-1 rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] py-2.5 text-xs font-extrabold text-[#132A23] hover:bg-emerald-50 transition"><span>🗺️</span><span>الخريطة</span></button>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 text-[11px] font-extrabold">
            <div class="flex items-center gap-1.5">
              <button type="button" data-share-offer="${D.escHtml(o.id)}" class="rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-slate-700 transition">📤 مشاركة</button>
              <button type="button" data-report-offer="${D.escHtml(o.id)}" class="rounded-lg bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-rose-700 transition">🚩 إبلاغ</button>
            </div>
            ${owner ? `
              <div class="flex flex-wrap items-center gap-1">
                <button type="button" data-live-loc-offer="${D.escHtml(o.id)}" class="rounded-lg ${state.liveOfferId === o.id ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'} px-2 py-1 transition">
                  ${state.liveOfferId === o.id ? '⏹️ إيقاف البث' : '📍 أنا هنا الآن'}
                </button>
                <button type="button" data-edit-price-offer="${D.escHtml(o.id)}" class="rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 text-blue-900 transition">🏷️ السعر</button>
                <button type="button" data-mark-sold="${D.escHtml(o.id)}" class="rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-1 text-amber-950 transition">✅ تم البيع</button>
              </div>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');
    const moreBtn = list.length > state.marketLimit
      ? `<button type="button" data-load-more-market="1" class="w-full rounded-2xl border border-[#0D6857] bg-white py-3 text-xs font-black text-[#0D6857] hover:bg-emerald-50 transition">⬇️ عرض المزيد (${list.length - state.marketLimit} عرض متبقٍ)</button>`
      : '';
    box.innerHTML = cardsHtml + moreBtn;
  }

  // ==================== CRAFTSMEN + PRICE OBSERVATORY ====================
  function getFilteredCrafts() {
    const q = D.normalizeAr(state.craftSearch);
    return state.crafts.filter((c) => {
      if (!matchesGeo(c)) return false;
      if (state.craftCat !== 'all' && c.spec !== state.craftCat) return false;
      if (q) {
        const hay = D.normalizeAr(`${c.name} ${c.area} ${c.gov} ${c.note} ${D.getCraftCatInfo(c.spec).label}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => distanceOf(a) - distanceOf(b) || (b.rating - a.rating));
  }

  function renderCraftPriceGuide() {
    const box = $('craftPriceGuideBox');
    const items = state.craftCat !== 'all' ? (C.CRAFT_PRICE_GUIDE[state.craftCat] || []) : [];
    if (!items.length) {
      box.classList.add('hidden');
      return;
    }
    const sp = D.getCraftCatInfo(state.craftCat);
    box.classList.remove('hidden');
    box.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-xs font-black text-amber-950">💰 دليل الأسعار التقريبي — ${sp.icon} ${D.escHtml(sp.label)}</h3>
        <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">مرصد استرشادي</span>
      </div>
      <div class="divide-y divide-amber-200/70">
        ${items.map((it) => `
          <div class="flex items-center justify-between gap-2 py-1.5 text-xs">
            <span class="font-bold text-slate-700">${D.escHtml(it.task)}</span>
            <span class="shrink-0 font-black text-[#0D6857]">${D.escHtml(it.range)}</span>
          </div>
        `).join('')}
      </div>
      <p class="text-[10px] font-bold text-amber-900/80">* أسعار تقريبية لليد العاملة فقط في تونس وتختلف حسب الولاية وقطع الغيار.</p>
    `;
  }

  function renderCrafts() {
    renderCraftPriceGuide();
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
          <p class="text-xs font-bold text-slate-500">⭐ ${Number(c.rating || 5).toFixed(1)} (${Number(c.reviews || 1)}) • 📍 ${D.escHtml(c.gov)} — ${D.escHtml(c.area)}</p>
          <p class="text-xs font-semibold text-slate-700">${D.escHtml(c.note)}</p>
          <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
            ${ph ? `<a href="tel:+216${ph}" class="flex items-center justify-center gap-1 rounded-xl bg-[#0D6857] py-2 text-xs font-extrabold text-white"><span>📞</span><span>اتصال</span></a>` : '<span></span>'}
            ${ph ? `<a href="https://wa.me/216${ph}?text=${encodeURIComponent('مرحباً، وجدت رقمك على خوذ بايك وأحتاج خدمة: ' + sp.label)}" target="_blank" rel="noopener" class="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 text-xs font-extrabold text-white"><span>💬</span><span>واتساب</span></a>` : '<span></span>'}
            <button type="button" data-focus-map="crafts:${D.escHtml(c.id)}" class="flex items-center justify-center gap-1 rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] py-2 text-xs font-extrabold text-[#132A23]"><span>🗺️</span><span>الموقع</span></button>
          </div>
        </article>
      `;
    }).join('');
  }

  // ==================== EMERGENCIES (CAREGUARD LIFECYCLE + OWNER REOPEN) ====================
  function getFilteredEmergencies() {
    return state.emergencies.filter((e) => {
      if (e.status !== 'open') return false;
      if (!matchesGeo(e)) return false;
      if (state.emergCat !== 'all' && e.type !== state.emergCat) return false;
      if (!isEmergencyVisibleToUser(e)) return false;
      return true;
    }).sort((a, b) => distanceOf(a) - distanceOf(b) || (b.createdAt - a.createdAt));
  }

  function renderEmergencies() {
    const myUid = state.account && state.account.userId;
    const allOpen = state.emergencies.filter((e) => e.status === 'open').length;
    const list = getFilteredEmergencies();
    $('emergBannerTitle').textContent = `⚡ صيانة عاجلة — ${state.gov}`;
    $('openEmergencyCounter').textContent = String(allOpen);
    $('navEmergBadge').textContent = String(allOpen);

    // 1) بلاغاتي الطارئة النشطة (تأكيد التنفيذ + زر إعادة فتح لحرفي آخر عند عدم الاتفاق على السعر)
    const myOwned = myUid ? state.emergencies.filter((e) => e.userId === myUid && (e.status === 'open' || e.status === 'claimed')) : [];
    const ownedBox = $('myOwnedEmergBox');
    if (myOwned.length) {
      ownedBox.classList.remove('hidden');
      $('myOwnedEmergList').innerHTML = myOwned.map((e) => {
        const isClaimed = e.status === 'claimed';
        const stTxt = isClaimed
          ? (e.craftsmanStatus === 'completed' ? '✅ الحرفي حدّد أنه تم التنفيذ — يرجى التأكيد' : '🛠️ تم استلام البلاغ — إن لم تتفقا على السعر يمكنك إعادة فتحه')
          : '⏳ مفتوح في انتظار استلام حرفي';
        return `
          <div class="rounded-xl border border-amber-300 bg-white p-3 space-y-2">
            <div class="flex items-center justify-between gap-2 text-xs font-black text-amber-950">
              <span>⚡ ${D.escHtml(e.type)} (${D.escHtml(e.gov)})</span>
              <span class="text-[10px] font-bold text-slate-500">${D.escHtml(D.formatAgo(e.createdAt))}</span>
            </div>
            <p class="text-[11px] font-extrabold text-emerald-800">${stTxt}</p>
            <p class="text-xs font-semibold text-slate-700">${D.escHtml(e.desc)}</p>
            <div class="grid ${isClaimed ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5">
              <button type="button" data-owner-confirm-emerg="${D.escHtml(e.id)}" class="rounded-xl bg-[#0D6857] hover:bg-[#094D40] py-2 text-xs font-black text-white">✅ تأكيد التنفيذ (إخفاء)</button>
              ${isClaimed ? `<button type="button" data-owner-reopen-emerg="${D.escHtml(e.id)}" class="rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 py-2 text-xs font-black text-amber-950">↩️ لم نتفق / إعادة فتح</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      ownedBox.classList.add('hidden');
    }

    // 2) البلاغات التي استلمها الحرفي
    const myClaimed = myUid ? state.emergencies.filter((e) => e.status === 'claimed' && e.claimedBy === myUid) : [];
    const claimedWrap = $('myClaimedBox');
    if (myClaimed.length) {
      claimedWrap.classList.remove('hidden');
      $('myClaimedList').innerHTML = myClaimed.map((e) => {
        const ph = D.cleanPhone(e.phone);
        const dist = getDistBadge(e);
        const lat = Number(e.lat), lng = Number(e.lng);
        const mapsUrl = Number.isFinite(lat) && Number.isFinite(lng)
          ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat + ',' + lng)}`
          : '';
        const isMarkedDone = e.craftsmanStatus === 'completed';
        return `
          <div class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-2">
            <div class="flex items-center justify-between gap-2 text-xs font-black text-emerald-950">
              <span>✅ استلمت: ${D.escHtml(e.type)} (${D.escHtml(e.gov)})</span>
              ${dist ? `<span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">📍 ${D.escHtml(dist)}</span>` : ''}
            </div>
            ${e.imageUrl ? `<img src="${D.escHtml(e.imageUrl)}" alt="صورة العطب" class="h-36 w-full rounded-xl object-cover border border-emerald-200" />` : ''}
            <p class="text-xs font-semibold text-slate-700">${D.escHtml(e.desc)}</p>
            <div class="grid grid-cols-2 gap-1.5">
              ${ph ? `<a href="tel:+216${ph}" class="rounded-xl bg-[#0D6857] py-2 text-center text-xs font-extrabold text-white">📞 اتصال (${D.escHtml(ph)})</a>` : ''}
              ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" rel="noopener" class="rounded-xl bg-blue-700 py-2 text-center text-xs font-extrabold text-white">🧭 التوجّه بـ Google Maps</a>` : ''}
            </div>
            ${isMarkedDone
              ? '<p class="rounded-xl bg-emerald-100 px-3 py-1.5 text-center text-[11px] font-black text-emerald-900">✓ تم إشعار صاحب البلاغ بالتنفيذ — بانتظار تأكيده للإغلاق</p>'
              : `<div class="grid grid-cols-2 gap-1.5 pt-1 border-t border-emerald-200">
                   <button type="button" data-craft-done-emerg="${D.escHtml(e.id)}" class="rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-black text-white">✅ تم التنفيذ</button>
                   <button type="button" data-craft-fail-emerg="${D.escHtml(e.id)}" class="rounded-xl bg-rose-100 hover:bg-rose-200 border border-rose-300 py-2 text-xs font-black text-rose-800">❌ لم يتم التنفيذ</button>
                 </div>`
            }
          </div>
        `;
      }).join('');
    } else {
      claimedWrap.classList.add('hidden');
    }

    // 3) البلاغات المفتوحة
    const box = $('emergencyList');
    if (!list.length) {
      box.innerHTML = `
        <div class="rounded-3xl border border-[#E4EAE8] bg-white p-6 text-center space-y-2 shadow-sm">
          <p class="text-sm font-extrabold text-slate-600">لا توجد طلبات صيانة عاجلة مفتوحة حالياً في نطاق ${D.escHtml(state.gov)}.</p>
          <button type="button" data-expand-all="1" class="rounded-xl bg-rose-50 px-3.5 py-1.5 text-xs font-extrabold text-rose-700">عرض طلبات كل تونس</button>
        </div>
      `;
      return;
    }

    box.innerHTML = list.map((e) => {
      const ph = D.cleanPhone(e.phone);
      const dist = getDistBadge(e);
      const isMine = myUid && e.userId === myUid;
      const canClaim = !isMine && canClaimEmergency(e.type);
      return `
        <article class="rounded-3xl border border-rose-200 bg-white p-4 shadow-sm space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-800">⚡ ${D.escHtml(e.type)}</span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">🕒 ${D.escHtml(D.formatAgo(e.createdAt))}</span>
            </div>
            <span class="text-[11px] font-extrabold text-rose-700">📍 ${D.escHtml(e.gov)}${dist ? ' • ' + D.escHtml(dist) : ''}</span>
          </div>
          ${e.imageUrl ? `<img src="${D.escHtml(e.imageUrl)}" alt="صورة العطب" loading="lazy" class="h-44 w-full rounded-2xl object-cover border border-rose-100" />` : ''}
          <p class="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">${D.escHtml(e.desc)}</p>
          <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-rose-100">
            ${ph ? `<a href="tel:+216${ph}" class="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-rose-600 py-2 px-2 text-xs font-extrabold text-white"><span>📞</span><span>اتصال</span></a>` : ''}
            <button type="button" data-focus-map="emergency:${D.escHtml(e.id)}" class="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 py-2 px-2 text-xs font-extrabold text-rose-800"><span>🗺️</span><span>الموقع</span></button>
            <button type="button" data-share-emerg="${D.escHtml(e.id)}" class="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 py-2 px-2 text-xs font-extrabold text-sky-900"><span>📤</span><span>مشاركة</span></button>
            ${canClaim ? `<button type="button" data-claim-emerg="${D.escHtml(e.id)}" class="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-[#0D6857] py-2 px-2 text-xs font-extrabold text-white"><span>✅</span><span>استلام</span></button>` : ''}
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



      const myOffers = state.offers.filter((o) => isOfferOwner(o) && o.status === 'active');
      const myCrafts = state.crafts.filter((c) => c.userId && c.userId === acc.userId);
      const items = [
        ...myOffers.map((o) => `
          <div class="rounded-xl bg-[#F8FAF9] border border-[#E4EAE8] px-3 py-2 text-[#132A23] space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate font-black">🧺 ${D.escHtml(o.title)} (${D.escHtml(o.price)} د.ت)</span>
              <span class="shrink-0 text-[10px] font-bold text-amber-800">${D.escHtml(D.formatRemaining(o.expiresAt))}</span>
            </div>
            <div class="flex flex-wrap items-center gap-1">
              <button type="button" data-live-loc-offer="${D.escHtml(o.id)}" class="rounded-lg ${state.liveOfferId === o.id ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-900'} px-2 py-1 text-[10px] font-extrabold">${state.liveOfferId === o.id ? '⏹️ إيقاف البث' : '📍 أنا هنا الآن'}</button>
              <button type="button" data-edit-price-offer="${D.escHtml(o.id)}" class="rounded-lg bg-blue-100 text-blue-900 px-2 py-1 text-[10px] font-extrabold">🏷️ تعديل السعر</button>
              <button type="button" data-mark-sold="${D.escHtml(o.id)}" class="rounded-lg bg-amber-100 text-amber-950 px-2 py-1 text-[10px] font-extrabold">✅ تم البيع</button>
            </div>
          </div>
        `),
        ...myCrafts.map((c) => `
          <div class="rounded-xl bg-[#F8FAF9] border border-[#E4EAE8] px-3 py-2 text-[#132A23] space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate font-black">🛠️ ${D.escHtml(c.name)} (${D.escHtml(c.gov)})</span>
              <span class="shrink-0 text-[10px] font-bold text-emerald-800">${D.escHtml(D.getCraftCatInfo(c.spec).label)}</span>
            </div>
            <div class="flex flex-wrap items-center gap-1">
              <button type="button" data-edit-craft="${D.escHtml(c.id)}" class="rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 px-2.5 py-1 text-[10px] font-extrabold transition">✏️ تعديل</button>
              <button type="button" data-delete-craft="${D.escHtml(c.id)}" class="rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 px-2.5 py-1 text-[10px] font-extrabold transition">🗑️ حذف</button>
            </div>
          </div>
        `)
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
    if (id === 'emergencyModal' && !requireActiveAccount('⚠️ لنشر طلب صيانة عاجلة، فعّل حسابك عبر Google ورقم الهاتف التونسي أولاً.')) return;

    $(id).classList.remove('hidden');
    if (id === 'emergencyModal') {
      if (P) P.clearConsentError('emPrivacyCheck');
      $('emGov').value = state.gov;
      $('emPhone').value = (state.account && state.account.phone) || '';
      state.pendingEmPhoto = null;
      $('emPhotoPreview').classList.add('hidden');
      $('emPhotoStatus').textContent = '📸 إضافة صورة للعطب (اختياري — كاميرا أو معرض، تُضغط تلقائياً)';
      const g = D.getGovObj(state.gov);
      if (state.userCoords) {
        state.pickerCoords = { ...state.userCoords };
        state.emLocationConfirmed = true;
      } else {
        state.pickerCoords = { lat: g.lat, lng: g.lng };
        state.emLocationConfirmed = false;
      }
      updateEmDistancePreview();
      M.ensurePicker(state.pickerCoords, (pt) => {
        state.pickerCoords = pt;
        state.emLocationConfirmed = true;
        updateEmDistancePreview();
      });
    } else if (id === 'offerModal') {
      if (P) P.clearConsentError('offerPrivacyCheck');
      $('ofGov').value = state.gov;
      $('ofPhone').value = (state.account && state.account.phone) || '';
      $('ofSeller').value = (state.account && state.account.name) || '';
      $('ofDurationHours').value = '24';
      state.pendingOfferPhoto = null;
      state.offerCoords = state.userCoords ? { ...state.userCoords } : null;
      $('ofPhotoPreview').classList.add('hidden');
      $('ofPhotoStatus').textContent = '📸 اضغط لاختيار صورة من المعرض أو الكاميرا (تُضغط تلقائياً < 55 KB)';
      $('ofGpsStatus').textContent = state.offerCoords ? `✓ موقع GPS جاهز (${state.offerCoords.lat.toFixed(3)}, ${state.offerCoords.lng.toFixed(3)})` : 'سيُستخدم موقع الولاية أو اضغط لتحديد موقعك الدقيق';
      toggleVehicleFields();
    } else if (id === 'craftModal') {
      if (P) P.clearConsentError('craftPrivacyCheck');
      const editing = state.editingCraftId ? state.crafts.find((x) => x.id === state.editingCraftId) : null;
      if (editing) {
        $('craftModalTitle').textContent = '✏️ تعديل بطاقة الحرفي';
        $('crSubmitBtn').textContent = 'حفظ التعديلات';
        $('crName').value = editing.name || '';
        $('crSpec').value = editing.spec || '';
        $('crGov').value = editing.gov || state.gov;
        $('crPhone').value = editing.phone || '';
        $('crArea').value = editing.area || '';
        $('crNote').value = editing.note || '';
      } else {
        state.editingCraftId = null;
        $('craftModalTitle').textContent = '🛠️ تسجيل حرفي أو ورشة';
        $('crSubmitBtn').textContent = 'حفظ وإظهار في دليل الحرفيين';
        $('crGov').value = state.gov;
        $('crPhone').value = (state.account && state.account.phone) || '';
        $('crName').value = (state.account && state.account.name) || '';
        $('crArea').value = '';
        $('crNote').value = '';
      }
    }
  }

  function closeModal(id) { $(id).classList.add('hidden'); if (id === 'craftModal') state.editingCraftId = null; }

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

  function buildShareText(item, kind = 'offer') {
    const base = 'https://compstory2-lang.github.io/kouthbayek/';
    if (kind === 'emergency') {
      const url = `${base}?tab=emergency`;
      const descBrief = String(item.desc || '').slice(0, 120);
      return {
        url,
        text: `⚡ طلب صيانة عاجلة: ${item.type}\n📍 ${item.gov}${descBrief ? ' — ' + descBrief : ''}\n📲 افتح أو نزّل تطبيق خوذ بايك: ${url}`
      };
    }
    const url = `${base}?offer=${encodeURIComponent(item.id)}`;
    return {
      url,
      text: `🧺 ${item.title}\n💰 السعر: ${item.price} د.ت — 📍 ${item.gov}\n📞 ${D.cleanPhone(item.phone)}\n📲 افتح أو نزّل تطبيق خوذ بايك: ${url}`
    };
  }

  async function doSignOut(openSwitchMsg) {
    stopLiveLocationBroadcast(true);
    await D.signOutGoogle();
    state.authUser = null;
    state.account = null;
    renderAll();
    showToast(openSwitchMsg || 'تم تسجيل الخروج بنجاح — يمكنك الآن الدخول بحساب Google آخر.');
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
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        state.userCoords = { lat: latitude, lng: longitude };
        const best = D.detectNearestGov(latitude, longitude);
        state.gov = best.ar;
        $('govSelect').value = state.gov;
        D.lsSet(D.STORE_KEYS.prefs, { gov: state.gov, radius: state.radius });
        renderAll();
        showToast(`✓ تم ربط موقعك بولاية ${state.gov} وترتيب الأقرب أولاً`);
        if (await D.syncFromSupabase(state, true)) renderAll();
      },
      () => showToast('⚠️ تعذر قراءة GPS؛ تم الإبقاء على ولاية ' + state.gov),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  });

  $('marketShowAllBtn').addEventListener('click', () => {
    state.marketCat = 'all';
    state.showMarketCatGrid = false;
    state.showFavsOnly = false;
    state.showFavsPanel = false;
    state.marketLimit = 15;
    renderAll();
  });

  $('marketToggleCatsBtn').addEventListener('click', () => {
    state.showMarketCatGrid = !state.showMarketCatGrid;
    state.showFavsPanel = false;
    renderMarket();
  });

  $('marketFavsBtn').addEventListener('click', () => {
    state.showFavsOnly = !state.showFavsOnly;
    state.showFavsPanel = state.showFavsOnly;
    state.showMarketCatGrid = false;
    state.marketCat = 'all';
    state.marketLimit = 15;
    renderMarket();
  });

  $('closeFavPanelBtn').addEventListener('click', () => {
    state.showFavsPanel = false;
    renderMarket();
  });

  $('marketFiltersToggleBtn').addEventListener('click', () => {
    state.showMarketFilters = !state.showMarketFilters;
    renderMarket();
  });

  $('marketSortSelect').addEventListener('change', (e) => { state.marketSort = e.target.value; renderMarket(); });
  $('filterMinPrice').addEventListener('input', (e) => { state.minPrice = e.target.value; renderMarket(); });
  $('filterMaxPrice').addEventListener('input', (e) => { state.maxPrice = e.target.value; renderMarket(); });
  $('filterVehBrand').addEventListener('input', (e) => { state.vehBrand = e.target.value; renderMarket(); });
  $('filterVehYear').addEventListener('input', (e) => { state.vehYear = e.target.value; renderMarket(); });
  $('filterVehKm').addEventListener('input', (e) => { state.vehKm = e.target.value; renderMarket(); });
  $('clearMarketFiltersBtn').addEventListener('click', () => {
    state.marketSort = 'nearest';
    state.minPrice = '';
    state.maxPrice = '';
    state.vehBrand = '';
    state.vehYear = '';
    state.vehKm = '';
    $('marketSortSelect').value = 'nearest';
    $('filterMinPrice').value = '';
    $('filterMaxPrice').value = '';
    $('filterVehBrand').value = '';
    $('filterVehYear').value = '';
    $('filterVehKm').value = '';
    renderMarket();
  });

  $('marketClearCatBtn').addEventListener('click', () => {
    state.marketCat = 'all';
    renderAll();
  });

  function onMarketSearchChange(e) {
    state.marketSearch = e.target.value || '';
    state.marketLimit = 15;
    renderMarket();
  }
  ['input', 'search', 'keyup'].forEach((ev) => $('marketSearch').addEventListener(ev, onMarketSearchChange));

  function onCraftSearchChange(e) {
    state.craftSearch = e.target.value || '';
    renderCrafts();
  }
  ['input', 'search', 'keyup'].forEach((ev) => $('craftSearch').addEventListener(ev, onCraftSearchChange));

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

  $('emPhotoInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    $('emPhotoStatus').textContent = '⏳ جاري ضغط صورة العطب...';
    try {
      const res = await D.compressImageFile(file, 680, 55000);
      state.pendingEmPhoto = res;
      $('emPhotoPreview').src = res.dataUrl;
      $('emPhotoPreview').classList.remove('hidden');
      $('emPhotoStatus').textContent = `✓ الصورة جاهزة (${res.sizeKb} KB)`;
    } catch (_) {
      state.pendingEmPhoto = null;
      $('emPhotoStatus').textContent = '⚠️ تعذر قراءة الصورة، جرّب صورة أخرى.';
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

  // Share Modal Buttons (Facebook, WhatsApp, Copy, Native)
  $('shareFbBtn').addEventListener('click', () => {
    if (!state.shareTarget) return;
    const { url, text } = buildShareText(state.shareTarget, state.shareKind);
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(fbUrl, '_blank', 'noopener');
    closeModal('shareModal');
  });

  $('shareMsgBtn').addEventListener('click', async () => {
    if (!state.shareTarget) return;
    const { url, text } = buildShareText(state.shareTarget, state.shareKind);
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {}

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
      try {
        await window.Capacitor.Plugins.Share.share({ title: state.shareTarget.title || 'خوذ بايك', text, url });
        closeModal('shareModal');
        return;
      } catch (_) {}
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: state.shareTarget.title || 'خوذ بايك', text, url });
        closeModal('shareModal');
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') {
          showToast('📋 النص منسوخ — يمكنك لصقه في ماسنجر في أي وقت.');
          return;
        }
      }
    }

    showToast('📋 تم نسخ الإعلان والرابط — افتح ماسنجر والصقه مباشرة في المحادثة.');
    closeModal('shareModal');
  });

  $('shareWaBtn').addEventListener('click', () => {
    if (!state.shareTarget) return;
    const { text } = buildShareText(state.shareTarget, state.shareKind);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    closeModal('shareModal');
  });

  $('shareCopyBtn').addEventListener('click', async () => {
    if (!state.shareTarget) return;
    const { text } = buildShareText(state.shareTarget, state.shareKind);
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 تم نسخ نص الإعلان والرابط — الصقه في فيسبوك أو ماسنجر!');
    } catch (_) {
      showToast('⚠️ تعذر النسخ التلقائي.');
    }
    closeModal('shareModal');
  });

  $('shareNativeBtn').addEventListener('click', async () => {
    if (!state.shareTarget) return;
    const { url, text } = buildShareText(state.shareTarget, state.shareKind);
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
      try {
        await window.Capacitor.Plugins.Share.share({ title: state.shareTarget.title, text, url });
        closeModal('shareModal');
        return;
      } catch (_) {}
    }
    if (navigator.share) {
      navigator.share({ title: state.shareTarget.title, text, url }).catch(() => {});
      closeModal('shareModal');
      return;
    }
    showToast('💡 استخدم زر فيسبوك أو واتساب أو نسخ النص.');
  });

  document.addEventListener('click', async (e) => {
    const navBtn = e.target.closest('[data-tab]');
    if (navBtn) return switchTab(navBtn.dataset.tab);

    const favToggle = e.target.closest('[data-toggle-fav-cat]');
    if (favToggle) {
      const cid = favToggle.dataset.toggleFavCat;
      if (state.favCats.includes(cid)) state.favCats = state.favCats.filter((x) => x !== cid);
      else state.favCats.push(cid);
      D.lsSet(D.STORE_KEYS.favCats, state.favCats);
      renderCategoryBars();
      renderMarket();
      return;
    }

    const mCat = e.target.closest('[data-market-cat]');
    if (mCat) {
      state.marketCat = mCat.dataset.marketCat;
      state.showMarketCatGrid = false;
      state.showFavsOnly = false;
      state.showFavsPanel = false;
      state.marketLimit = 15;
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
      if (await D.syncFromSupabase(state, true)) renderAll();
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

    const liveBtn = e.target.closest('[data-live-loc-offer]');
    if (liveBtn) {
      const id = liveBtn.dataset.liveLocOffer;
      if (state.liveOfferId === id) stopLiveLocationBroadcast();
      else startLiveLocationBroadcast(id);
      return;
    }

    const editPriceBtn = e.target.closest('[data-edit-price-offer]');
    if (editPriceBtn) {
      const o = state.offers.find((x) => x.id === editPriceBtn.dataset.editPriceOffer);
      if (!o) return;
      state.quickPriceTarget = o;
      $('quickPriceTitle').textContent = o.title;
      $('quickCurrentPrice').textContent = `السعر الحالي: ${o.price} د.ت`;
      $('quickNewPrice').value = String(o.price);
      openModal('quickPriceModal');
      return;
    }

    const editCraftBtn = e.target.closest('[data-edit-craft]');
    if (editCraftBtn) {
      if (!requireActiveAccount()) return;
      state.editingCraftId = editCraftBtn.dataset.editCraft;
      openModal('craftModal');
      return;
    }

    const delCraftBtn = e.target.closest('[data-delete-craft]');
    if (delCraftBtn) {
      if (!requireActiveAccount()) return;
      const cid = delCraftBtn.dataset.deleteCraft;
      if (!confirm('هل تريد حذف بطاقة الحرفي هذه نهائياً من الدليل؟')) return;
      const res = await D.deleteCraft(cid, state.account && state.account.userId);
      if (!res.ok) return showToast('⚠️ تعذر حذف البطاقة: ' + (res.error || 'حاول مجدداً'));
      state.crafts = state.crafts.filter((c) => c.id !== cid);
      D.lsSet(D.STORE_KEYS.crafts, state.crafts);
      renderAll();
      showToast('🗑️ تم حذف بطاقة الحرفي بنجاح.');
      return;
    }

    const soldBtn = e.target.closest('[data-mark-sold]');
    if (soldBtn) {
      const id = soldBtn.dataset.markSold;
      if (state.liveOfferId === id) stopLiveLocationBroadcast(true);
      const res = await D.markOfferSold(id, state.account && state.account.userId);
      if (!res.ok) return showToast('⚠️ تعذر تحديث حالة الإعلان: ' + (res.error || 'حاول مجدداً'));
      state.offers = state.offers.map((o) => o.id === id ? { ...o, status: 'sold', liveLocation: false } : o);
      D.lsSet(D.STORE_KEYS.offers, state.offers);
      renderAll();
      showToast('✅ تم تحديد الإعلان كمباع وإخفاؤه من السوق.');
      return;
    }

    const shareEmBtn = e.target.closest('[data-share-emerg]');
    if (shareEmBtn) {
      const em = state.emergencies.find((x) => x.id === shareEmBtn.dataset.shareEmerg);
      if (!em) return;
      state.shareTarget = em;
      state.shareKind = 'emergency';
      $('shareOfferTitle').textContent = `⚡ ${em.type} — ${em.gov}`;
      openModal('shareModal');
      return;
    }

    const shareBtn = e.target.closest('[data-share-offer]');
    if (shareBtn) {
      const o = state.offers.find((x) => x.id === shareBtn.dataset.shareOffer);
      if (!o) return;
      state.shareTarget = o;
      state.shareKind = 'offer';
      $('shareOfferTitle').textContent = `${o.title} — ${o.price} د.ت`;
      openModal('shareModal');
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
      if (!requireActiveAccount('⚠️ لاستلام طلب صيانة عاجلة، فعّل حسابك عبر Google ورقم الهاتف أولاً.')) return;
      const id = claimBtn.dataset.claimEmerg;
      const targetEm = state.emergencies.find((x) => x.id === id);
      if (!targetEm || !canClaimEmergency(targetEm.type)) {
        return showToast('⚠️ استلام هذا الطلب متاح فقط للحرفيين المسجّلين في الاختصاص المناسب.');
      }
      const res = await D.claimEmergencyAtomic(id, state.account && state.account.userId);
      if (res.alreadyClaimed) {
        state.emergencies = state.emergencies.filter((x) => x.id !== id);
        renderAll();
        showToast('⚠️ تم استلام هذا البلاغ للتو من طرف شخص آخر.');
        return;
      }
      if (!res.ok) {
        showToast('⚠️ تعذر استلام البلاغ: ' + (res.error || 'تحقق من اتصالك'));
        return;
      }
      state.emergencies = state.emergencies.map((em) => em.id === id ? { ...em, status: 'claimed', claimedBy: state.account.userId, craftsmanStatus: 'in_progress' } : em);
      D.lsSet(D.STORE_KEYS.emergencies, state.emergencies);
      renderAll();
      showToast('✅ تم استلام البلاغ — يمكنك التوجّه الآن عبر Google Maps.');
      return;
    }

    const doneBtn = e.target.closest('[data-craft-done-emerg]');
    if (doneBtn) {
      const id = doneBtn.dataset.craftDoneEmerg;
      const res = await D.markEmergencyCraftsmanStatus(id, state.account && state.account.userId, 'completed');
      if (!res.ok) return showToast('⚠️ تعذر التحديث: ' + (res.error || 'حاول مجدداً'));
      state.emergencies = state.emergencies.map((em) => em.id === id ? { ...em, craftsmanStatus: 'completed' } : em);
      D.lsSet(D.STORE_KEYS.emergencies, state.emergencies);
      renderEmergencies();
      showToast('✅ تم تسجيل التنفيذ — بانتظار تأكيد صاحب البلاغ.');
      return;
    }

    const failBtn = e.target.closest('[data-craft-fail-emerg]');
    if (failBtn) {
      const id = failBtn.dataset.craftFailEmerg;
      const res = await D.markEmergencyCraftsmanStatus(id, state.account && state.account.userId, 'not_completed');
      if (!res.ok) return showToast('⚠️ تعذر إعادة فتح البلاغ: ' + (res.error || 'حاول مجدداً'));
      state.emergencies = state.emergencies.map((em) => em.id === id ? { ...em, status: 'open', claimedBy: '', craftsmanStatus: 'pending' } : em);
      D.lsSet(D.STORE_KEYS.emergencies, state.emergencies);
      renderAll();
      showToast('↩️ تم إرجاع البلاغ مفتوحاً ليتولّاه حرفي آخر.');
      return;
    }

    const ownerConfBtn = e.target.closest('[data-owner-confirm-emerg]');
    if (ownerConfBtn) {
      const id = ownerConfBtn.dataset.ownerConfirmEmerg;
      const res = await D.confirmEmergencyOwner(id, state.account && state.account.userId);
      if (!res.ok) return showToast('⚠️ تعذر تأكيد التنفيذ: ' + (res.error || 'حاول مجدداً'));
      state.emergencies = state.emergencies.filter((em) => em.id !== id);
      D.lsSet(D.STORE_KEYS.emergencies, state.emergencies);
      renderAll();
      showToast('✅ تم تأكيد التنفيذ وإخفاء البلاغ فوراً. شكراً لك!');
      return;
    }

    const ownerReopenBtn = e.target.closest('[data-owner-reopen-emerg]');
    if (ownerReopenBtn) {
      const id = ownerReopenBtn.dataset.ownerReopenEmerg;
      const res = await D.reopenEmergencyOwner(id, state.account && state.account.userId);
      if (!res.ok) return showToast('⚠️ تعذر إعادة فتح البلاغ: ' + (res.error || 'حاول مجدداً'));
      state.emergencies = state.emergencies.map((em) => em.id === id ? { ...em, status: 'open', claimedBy: '', craftsmanStatus: 'pending' } : em);
      D.lsSet(D.STORE_KEYS.emergencies, state.emergencies);
      renderAll();
      showToast('↩️ تم إلغاء الاستلام وإعادة فتح البلاغ لحرفي آخر.');
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

    let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  $('openInstallModalBtn').addEventListener('click', () => openModal('installAppModal'));

  $('pwaInstallNowBtn').addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      try {
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          showToast('🎉 جاري تثبيت تطبيق خوذ بايك على شاشتك الرئيسية!');
          closeModal('installAppModal');
        }
      } catch (_) {}
      deferredInstallPrompt = null;
      return;
    }
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      showToast('🍏 في Safari: اضغط زر المشاركة ⬆️ بالأسفل ثم «إضافة إلى الشاشة الرئيسية».');
    } else {
      showToast('🌐 افتح الرابط في Chrome واضغط القائمة (⋮) ثم «تثبيت التطبيق / الإضافة إلى الشاشة الرئيسية».');
    }
  });

  $('copyAppLinkBtn').addEventListener('click', async () => {
    const appUrl = 'https://compstory2-lang.github.io/kouthbayek/';
    try {
      await navigator.clipboard.writeText(appUrl);
      showToast('📋 تم نسخ رابط التطبيق — افتحه في Chrome لتثبيته فوراً!');
    } catch (_) {
      showToast('🔗 الرابط: ' + appUrl);
    }
  });

  $('openEmergencyModalBtn').addEventListener('click', () => openModal('emergencyModal'));
  $('openOfferModalBtn').addEventListener('click', () => openModal('offerModal'));
  $('openCraftModalBtn').addEventListener('click', () => { state.editingCraftId = null; openModal('craftModal'); });
  $('dashAddOfferBtn').addEventListener('click', () => openModal('offerModal'));
  $('dashAddCraftBtn').addEventListener('click', () => { state.editingCraftId = null; openModal('craftModal'); });
  $('openTermsBtn').addEventListener('click', () => openModal('termsModal'));
  $('openDeleteAccModalBtn').addEventListener('click', () => openModal('deleteAccountModal'));

  $('emGov').addEventListener('change', (e) => {
    const g = D.getGovObj(e.target.value);
    state.pickerCoords = { lat: g.lat, lng: g.lng };
    state.emLocationConfirmed = false;
    M.movePicker(g.lat, g.lng, 12);
    updateEmDistancePreview();
  });

  $('emUseGpsBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return showToast('⚠️ GPS غير متاح، اضغط مباشرة على الخريطة لتأكيد موقعك.');
    showToast('📡 جاري التقاط موقعك عبر GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        state.pickerCoords = { lat: latitude, lng: longitude };
        state.emLocationConfirmed = true;
        M.movePicker(latitude, longitude, 15);
        updateEmDistancePreview();
        showToast('📍 تم تأكيد موقع البلاغ عبر GPS');
      },
      () => showToast('⚠️ تعذر قراءة GPS، اضغط مباشرة على موقعك في الخريطة')
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
    if (P && !P.validateConsent('accPrivacyCheck')) return;
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
    if (!saved.ok) {
      return showToast('⚠️ تعذر حفظ الحساب سحابياً: ' + (saved.error || 'حاول مجدداً'));
    }
    acc.createdAt = saved.createdAt || acc.createdAt;
    acc.trialEndsAt = saved.trialEndsAt || acc.trialEndsAt;
    state.account = acc;
    D.lsSet(D.STORE_KEYS.account, acc);
    renderAccount();
    showToast('🎉 تم تفعيل حسابك بنجاح — أهلاً بك في خوذ بايك!');
  });

  $('logoutBtn').addEventListener('click', () => doSignOut());
  $('switchAccountBtn').addEventListener('click', () => doSignOut('🔄 تم تسجيل الخروج — اضغط «المتابعة باستخدام Google» لاختيار حساب آخر.'));
  $('cancelGoogleStepBtn').addEventListener('click', () => doSignOut());

  $('confirmDeleteAccBtn').addEventListener('click', async () => {
    stopLiveLocationBroadcast(true);
    const uid = (state.account && state.account.userId) || (state.authUser && state.authUser.id) || '';
    await D.deleteUserAccountAndData(uid);
    state.authUser = null;
    state.account = null;
    closeModal('deleteAccountModal');
    renderAll();
    showToast('✓ تم حذف حسابك وبياناتك نهائياً.');
  });

  $('quickPriceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.quickPriceTarget || !isAccountActive()) return;
    const newPrice = Number($('quickNewPrice').value);
    if (!Number.isFinite(newPrice) || newPrice <= 0) return showToast('⚠️ أدخل سعراً صحيحاً أكبر من 0.');
    const o = state.quickPriceTarget;
    const res = await D.updateOfferPrice(o.id, state.account.userId, newPrice, Number(o.price));
    if (!res.ok) return showToast('⚠️ تعذر تعديل السعر: ' + (res.error || 'حاول مجدداً'));
    state.offers = state.offers.map((x) => x.id === o.id ? { ...x, price: newPrice, prevPrice: res.prevPrice } : x);
    D.lsSet(D.STORE_KEYS.offers, state.offers);
    closeModal('quickPriceModal');
    renderAll();
    showToast(res.prevPrice ? '🔥 تم تخفيض السعر وإضافة شارة «تخفيض الآن»!' : '✓ تم تحديث السعر بنجاح.');
  });

  $('emergencyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireActiveAccount('⚠️ لنشر طلب صيانة عاجلة، فعّل حسابك أولاً.')) return;
    if (P && !P.validateConsent('emPrivacyCheck')) return;
    if (!state.emLocationConfirmed) {
      return showToast('⚠️ تحديد الموقع إجباري: اضغط على زر GPS أو حدّد مكانك على الخريطة.');
    }
    const ph = D.cleanPhone($('emPhone').value || state.account.phone);
    if (!D.isValidTnPhone(ph)) {
      return showToast('⚠️ يرجى إدخال رقم هاتف تونسي صحيح (8 أرقام).');
    }
    const desc = $('emDesc').value.trim();
    const mod = D.checkContentModeration(`${$('emType').value} ${desc}`);
    if (!mod.ok) return showToast(mod.reason);

    const submitBtn = $('emSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري نشر طلب الصيانة العاجلة...';
    try {
      let imageUrl = '';
      if (state.pendingEmPhoto) {
        const up = await D.uploadOfferImage(state.pendingEmPhoto.blob, state.account.userId, 'em');
        if (!up.ok) showToast('⚠️ تعذر رفع الصورة: ' + up.error);
        else imageUrl = up.url;
      }
      const newEm = {
        id: 'em-' + Date.now(),
        type: $('emType').value,
        gov: $('emGov').value,
        desc,
        phone: ph,
        imageUrl,
        lat: state.pickerCoords.lat,
        lng: state.pickerCoords.lng,
        createdAt: Date.now(),
        status: 'open',
        userId: state.account.userId,
        claimedBy: '',
        craftsmanStatus: 'pending'
      };
      const res = await D.pushEmergency(newEm);
      if (!res.ok) {
        return showToast('⚠️ تعذر نشر البلاغ: ' + (res.error || 'تحقق من اتصالك بالإنترنت'));
      }
      newEm.id = res.id || newEm.id;
      state.emergencies.unshift(newEm);
      D.lsSet(D.STORE_KEYS.emergencies, state.emergencies);
      e.target.reset();
      state.pendingEmPhoto = null;
      closeModal('emergencyModal');
      renderAll();
      showToast('⚡ تم نشر طلب الصيانة العاجلة بنجاح! سيظهر لأقرب الحرفيين فوراً.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'نشر طلب الصيانة العاجلة فوراً';
    }
  });

  $('offerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireActiveAccount()) return;
    if (P && !P.validateConsent('offerPrivacyCheck')) return;

    const ph = D.cleanPhone($('ofPhone').value || state.account.phone);
    if (!D.isValidTnPhone(ph)) {
      return showToast('⚠️ يرجى إدخال رقم هاتف تونسي صحيح (8 أرقام).');
    }
    const title = $('ofTitle').value.trim();
    const rawDesc = $('ofDesc').value.trim();
    const price = Number($('ofPrice').value);
    if (!Number.isFinite(price) || price <= 0) {
      return showToast('⚠️ يرجى إدخال سعر صحيح أكبر من 0.');
    }
    const mod = D.checkContentModeration(`${title} ${rawDesc} ${$('ofSeller').value}`);
    if (!mod.ok) return showToast(mod.reason);

    const durHrs = Math.min(24, Math.max(1, Number($('ofDurationHours').value) || 24));
    const submitBtn = $('ofSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري رفع الصورة ونشر العرض...';
    try {
      const g = D.getGovObj($('ofGov').value);
      const lat = state.offerCoords ? state.offerCoords.lat : g.lat;
      const lng = state.offerCoords ? state.offerCoords.lng : g.lng;

      let imageUrl = '';
      if (state.pendingOfferPhoto) {
        const up = await D.uploadOfferImage(state.pendingOfferPhoto.blob, state.account.userId, 'of');
        if (!up.ok) return showToast('⚠️ تعذر رفع الصورة إلى الخادم: ' + up.error);
        imageUrl = up.url;
      }

      let desc = rawDesc;
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
        title,
        cat: $('ofCat').value,
        price,
        prevPrice: null,
        gov: $('ofGov').value,
        phone: ph,
        seller: $('ofSeller').value.trim(),
        desc,
        imageUrl,
        status: 'active',
        userId: state.account.userId || '',
        lat, lng,
        liveLocation: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + durHrs * C.HR
      };
      const res = await D.pushOffer(newOf);
      if (!res.ok) return showToast('⚠️ تعذر نشر العرض: ' + (res.error || 'حاول مجدداً'));
      newOf.id = res.id || newOf.id;
      state.offers.unshift(newOf);
      D.lsSet(D.STORE_KEYS.offers, state.offers);
      e.target.reset();
      state.pendingOfferPhoto = null;
      closeModal('offerModal');
      renderAll();
      showToast(`✓ تم نشر عرضك (يُحذف تلقائياً بعد ${durHrs} ساعة)`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'نشر العرض الآن';
    }
  });

  $('craftForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireActiveAccount()) return;
    if (P && !P.validateConsent('craftPrivacyCheck')) return;
    const ph = D.cleanPhone($('crPhone').value || state.account.phone);
    if (!D.isValidTnPhone(ph)) {
      return showToast('⚠️ يرجى إدخال رقم هاتف تونسي صحيح (8 أرقام).');
    }
    const name = $('crName').value.trim();
    const area = $('crArea').value.trim();
    const note = $('crNote').value.trim();
    const mod = D.checkContentModeration(`${name} ${area} ${note}`);
    if (!mod.ok) return showToast(mod.reason);

    const submitBtn = $('crSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري الحفظ...';
    try {
      const g = D.getGovObj($('crGov').value);
      if (state.editingCraftId) {
        const existing = state.crafts.find((x) => x.id === state.editingCraftId);
        const updatedCr = {
          ...(existing || {}),
          id: state.editingCraftId,
          name,
          spec: $('crSpec').value,
          gov: $('crGov').value,
          area,
          phone: ph,
          note,
          lat: (existing && existing.gov === $('crGov').value && Number.isFinite(Number(existing.lat))) ? existing.lat : g.lat,
          lng: (existing && existing.gov === $('crGov').value && Number.isFinite(Number(existing.lng))) ? existing.lng : g.lng
        };
        const res = await D.updateCraft(updatedCr, state.account.userId);
        if (!res.ok) return showToast('⚠️ تعذر تعديل البطاقة: ' + (res.error || 'حاول مجدداً'));
        state.crafts = state.crafts.map((c) => c.id === updatedCr.id ? updatedCr : c);
        D.lsSet(D.STORE_KEYS.crafts, state.crafts);
        e.target.reset();
        closeModal('craftModal');
        renderAll();
        showToast('✓ تم تحديث بطاقة الحرفي بنجاح!');
      } else {
        const newCr = {
          id: 'cr-' + Date.now(),
          name,
          spec: $('crSpec').value,
          gov: $('crGov').value,
          area,
          phone: ph,
          note,
          userId: state.account.userId || '',
          rating: 5.0,
          reviews: 1,
          lat: state.userCoords ? state.userCoords.lat : g.lat,
          lng: state.userCoords ? state.userCoords.lng : g.lng
        };
        const res = await D.pushCraft(newCr);
        if (!res.ok) return showToast('⚠️ تعذر تسجيل الحرفي: ' + (res.error || 'حاول مجدداً'));
        newCr.id = res.id || newCr.id;
        state.crafts.unshift(newCr);
        D.lsSet(D.STORE_KEYS.crafts, state.crafts);
        e.target.reset();
        closeModal('craftModal');
        renderAll();
        showToast('✓ تمت إضافة بطاقتك في دليل الحرفيين!');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = state.editingCraftId ? 'حفظ التعديلات' : 'حفظ وإظهار في دليل الحرفيين';
    }
  });

  $('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.reportTarget) return;
    const res = await D.submitReport(state.reportTarget.type, state.reportTarget.id, $('reportReason').value, state.account && state.account.userId);
    if (!res.ok) return showToast('⚠️ تعذر إرسال البلاغ: ' + (res.error || 'حاول مجدداً'));
    closeModal('reportModal');
    showToast('🚩 شكراً لك، تم إرسال البلاغ لمراجعة الإعلان.');
  });

  setInterval(() => {
    if (state.activeTab === 'market') renderMarket();
  }, 60000);

  async function init() {
    populateSelects();
    if (P) {
      P.renderConsentField('accPrivacySlot', 'accPrivacyCheck', 'account');
      P.renderConsentField('offerPrivacySlot', 'offerPrivacyCheck', 'offer');
      P.renderConsentField('craftPrivacySlot', 'craftPrivacyCheck', 'craft');
      P.renderConsentField('emPrivacySlot', 'emPrivacyCheck', 'emergency');
    }
    renderAll();
    if (D.isSupabaseConnected()) {
      $('syncBadge').textContent = '🟢 متصل بـ Supabase';
      const [authUser, synced] = await Promise.all([D.getAuthUser(), D.syncFromSupabase(state, true)]);
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
      D.subscribeEmergencies(async () => {
        if (await D.syncFromSupabase(state, true)) renderAll();
      });
      if (synced || authUser) renderAll();
    }
    handleSharedOfferLink();
  }

  async function handleSharedOfferLink() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'emergency') {
        switchTab('emergency');
        return;
      }
      const oid = params.get('offer');
      if (!oid) return;
      state.sharedOfferId = oid;
      let target = state.offers.find((o) => String(o.id) === String(oid));
      if (!target && state.radius !== 'all') {
        state.radius = 'all';
        $('radiusSelect').value = 'all';
        if (D.isSupabaseConnected()) await D.syncFromSupabase(state, true);
        target = state.offers.find((o) => String(o.id) === String(oid));
      }
      if (!target) {
        showToast('ℹ️ هذا العرض منتهي الصلاحية أو تم بيعه.');
        return;
      }
      state.marketCat = 'all';
      state.showFavsOnly = false;
      state.marketSearch = '';
      state.marketLimit = Math.max(state.marketLimit, state.offers.length);
      switchTab('market');
      renderAll();
      setTimeout(() => {
        const el = document.getElementById('offer-card-' + target.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showToast('🧺 تم فتح العرض المشارَك مباشرة!');
        }
      }, 150);
    } catch (_) {}
  }

  init();
})();
