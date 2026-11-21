(function () {
  const cfg = window.APP_CONFIG || {
    appName: 'خوذ بايك',
    storageBucket: 'khoudh-bayek-media',
    trialDays: 60,
    offerHours: 24,
    emergencyHours: 6,
    supabase: { url: '', anonKey: '' },
    defaultLocation: { governorate: 'قابس', lat: 33.8815, lng: 10.0982 },
    governorates: [
      { name: 'تونس', lat: 36.8065, lng: 10.1815 },
      { name: 'أريانة', lat: 36.8665, lng: 10.1647 },
      { name: 'بن عروس', lat: 36.7531, lng: 10.2189 },
      { name: 'منوبة', lat: 36.8101, lng: 10.0956 },
      { name: 'نابل', lat: 36.4561, lng: 10.7376 },
      { name: 'زغوان', lat: 36.4029, lng: 10.1429 },
      { name: 'بنزرت', lat: 37.2744, lng: 9.8739 },
      { name: 'باجة', lat: 36.7256, lng: 9.1817 },
      { name: 'جندوبة', lat: 36.5011, lng: 8.7802 },
      { name: 'الكاف', lat: 36.1742, lng: 8.7049 },
      { name: 'سليانة', lat: 36.0849, lng: 9.3708 },
      { name: 'سوسة', lat: 35.8256, lng: 10.6369 },
      { name: 'المنستير', lat: 35.7643, lng: 10.8113 },
      { name: 'المهدية', lat: 35.5047, lng: 11.0622 },
      { name: 'صفاقس', lat: 34.7406, lng: 10.7603 },
      { name: 'القيروان', lat: 35.6781, lng: 10.0963 },
      { name: 'القصرين', lat: 35.1676, lng: 8.8365 },
      { name: 'سيدي بوزيد', lat: 35.0382, lng: 9.4849 },
      { name: 'قابس', lat: 33.8815, lng: 10.0982 },
      { name: 'مدنين', lat: 33.3549, lng: 10.5055 },
      { name: 'تطاوين', lat: 32.9297, lng: 10.4518 },
      { name: 'قفصة', lat: 34.4250, lng: 8.7842 },
      { name: 'توزر', lat: 33.9197, lng: 8.1335 },
      { name: 'قبلي', lat: 33.7044, lng: 8.9690 }
    ]
  };

  const fallbackData = window.APP_DATA || {
    marketCategories: [
      { id: 'livestock', name: 'أغنام وأبقار ومواشي', icon: '🐑' },
      { id: 'pets', name: 'حيوانات أليفة وطيور', icon: '🐾' },
      { id: 'food', name: 'مواد غذائية ومنتجات الحومة', icon: '🧺' },
      { id: 'agriculture', name: 'منتجات فلاحية وزيت وتمر', icon: '🫒' },
      { id: 'tools', name: 'معدات وأدوات مستعملة', icon: '🧰' },
      { id: 'daily', name: 'عروض اليوم السريعة', icon: '⚡' }
    ],
    servicesCategories: [
      { id: 'ac', name: 'مكيفات وتبريد', icon: '❄️' },
      { id: 'fridge', name: 'ثلاجات وغسالات', icon: '🧊' },
      { id: 'plumbing', name: 'سباكة وصحية', icon: '🚿' },
      { id: 'electrical', name: 'كهرباء منزلية', icon: '💡' },
      { id: 'auto', name: 'ميكانيك وتشخيص سيارات', icon: '🚗' },
      { id: 'masonry', name: 'بناء وترميم ودهان', icon: '🧱' }
    ],
    sampleOffers: [
      {
        id: 'off-1',
        title: 'خروف مرعش سليم — عرض اليوم',
        category: 'أغنام وأبقار ومواشي',
        price: '680 د.ت',
        governorate: 'قابس',
        lat: 33.8815,
        lng: 10.0982,
        phone: '22112233',
        hoursLeft: 18
      },
      {
        id: 'off-2',
        title: 'زيت زيتون بكر ممتاز 5 لتر',
        category: 'منتجات فلاحية وزيت وتمر',
        price: '115 د.ت',
        governorate: 'صفاقس',
        lat: 34.7406,
        lng: 10.7603,
        phone: '98445566',
        hoursLeft: 21
      }
    ],
    sampleProviders: [
      {
        id: 'prv-1',
        name: 'ورشة النجاح للتبريد والمكيفات',
        specialty: 'مكيفات وتبريد',
        governorate: 'قابس',
        lat: 33.8850,
        lng: 10.0950,
        phone: '55119988',
        rating: '4.9'
      },
      {
        id: 'prv-2',
        name: 'الأمين للسباكة والكهرباء',
        specialty: 'سباكة وصحية',
        governorate: 'تونس',
        lat: 36.8065,
        lng: 10.1815,
        phone: '20334455',
        rating: '4.8'
      }
    ]
  };

  const state = {
    tab: 'market',
    governorate: (cfg.defaultLocation && cfg.defaultLocation.governorate) || 'قابس',
    lat: (cfg.defaultLocation && cfg.defaultLocation.lat) || 33.8815,
    lng: (cfg.defaultLocation && cfg.defaultLocation.lng) || 10.0982,
    radius: 'gov',
    selectedMarketCat: '',
    selectedServiceCat: '',
    marketQuery: '',
    servicesQuery: '',
    session: null,
    map: null,
    markersLayer: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    if ([lat1, lon1, lat2, lon2].some((v) => typeof v !== 'number' || Number.isNaN(v))) return 999;
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function matchesLocation(item) {
    if (state.radius === 'all') return true;
    if (state.radius === 'gov') {
      return !item.governorate || item.governorate === state.governorate;
    }
    const maxKm = Number(state.radius.replace('km', '')) || 25;
    const dist = haversineKm(state.lat, state.lng, Number(item.lat), Number(item.lng));
    return dist <= maxKm || item.governorate === state.governorate;
  }

  function populateGovernorates() {
    const govSelect = $('govSelect');
    const emGov = $('emGov');
    const list = Array.isArray(cfg.governorates) ? cfg.governorates : [];

    if (govSelect) {
      govSelect.innerHTML = list
        .map((g) => `<option value="${g.name}" ${g.name === state.governorate ? 'selected' : ''}>${g.name}</option>`)
        .join('');
    }
    if (emGov) {
      emGov.innerHTML = list
        .map((g) => `<option value="${g.name}" ${g.name === state.governorate ? 'selected' : ''}>${g.name}</option>`)
        .join('');
    }
  }

  function setLocationStatus(msg) {
    const el = $('locationStatus');
    if (el) el.textContent = msg;
  }

  function detectUserLocation() {
    setLocationStatus('جاري تحديد الموقع...');
    if (!navigator.geolocation) {
      setLocationStatus(`الولاية المختارة: ${state.governorate}`);
      renderAll();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.lat = pos.coords.latitude;
        state.lng = pos.coords.longitude;
        let nearest = null;
        let bestDist = Infinity;
        for (const g of cfg.governorates || []) {
          const d = haversineKm(state.lat, state.lng, g.lat, g.lng);
          if (d < bestDist) {
            bestDist = d;
            nearest = g;
          }
        }
        if (nearest) {
          state.governorate = nearest.name;
          if ($('govSelect')) $('govSelect').value = nearest.name;
          if ($('emGov')) $('emGov').value = nearest.name;
        }
        setLocationStatus(`موقعك الحالي قرب ${state.governorate}`);
        renderAll();
      },
      () => {
        setLocationStatus(`الموقع الافتراضي: ${state.governorate}`);
        renderAll();
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );
  }

  function initTabs() {
    const buttons = document.querySelectorAll('.nav-btn[data-tab]');
    const panels = document.querySelectorAll('.tab-panel');

    function activateTab(tabName) {
      state.tab = tabName;
      buttons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabName));
      panels.forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${tabName}`));
      if (tabName === 'map') {
        setTimeout(initOrRefreshMap, 120);
      }
    }

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });

    activateTab(state.tab);
  }

  function renderHighlights() {
    const box = $('marketHighlights');
    if (!box) return;
    const items = [
      { title: 'عروض 24 ساعة', desc: 'تتجدد يومياً قرب حومتك', icon: '⚡' },
      { title: 'مواشي وحبوب', desc: 'أغنام، أبقار، زيت، علف', icon: '🐑' },
      { title: 'طوارئ فورية', desc: 'استجابة سريعة على مدار الساعة', icon: '🚨' }
    ];
    box.innerHTML = items
      .map(
        (it) => `
      <div class="highlight-card">
        <span class="hl-icon">${it.icon}</span>
        <div>
          <strong>${it.title}</strong>
          <small>${it.desc}</small>
        </div>
      </div>`
      )
      .join('');
  }

  function renderCategories() {
    const mCat = $('marketCategories');
    const sCat = $('servicesCategories');

    if (mCat) {
      mCat.innerHTML = (fallbackData.marketCategories || [])
        .map((c) => {
          const active = state.selectedMarketCat === c.name ? 'active' : '';
          return `<button type="button" class="cat-chip ${active}" data-mcat="${c.name}"><span>${c.icon}</span><span>${c.name}</span></button>`;
        })
        .join('');

      mCat.querySelectorAll('[data-mcat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.selectedMarketCat = state.selectedMarketCat === btn.dataset.mcat ? '' : btn.dataset.mcat;
          renderCategories();
          renderMarketOffers();
        });
      });
    }

    if (sCat) {
      sCat.innerHTML = (fallbackData.servicesCategories || [])
        .map((c) => {
          const active = state.selectedServiceCat === c.name ? 'active' : '';
          return `<button type="button" class="cat-chip ${active}" data-scat="${c.name}"><span>${c.icon}</span><span>${c.name}</span></button>`;
        })
        .join('');

      sCat.querySelectorAll('[data-scat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.selectedServiceCat = state.selectedServiceCat === btn.dataset.scat ? '' : btn.dataset.scat;
          renderCategories();
          renderProviders();
        });
      });
    }
  }

  function getStoredItems(key, fallbackArr) {
    try {
      if (window.AppStorage && typeof window.AppStorage.getList === 'function') {
        const res = window.AppStorage.getList(key);
        if (Array.isArray(res) && res.length > 0) return res;
      }
      const raw = localStorage.getItem(`kb_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return fallbackArr;
  }

  function renderMarketOffers() {
    const listEl = $('marketOffersList');
    const titleEl = $('marketResultsTitle');
    const clearBtn = $('btnClearMarketFilter');
    if (!listEl) return;

    const allOffers = getStoredItems('offers', fallbackData.sampleOffers || []);
    const q = state.marketQuery.trim().toLowerCase();

    const filtered = allOffers.filter((item) => {
      const okLoc = matchesLocation(item);
      const okCat = !state.selectedMarketCat || item.category === state.selectedMarketCat;
      const okQ =
        !q ||
        String(item.title || '').toLowerCase().includes(q) ||
        String(item.category || '').toLowerCase().includes(q) ||
        String(item.governorate || '').toLowerCase().includes(q);
      return okLoc && okCat && okQ;
    });

    const hasFilter = Boolean(state.selectedMarketCat || q || state.radius !== 'gov');
    if (clearBtn) clearBtn.classList.toggle('hidden', !hasFilter);
    if (titleEl) {
      titleEl.textContent = state.selectedMarketCat
        ? `عروض: ${state.selectedMarketCat}`
        : `أحدث العروض القريبة منك (${filtered.length})`;
    }

    if (!filtered.length) {
      listEl.innerHTML = `<div class="empty-box">لا توجد عروض مطابقة حالياً في ${state.governorate}. جرّب تغيير النطاق إلى "كل تونس".</div>`;
      return;
    }

    listEl.innerHTML = filtered
      .map(
        (o) => `
      <article class="item-card">
        <div class="item-top">
          <h4>${o.title || 'عرض يومي'}</h4>
          <span class="price-tag">${o.price || ''}</span>
        </div>
        <div class="item-meta">
          <span>📂 ${o.category || 'سوق الحومة'}</span>
          <span>📍 ${o.governorate || state.governorate}</span>
          <span>⏳ ${o.hoursLeft || 24} سا</span>
        </div>
        <div class="item-actions">
          <a class="action-btn" href="tel:${o.phone || ''}">📞 اتصال</a>
          <a class="action-btn secondary" target="_blank" rel="noopener" href="https://wa.me/216${String(o.phone || '').replace(/\D/g, '')}">💬 واتساب</a>
        </div>
      </article>`
      )
      .join('');
  }

  function renderProviders() {
    const listEl = $('providersList');
    const titleEl = $('servicesResultsTitle');
    const clearBtn = $('btnClearServicesFilter');
    if (!listEl) return;

    const allProviders = getStoredItems('providers', fallbackData.sampleProviders || []);
    const q = state.servicesQuery.trim().toLowerCase();

    const filtered = allProviders.filter((p) => {
      const okLoc = matchesLocation(p);
      const okCat = !state.selectedServiceCat || p.specialty === state.selectedServiceCat;
      const okQ =
        !q ||
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.specialty || '').toLowerCase().includes(q) ||
        String(p.governorate || '').toLowerCase().includes(q);
      return okLoc && okCat && okQ;
    });

    const hasFilter = Boolean(state.selectedServiceCat || q || state.radius !== 'gov');
    if (clearBtn) clearBtn.classList.toggle('hidden', !hasFilter);
    if (titleEl) {
      titleEl.textContent = state.selectedServiceCat
        ? `مختصون في: ${state.selectedServiceCat}`
        : `الحرفيون ومقدمو الخدمات القريبون (${filtered.length})`;
    }

    if (!filtered.length) {
      listEl.innerHTML = `<div class="empty-box">لا يوجد حرفيون مطابقون في ${state.governorate} حالياً.</div>`;
      return;
    }

    listEl.innerHTML = filtered
      .map(
        (p) => `
      <article class="item-card">
        <div class="item-top">
          <h4>${p.name || 'مقدم خدمة'}</h4>
          <span class="rating-tag">⭐ ${p.rating || '4.8'}</span>
        </div>
        <div class="item-meta">
          <span>🛠️ ${p.specialty || 'خدمة محلية'}</span>
          <span>📍 ${p.governorate || state.governorate}</span>
        </div>
        <div class="item-actions">
          <a class="action-btn" href="tel:${p.phone || ''}">📞 اتصال مباشر</a>
        </div>
      </article>`
      )
      .join('');
  }

  function renderEmergencies() {
    const listEl = $('emergenciesList');
    const badgeEl = $('emergencyCountBadge');
    const list = getStoredItems('emergencies', []);
    if (badgeEl) badgeEl.textContent = String(list.length);
    if (!listEl) return;

    if (!list.length) {
      listEl.innerHTML = `<div class="empty-box">لا توجد بلاغات طوارئ مفتوحة حالياً في محيطك.</div>`;
      return;
    }

    listEl.innerHTML = list
      .map(
        (em) => `
      <article class="item-card emergency-card">
        <div class="item-top">
          <h4>🚨 ${em.category || 'بلاغ طارئ'}</h4>
          <span class="badge-danger">${em.governorate || state.governorate}</span>
        </div>
        <p class="item-desc">${em.description || ''}</p>
        ${em.phone ? `<div class="item-actions"><a class="action-btn danger" href="tel:${em.phone}">📞 اتصل بالمبلّغ</a></div>` : ''}
      </article>`
      )
      .join('');
  }

  function initOrRefreshMap() {
    const mapEl = $('mainMap');
    if (!mapEl || typeof L === 'undefined') return;

    if (!state.map) {
      state.map = L.map('mainMap').setView([state.lat, state.lng], 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(state.map);
      state.markersLayer = L.layerGroup().addTo(state.map);
    } else {
      state.map.setView([state.lat, state.lng], state.map.getZoom() || 9);
      state.map.invalidateSize();
      state.markersLayer.clearLayers();
    }

    const offers = getStoredItems('offers', fallbackData.sampleOffers || []);
    offers.forEach((o) => {
      if (typeof o.lat === 'number' && typeof o.lng === 'number') {
        L.circleMarker([o.lat, o.lng], { radius: 8, color: '#15803d', fillOpacity: 0.85 })
          .bindPopup(`<strong>🛒 ${o.title}</strong><br>${o.price || ''}`)
          .addTo(state.markersLayer);
      }
    });

    const providers = getStoredItems('providers', fallbackData.sampleProviders || []);
    providers.forEach((p) => {
      if (typeof p.lat === 'number' && typeof p.lng === 'number') {
        L.circleMarker([p.lat, p.lng], { radius: 8, color: '#0284c7', fillOpacity: 0.85 })
          .bindPopup(`<strong>🛠️ ${p.name}</strong><br>${p.specialty || ''}`)
          .addTo(state.markersLayer);
      }
    });
  }

  function bindEvents() {
    const govSelect = $('govSelect');
    const radiusSelect = $('radiusSelect');
    const btnAutoLoc = $('btnAutoLoc');
    const marketSearch = $('marketSearch');
    const servicesSearch = $('servicesSearch');
    const clearM = $('btnClearMarketFilter');
    const clearS = $('btnClearServicesFilter');
    const btnOpenEm = $('btnOpenEmergencyModal');
    const btnTerms = $('btnTerms');
    const authFormBtn = $('btnAuthSubmit');

    if (govSelect) {
      govSelect.addEventListener('change', (e) => {
        state.governorate = e.target.value;
        const found = (cfg.governorates || []).find((g) => g.name === state.governorate);
        if (found) {
          state.lat = found.lat;
          state.lng = found.lng;
        }
        setLocationStatus(`الولاية المختارة: ${state.governorate}`);
        renderAll();
      });
    }

    if (radiusSelect) {
      radiusSelect.addEventListener('change', (e) => {
        state.radius = e.target.value;
        renderAll();
      });
    }

    if (btnAutoLoc) {
      btnAutoLoc.addEventListener('click', detectUserLocation);
    }

    if (marketSearch) {
      marketSearch.addEventListener('input', (e) => {
        state.marketQuery = e.target.value || '';
        renderMarketOffers();
      });
    }

    if (servicesSearch) {
      servicesSearch.addEventListener('input', (e) => {
        state.servicesQuery = e.target.value || '';
        renderProviders();
      });
    }

    if (clearM) {
      clearM.addEventListener('click', () => {
        state.selectedMarketCat = '';
        state.marketQuery = '';
        if (marketSearch) marketSearch.value = '';
        renderCategories();
        renderMarketOffers();
      });
    }

    if (clearS) {
      clearS.addEventListener('click', () => {
        state.selectedServiceCat = '';
        state.servicesQuery = '';
        if (servicesSearch) servicesSearch.value = '';
        renderCategories();
        renderProviders();
      });
    }

    document.querySelectorAll('.close-modal[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = $(btn.dataset.close);
        if (modal) modal.classList.add('hidden');
      });
    });

    if (btnOpenEm) {
      btnOpenEm.addEventListener('click', () => {
        const modal = $('emergencyModal');
        if (modal) modal.classList.remove('hidden');
      });
    }

    const emForm = $('emergencyForm');
    if (emForm) {
      emForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newEm = {
          id: `em-${Date.now()}`,
          category: $('emCategory') ? $('emCategory').value : 'طارئ',
          governorate: $('emGov') ? $('emGov').value : state.governorate,
          description: $('emDesc') ? $('emDesc').value.trim() : '',
          phone: $('emPhone') ? $('emPhone').value.trim() : '',
          lat: state.lat,
          lng: state.lng,
          createdAt: new Date().toISOString()
        };
        const current = getStoredItems('emergencies', []);
        current.unshift(newEm);
        localStorage.setItem('kb_emergencies', JSON.stringify(current));
        emForm.reset();
        const modal = $('emergencyModal');
        if (modal) modal.classList.add('hidden');
        renderEmergencies();
      });
    }

    if (btnTerms) {
      btnTerms.addEventListener('click', () => {
        const title = $('infoModalTitle');
        const body = $('infoModalBody');
        const modal = $('infoModal');
        if (title) title.textContent = '⚖️ شروط الاستخدام وإخلاء المسؤولية';
        if (body) {
          body.innerHTML =
            '<p>تطبيق <strong>خوذ بايك</strong> هو منصة إعلانية ودليل محلي يربط المواطنين بالحرفيين والتجار وبلاغات الطوارئ عبر الولايات التونسية. يتحمل المعلن أو مقدم الخدمة مسؤولية صحة بياناته وجودة خدماته أو منتجاته.</p>';
        }
        if (modal) modal.classList.remove('hidden');
      });
    }

    if (authFormBtn) {
      authFormBtn.addEventListener('click', () => {
        const phone = $('authPhone') ? $('authPhone').value.trim() : '';
        const pin = $('authPin') ? $('authPin').value.trim() : '';
        if (phone.length < 8 || pin.length < 4) {
          alert('يرجى إدخال رقم هاتف من 8 أرقام ورمز سري من 4 أرقام على الأقل.');
          return;
        }
        state.session = { phone, createdAt: Date.now() };
        localStorage.setItem('kb_session', JSON.stringify(state.session));
        const authBox = $('accountAuthBox');
        const dash = $('accountDashboard');
        if (authBox) authBox.classList.add('hidden');
        if (dash) {
          dash.classList.remove('hidden');
          dash.innerHTML = `<div class="card-box"><h4>مرحباً بك في حسابك المعلِن</h4><p class="muted">رقم الهاتف: ${phone} — فترة التجربة المجانية: ${cfg.trialDays} يوماً.</p></div>`;
        }
      });
    }
  }

  function renderAll() {
    renderHighlights();
    renderCategories();
    renderMarketOffers();
    renderProviders();
    renderEmergencies();
    if (state.tab === 'map') {
      initOrRefreshMap();
    }
  }

  function boot() {
    populateGovernorates();
    initTabs();
    bindEvents();
    renderAll();
    detectUserLocation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
