(() => {
  const state = {
    activeTab: 'market',
    governorate: window.APP_CONFIG.defaultLocation.governorate,
    radiusScope: 'gov',
    userCoords: {
      lat: window.APP_CONFIG.defaultLocation.lat,
      lng: window.APP_CONFIG.defaultLocation.lng,
      isGps: false
    },
    marketCategory: null,
    marketOnlyRecent: false,
    marketSearch: '',
    servicesCategory: null,
    servicesSearch: '',
    providers: [],
    offers: [],
    emergencies: [],
    mainMap: null,
    markersLayer: null,
    cameraStream: null,
    capturedSelfieBlob: null,
    pendingOtpCode: null
  };

  function haversineKm(lat1, lng1, lat2, lng2) {
    if ([lat1, lng1, lat2, lng2].some((v) => typeof v !== 'number' || Number.isNaN(v))) {
      return null;
    }
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(item) {
    const d = haversineKm(state.userCoords.lat, state.userCoords.lng, item.lat, item.lng);
    return typeof d === 'number' ? `${d.toFixed(1)} كم` : '';
  }

  function matchesLocation(item) {
    if (state.radiusScope === 'all') return true;
    if (state.radiusScope === '25km') {
      const d = haversineKm(state.userCoords.lat, state.userCoords.lng, item.lat, item.lng);
      if (typeof d === 'number') return d <= 25;
    }
    return item.governorate === state.governorate;
  }

  function sortByProximity(items) {
    return [...items].sort((a, b) => {
      const da = haversineKm(state.userCoords.lat, state.userCoords.lng, a.lat, a.lng) ?? 99999;
      const db = haversineKm(state.userCoords.lat, state.userCoords.lng, b.lat, b.lng) ?? 99999;
      return da - db;
    });
  }

  function getCategoryName(catId) {
    return window.APP_DATA?.categories?.find((c) => c.id === catId)?.name || 'عام';
  }

  function populateGovernorates() {
    const sel = document.getElementById('govSelect');
    sel.innerHTML = '';
    (window.APP_CONFIG?.governorates || []).forEach((g) => {
      const opt = document.createElement('option');
      opt.value = g.name;
      opt.textContent = g.name;
      sel.appendChild(opt);
    });
    sel.value = state.governorate;
  }

  function updateLocationLabel() {
    const statusEl = document.getElementById('locationStatus');
    const modeText = state.userCoords.isGps ? 'GPS' : 'الولاية';
    statusEl.textContent = `${state.governorate} (${modeText})`;
  }

  function autoDetectTravelLocation(forceAlert = false) {
    if (!navigator.geolocation) {
      if (forceAlert) alert('المتصفح لا يدعم تحديد الموقع عبر GPS');
      return;
    }
    const statusEl = document.getElementById('locationStatus');
    statusEl.textContent = 'جاري التحديد...';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        state.userCoords = { lat: latitude, lng: longitude, isGps: true };

        let nearest = window.APP_CONFIG.governorates[0];
        let minDist = Infinity;
        for (const g of window.APP_CONFIG.governorates) {
          const d = haversineKm(latitude, longitude, g.lat, g.lng);
          if (typeof d === 'number' && d < minDist) {
            minDist = d;
            nearest = g;
          }
        }
        if (nearest) {
          state.governorate = nearest.name;
          document.getElementById('govSelect').value = nearest.name;
        }

        window.APP_STORAGE.saveLocation({
          governorate: state.governorate,
          lat: latitude,
          lng: longitude,
          isGps: true
        });

        updateLocationLabel();
        renderAll();
        if (forceAlert) alert(`تم التحديث إلى ${state.governorate} عبر GPS`);
      },
      () => {
        updateLocationLabel();
        if (forceAlert) alert('تعذر الوصول إلى GPS، يمكنك اختيار ولايتك يدوياً');
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));

    document.getElementById(`tab-${tabName}`)?.classList.add('active');
    document.querySelector(`.nav-btn[data-tab="${tabName}"]`)?.classList.add('active');

    if (tabName === 'map') {
      initOrUpdateMainMap();
    } else if (tabName === 'account') {
      renderAccountTab();
    }
  }

  function renderCategories() {
    const cats = window.APP_DATA?.categories || [];
    const marketWrap = document.getElementById('marketCategories');
    const servicesWrap = document.getElementById('servicesCategories');

    marketWrap.innerHTML = '';
    servicesWrap.innerHTML = '';

    cats.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-btn';
      btn.innerHTML = `<span class="cat-emoji">${cat.emoji}</span><span>${cat.name}</span>`;

      if (cat.section === 'market') {
        if (state.marketCategory === cat.id) btn.classList.add('active');
        btn.addEventListener('click', () => {
          state.marketOnlyRecent = false;
          state.marketCategory = state.marketCategory === cat.id ? null : cat.id;
          renderCategories();
          renderMarket();
        });
        marketWrap.appendChild(btn);
      } else {
        if (state.servicesCategory === cat.id) btn.classList.add('active');
        btn.addEventListener('click', () => {
          state.servicesCategory = state.servicesCategory === cat.id ? null : cat.id;
          renderCategories();
          renderServices();
        });
        servicesWrap.appendChild(btn);
      }
    });
  }

  function buildContactActions(item) {
    const phoneClean = String(item.phone || '').replace(/\D/g, '');
    const waHref = phoneClean ? `https://wa.me/216${phoneClean}` : '';
    const telHref = phoneClean ? `tel:${phoneClean}` : '';
    const navHref =
      typeof item.lat === 'number' && typeof item.lng === 'number'
        ? `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`
        : '';

    return `
      <div class="card-actions">
        ${telHref ? `<a class="action-btn btn-call" href="${telHref}">📞 اتصال</a>` : ''}
        ${waHref ? `<a class="action-btn btn-wa" href="${waHref}" target="_blank" rel="noopener">💬 واتساب</a>` : ''}
        ${navHref ? `<a class="action-btn btn-nav" href="${navHref}" target="_blank" rel="noopener">🧭 الذهاب للمكان</a>` : ''}
      </div>
    `;
  }

  function renderMarket() {
    const recentOffers = sortByProximity(
      state.offers.filter((o) => o.section === 'market' && matchesLocation(o))
    );

    const highlightsEl = document.getElementById('marketHighlights');
    highlightsEl.innerHTML = `
      <div id="btnRecentMarketCard" class="highlight-card">
        <div>
          <h3>🔥 كل الإعلانات الحديثة القريبة مني</h3>
          <p>عروض وسلع ومواشي نشطة خلال آخر 24 ساعة في محيطك (دون بلاغات الطوارئ)</p>
        </div>
        <span class="highlight-count">${recentOffers.length} عرض</span>
      </div>
    `;

    document.getElementById('btnRecentMarketCard')?.addEventListener('click', () => {
      state.marketCategory = null;
      state.marketOnlyRecent = !state.marketOnlyRecent;
      renderCategories();
      renderMarket();
    });

    const q = state.marketSearch.trim().toLowerCase();
    let list = recentOffers;

    if (state.marketCategory) {
      list = list.filter((o) => o.category_id === state.marketCategory);
    }
    if (q) {
      list = list.filter(
        (o) =>
          (o.title || '').toLowerCase().includes(q) ||
          (o.details || '').toLowerCase().includes(q) ||
          (o.provider_name || '').toLowerCase().includes(q) ||
          getCategoryName(o.category_id).toLowerCase().includes(q)
      );
    }

    const titleEl = document.getElementById('marketResultsTitle');
    const clearBtn = document.getElementById('btnClearMarketFilter');
    const hasFilter = Boolean(state.marketCategory || state.marketOnlyRecent || q);

    clearBtn.classList.toggle('hidden', !hasFilter);
    if (state.marketOnlyRecent) {
      titleEl.textContent = `🔥 كل الإعلانات الحديثة القريبة مني (${list.length})`;
    } else if (state.marketCategory) {
      titleEl.textContent = `${getCategoryName(state.marketCategory)} (${list.length})`;
    } else {
      titleEl.textContent = `أحدث العروض القريبة منك (${list.length})`;
    }

    const listEl = document.getElementById('marketOffersList');
    if (!list.length) {
      listEl.innerHTML = `<div class="card-box"><p class="muted">لا توجد عروض مطابقة حالياً في هذا النطاق. يمكنك توسيع النطاق إلى "كل تونس" أو إضافة إعلان من "حسابي".</p></div>`;
      return;
    }

    listEl.innerHTML = list
      .map((o) => {
        const dist = formatDistance(o);
        return `
          <article class="item-card">
            <div class="card-top">
              <div>
                <h4 class="card-title">${escapeHtml(o.title)}</h4>
                <div class="card-meta">
                  ${escapeHtml(getCategoryName(o.category_id))} • ${escapeHtml(o.governorate)} ${dist ? `• ${dist}` : ''}
                </div>
                <div class="card-meta">المعلن: <strong>${escapeHtml(o.provider_name || 'معلن محلي')}</strong></div>
              </div>
              <span class="badge-live">24 ساعة</span>
            </div>
            ${o.details ? `<p class="muted" style="margin:8px 0 0;">${escapeHtml(o.details)}</p>` : ''}
            ${o.image_url ? `<img class="offer-img" src="${escapeAttr(o.image_url)}" alt="${escapeAttr(o.title)}" loading="lazy" />` : ''}
            ${buildContactActions(o)}
          </article>
        `;
      })
      .join('');
  }

  function renderServices() {
    const q = state.servicesSearch.trim().toLowerCase();
    let list = sortByProximity(
      state.providers.filter((p) => p.section === 'services' && matchesLocation(p))
    );

    if (state.servicesCategory) {
      list = list.filter((p) => p.category_id === state.servicesCategory);
    }
    if (q) {
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.kind || '').toLowerCase().includes(q) ||
          (p.district || '').toLowerCase().includes(q) ||
          getCategoryName(p.category_id).toLowerCase().includes(q)
      );
    }

    const titleEl = document.getElementById('servicesResultsTitle');
    const clearBtn = document.getElementById('btnClearServicesFilter');
    const hasFilter = Boolean(state.servicesCategory || q);

    clearBtn.classList.toggle('hidden', !hasFilter);
    titleEl.textContent = state.servicesCategory
      ? `${getCategoryName(state.servicesCategory)} (${list.length})`
      : `الحرفيون ومقدمو الخدمات القريبون (${list.length})`;

    const listEl = document.getElementById('providersList');
    if (!list.length) {
      listEl.innerHTML = `<div class="card-box"><p class="muted">لا يوجد حرفيون مسجلون في هذا التخصص ضمن النطاق المحدد حالياً.</p></div>`;
      return;
    }

    listEl.innerHTML = list
      .map((p) => {
        const dist = formatDistance(p);
        return `
          <article class="item-card">
            <div class="card-top">
              <div style="display:flex;gap:10px;align-items:center;">
                ${p.selfie_url ? `<img class="selfie-thumb" src="${escapeAttr(p.selfie_url)}" alt="${escapeAttr(p.name)}" loading="lazy" />` : ''}
                <div>
                  <h4 class="card-title">${escapeHtml(p.name)}</h4>
                  <div class="card-meta">
                    ${escapeHtml(p.kind || getCategoryName(p.category_id))} • ${escapeHtml(p.governorate)} ${p.district ? `(${escapeHtml(p.district)})` : ''} ${dist ? `• ${dist}` : ''}
                  </div>
                </div>
              </div>
              ${p.verified ? `<span class="verified-pill">✓ موثق</span>` : ''}
            </div>
            ${buildContactActions(p)}
          </article>
        `;
      })
      .join('');
  }

  function renderEmergencies() {
    const list = sortByProximity(state.emergencies.filter((em) => matchesLocation(em)));
    document.getElementById('emergencyCountBadge').textContent = String(list.length);

    const listEl = document.getElementById('emergenciesList');
    if (!list.length) {
      listEl.innerHTML = `<div class="card-box"><p class="muted">لا توجد بلاغات طوارئ مفتوحة في منطقتك حالياً.</p></div>`;
      return;
    }

    listEl.innerHTML = list
      .map((em) => {
        const dist = formatDistance(em);
        const phoneClean = String(em.phone || '').replace(/\D/g, '');
        const navHref =
          typeof em.lat === 'number' && typeof em.lng === 'number'
            ? `https://www.google.com/maps/dir/?api=1&destination=${em.lat},${em.lng}`
            : '';

        return `
          <article class="item-card emergency-card">
            <div class="card-top">
              <div>
                <h4 class="card-title" style="color:var(--danger);">🚨 ${escapeHtml(em.category)}</h4>
                <div class="card-meta">${escapeHtml(em.governorate)} ${dist ? `• ${dist}` : ''}</div>
              </div>
              <span class="badge-danger">مفتوح</span>
            </div>
            <p style="margin:8px 0 0;font-size:0.9rem;">${escapeHtml(em.description)}</p>
            <div class="card-actions">
              ${phoneClean ? `<a class="action-btn btn-call" href="tel:${phoneClean}">📞 اتصال</a>` : ''}
              ${navHref ? `<a class="action-btn btn-nav" href="${navHref}" target="_blank" rel="noopener">🧭 الذهاب للمكان</a>` : ''}
              <button type="button" class="action-btn btn-close-em" data-em-id="${escapeAttr(em.id)}">✅ تم الإصلاح</button>
            </div>
          </article>
        `;
      })
      .join('');

    listEl.querySelectorAll('.btn-close-em').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-em-id');
        btn.disabled = true;
        btn.textContent = 'جاري الإغلاق...';
        try {
          await window.APP_STORAGE.closeEmergencySafely(id);
          await refreshData();
        } catch (err) {
          alert('تعذر إغلاق البلاغ: ' + (err.message || 'خطأ'));
          btn.disabled = false;
          btn.textContent = '✅ تم الإصلاح';
        }
      });
    });
  }

  function initOrUpdateMainMap() {
    if (!window.L) return;
    const { lat, lng } = state.userCoords;

    if (!state.mainMap) {
      state.mainMap = L.map('mainMap').setView([lat, lng], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(state.mainMap);
      state.markersLayer = L.layerGroup().addTo(state.mainMap);
    } else {
      state.mainMap.setView([lat, lng], 11);
      state.markersLayer.clearLayers();
    }

    const cardEl = document.getElementById('mapSelectedCard');

    const showSelection = (title, meta, phone, latVal, lngVal) => {
      cardEl.classList.remove('hidden');
      const phoneClean = String(phone || '').replace(/\D/g, '');
      cardEl.innerHTML = `
        <div class="card-box">
          <h4 class="card-title">${escapeHtml(title)}</h4>
          <div class="card-meta">${escapeHtml(meta)}</div>
          <div class="card-actions">
            ${phoneClean ? `<a class="action-btn btn-call" href="tel:${phoneClean}">📞 اتصال</a>` : ''}
            <a class="action-btn btn-nav" href="https://www.google.com/maps/dir/?api=1&destination=${latVal},${lngVal}" target="_blank" rel="noopener">🧭 الذهاب للمكان</a>
          </div>
        </div>
      `;
    };

    state.offers.filter(matchesLocation).forEach((o) => {
      if (typeof o.lat !== 'number' || typeof o.lng !== 'number') return;
      const m = L.circleMarker([o.lat, o.lng], { radius: 8, color: '#15803d', fillColor: '#22c55e', fillOpacity: 0.85 });
      m.on('click', () => showSelection(`🛒 ${o.title}`, `${o.governorate} • ${o.provider_name || ''}`, o.phone, o.lat, o.lng));
      m.addTo(state.markersLayer);
    });

    state.providers.filter(matchesLocation).forEach((p) => {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
      const m = L.circleMarker([p.lat, p.lng], { radius: 8, color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.85 });
      m.on('click', () => showSelection(`🛠️ ${p.name}`, `${p.kind || ''} • ${p.governorate}`, p.phone, p.lat, p.lng));
      m.addTo(state.markersLayer);
    });

    state.emergencies.filter(matchesLocation).forEach((em) => {
      if (typeof em.lat !== 'number' || typeof em.lng !== 'number') return;
      const m = L.circleMarker([em.lat, em.lng], { radius: 10, color: '#991b1b', fillColor: '#ef4444', fillOpacity: 0.9 });
      m.on('click', () => showSelection(`🚨 ${em.category}`, `${em.governorate} • ${em.description}`, em.phone, em.lat, em.lng));
      m.addTo(state.markersLayer);
    });

    setTimeout(() => {
      state.mainMap?.invalidateSize();
    }, 150);
  }

  function stopCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach((t) => t.stop());
      state.cameraStream = null;
    }
  }

  function renderAccountTab() {
    const authBox = document.getElementById('accountAuthBox');
    const dashEl = document.getElementById('accountDashboard');
    const provider = window.APP_STORAGE.getSessionProvider();

    if (!provider) {
      stopCamera();
      authBox.classList.remove('hidden');
      dashEl.classList.add('hidden');
      return;
    }

    authBox.classList.add('hidden');
    dashEl.classList.remove('hidden');

    const daysLeft = window.APP_STORAGE.getTrialDaysLeft(provider);
    const cats = window.APP_DATA?.categories || [];

    dashEl.innerHTML = `
      <div class="card-box">
        <div class="card-top">
          <div style="display:flex;gap:10px;align-items:center;">
            ${provider.selfie_url ? `<img class="selfie-thumb" src="${escapeAttr(provider.selfie_url)}" alt="سيلفي" />` : ''}
            <div>
              <h3 style="margin:0;">${escapeHtml(provider.name)}</h3>
              <div class="card-meta">${escapeHtml(provider.kind)} • ${escapeHtml(provider.governorate)} • ${escapeHtml(provider.phone)}</div>
            </div>
          </div>
          <button type="button" id="btnLogoutProvider" class="ghost-btn">خروج</button>
        </div>

        <div class="stats-row">
          <div class="stat-box">
            <div class="muted">الفترة المجانية المتبقية</div>
            <div class="stat-val">${daysLeft} يوم</div>
          </div>
          <div class="stat-box">
            <div class="muted">حالة التوثيق</div>
            <div class="stat-val">${provider.verified ? '✓ موثق' : 'قيد المراجعة'}</div>
          </div>
        </div>

        <div class="verify-box">
          <strong>🔐 التوثيق عبر واتساب والسيلفي:</strong>
          <p class="muted" style="margin:4px 0 8px;">تأكيد الرقم عبر واتساب وإضافة صورة سيلفي واضحة يزيد ثقة الحرفاء بك.</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <button type="button" id="btnSendWaOtp" class="chip-btn">
              ${provider.phone_verified ? '✓ تم تأكيد واتساب' : '💬 إرسال رمز تأكيد واتساب'}
            </button>
            <button type="button" id="btnOpenCamera" class="chip-btn">📸 التقاط صورة سيلفي</button>
          </div>

          <div id="otpVerifyRow" class="hidden" style="margin-top:10px;display:flex;gap:8px;">
            <input type="text" id="otpCodeInput" maxlength="6" placeholder="أدخل الرمز المكون من 4 أرقام" inputmode="numeric" />
            <button type="button" id="btnConfirmOtp" class="primary-btn">تأكيد</button>
          </div>

          <div id="cameraPanel" class="camera-box hidden">
            <video id="selfieVideo" autoplay playsinline></video>
            <canvas id="selfieCanvas" class="hidden"></canvas>
            <div style="margin-top:8px;display:flex;gap:8px;justify-content:center;">
              <button type="button" id="btnCaptureSelfie" class="primary-btn">التقاط</button>
              <button type="button" id="btnUploadSelfie" class="chip-btn hidden">حفظ السيلفي</button>
              <button type="button" id="btnCloseCamera" class="ghost-btn" style="color:#fff;">إغلاق</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card-box" style="margin-top:12px;">
        <h3>📢 نشر إعلان جديد في السوق (ساري 24 ساعة)</h3>
        <form id="createOfferForm">
          <div class="form-group">
            <label for="offerCat">الفئة</label>
            <select id="offerCat" required>
              ${cats.map((c) => `<option value="${escapeAttr(c.id)}" ${c.id === provider.category_id ? 'selected' : ''}>${c.emoji} ${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="offerTitle">عنوان الإعلان</label>
            <input type="text" id="offerTitle" required placeholder="مثال: خروف بركوس أو مكيف سبليت بحالة ممتازة..." />
          </div>
          <div class="form-group">
            <label for="offerDetails">تفاصيل إضافية والسعر (اختياري)</label>
            <textarea id="offerDetails" rows="2" placeholder="اكتب المواصفات أو السعر أو المكان بدقة..."></textarea>
          </div>
          <div class="form-group">
            <label for="offerImage">صورة الإعلان (اختياري)</label>
            <input type="file" id="offerImage" accept="image/*" />
          </div>
          <button type="submit" id="btnPublishOffer" class="primary-btn full-width">🚀 نشر الإعلان لـ 24 ساعة</button>
        </form>
      </div>
    `;

    document.getElementById('btnLogoutProvider').addEventListener('click', () => {
      stopCamera();
      window.APP_STORAGE.setSessionProvider(null);
      renderAccountTab();
    });

    document.getElementById('btnSendWaOtp').addEventListener('click', () => {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      state.pendingOtpCode = code;
      document.getElementById('otpVerifyRow').classList.remove('hidden');
      const phoneClean = String(provider.phone || '').replace(/\D/g, '');
      const text = encodeURIComponent(`رمز تأكيد حسابي في خوذ بايك: ${code}`);
      window.open(`https://wa.me/216${phoneClean}?text=${text}`, '_blank', 'noopener');
    });

    document.getElementById('btnConfirmOtp').addEventListener('click', async () => {
      const val = document.getElementById('otpCodeInput').value.trim();
      if (!state.pendingOtpCode || val !== state.pendingOtpCode) {
        alert('الرمز غير مطابق');
        return;
      }
      try {
        await window.APP_STORAGE.markPhoneVerified(provider.id);
        state.pendingOtpCode = null;
        await refreshData();
        renderAccountTab();
        alert('تم تأكيد رقم الهاتف بنجاح');
      } catch (err) {
        alert('خطأ أثناء التأكيد: ' + (err.message || ''));
      }
    });

    document.getElementById('btnOpenCamera').addEventListener('click', async () => {
      const panel = document.getElementById('cameraPanel');
      const video = document.getElementById('selfieVideo');
      panel.classList.remove('hidden');
      try {
        stopCamera();
        state.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
        video.srcObject = state.cameraStream;
      } catch (_) {
        alert('تعذر تشغيل الكاميرا الأمامية');
      }
    });

    document.getElementById('btnCloseCamera').addEventListener('click', () => {
      stopCamera();
      document.getElementById('cameraPanel').classList.add('hidden');
    });

    document.getElementById('btnCaptureSelfie').addEventListener('click', () => {
      const video = document.getElementById('selfieVideo');
      const canvas = document.getElementById('selfieCanvas');
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 320, 320);
      canvas.classList.remove('hidden');
      video.classList.add('hidden');
      document.getElementById('btnUploadSelfie').classList.remove('hidden');

      canvas.toBlob(
        (blob) => {
          state.capturedSelfieBlob = blob;
        },
        'image/jpeg',
        0.82
      );
    });

    document.getElementById('btnUploadSelfie').addEventListener('click', async () => {
      if (!state.capturedSelfieBlob) return;
      const btn = document.getElementById('btnUploadSelfie');
      btn.disabled = true;
      btn.textContent = 'جاري الرفع...';
      try {
        const url = await window.APP_STORAGE.uploadImageFile(state.capturedSelfieBlob, 'selfies');
        await window.APP_STORAGE.attachSelfieToProvider(provider.id, url);
        stopCamera();
        await refreshData();
        renderAccountTab();
        alert('تم حفظ صورة السيلفي بنجاح');
      } catch (err) {
        alert('فشل رفع السيلفي: ' + (err.message || ''));
        btn.disabled = false;
        btn.textContent = 'حفظ السيلفي';
      }
    });

    document.getElementById('createOfferForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnPublishOffer');
      const catId = document.getElementById('offerCat').value;
      const catObj = cats.find((c) => c.id === catId) || cats[0];
      const title = document.getElementById('offerTitle').value.trim();
      const details = document.getElementById('offerDetails').value.trim();
      const fileInput = document.getElementById('offerImage');

      if (!title) return;

      btn.disabled = true;
      btn.textContent = 'جاري النشر...';

      try {
        let imageUrl = null;
        if (fileInput.files && fileInput.files[0]) {
          imageUrl = await window.APP_STORAGE.uploadImageFile(fileInput.files[0], 'offers');
        }

        await window.APP_STORAGE.createOffer({
          provider_id: provider.id,
          provider_name: provider.name,
          provider_kind: provider.kind,
          phone: provider.phone,
          section: catObj.section,
          category_id: catObj.id,
          governorate: provider.governorate,
          title,
          details,
          image_url: imageUrl,
          lat: provider.lat ?? state.userCoords.lat,
          lng: provider.lng ?? state.userCoords.lng
        });

        e.target.reset();
        await refreshData();
        switchTab('market');
        alert('تم نشر إعلانك بنجاح لمدة 24 ساعة');
      } catch (err) {
        alert('تعذر نشر الإعلان: ' + (err.message || ''));
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 نشر الإعلان لـ 24 ساعة';
      }
    });
  }

  async function handleAuthSubmit() {
    const phone = document.getElementById('authPhone').value.trim();
    const pin = document.getElementById('authPin').value.trim();

    if (!/^[2459]\d{7}$/.test(phone)) {
      alert('يرجى إدخال رقم هاتف تونسي صحيح من 8 أرقام');
      return;
    }
    if (pin.length < 4) {
      alert('الرمز السري يجب أن يتكون من 4 أرقام على الأقل');
      return;
    }

    const btn = document.getElementById('btnAuthSubmit');
    btn.disabled = true;
    btn.textContent = 'جاري الدخول...';

    try {
      const govObj =
        window.APP_CONFIG.governorates.find((g) => g.name === state.governorate) ||
        window.APP_CONFIG.defaultLocation;

      const defaultCat = window.APP_DATA.categories[0];

      await window.APP_STORAGE.loginOrRegisterProvider({
        phone,
        pin,
        name: `معلن ${phone}`,
        kind: defaultCat.kind,
        section: defaultCat.section,
        category_id: defaultCat.id,
        governorate: state.governorate,
        district: '',
        lat: state.userCoords.lat || govObj.lat,
        lng: state.userCoords.lng || govObj.lng
      });

      await refreshData();
      renderAccountTab();
    } catch (err) {
      alert(err.message || 'تعذر تسجيل الدخول');
    } finally {
      btn.disabled = false;
      btn.textContent = '🔓 دخول / إنشاء حساب معلن';
    }
  }

  async function refreshData() {
    if (!window.APP_STORAGE.isReady()) {
      renderAll();
      return;
    }
    const [provs, offs, ems] = await Promise.all([
      window.APP_STORAGE.fetchProviders(),
      window.APP_STORAGE.fetchActiveOffers(),
      window.APP_STORAGE.fetchOpenEmergencies()
    ]);
    state.providers = provs;
    state.offers = offs;
    state.emergencies = ems;
    renderAll();
  }

  function renderAll() {
    renderMarket();
    renderServices();
    renderEmergencies();
    if (state.activeTab === 'map') {
      initOrUpdateMainMap();
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return String(str || '').replace(/"/g, '&quot;');
  }

  function bindEvents() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
    });

    document.getElementById('govSelect').addEventListener('change', (e) => {
      state.governorate = e.target.value;
      const gObj = window.APP_CONFIG.governorates.find((g) => g.name === state.governorate);
      if (gObj && !state.userCoords.isGps) {
        state.userCoords = { lat: gObj.lat, lng: gObj.lng, isGps: false };
      }
      window.APP_STORAGE.saveLocation({
        governorate: state.governorate,
        lat: state.userCoords.lat,
        lng: state.userCoords.lng,
        isGps: state.userCoords.isGps
      });
      updateLocationLabel();
      renderAll();
    });

    document.getElementById('radiusSelect').addEventListener('change', (e) => {
      state.radiusScope = e.target.value;
      renderAll();
    });

    document.getElementById('btnAutoLoc').addEventListener('click', () => {
      autoDetectTravelLocation(true);
    });

    document.getElementById('marketSearch').addEventListener('input', (e) => {
      state.marketSearch = e.target.value;
      renderMarket();
    });

    document.getElementById('servicesSearch').addEventListener('input', (e) => {
      state.servicesSearch = e.target.value;
      renderServices();
    });

    document.getElementById('btnClearMarketFilter').addEventListener('click', () => {
      state.marketCategory = null;
      state.marketOnlyRecent = false;
      state.marketSearch = '';
      document.getElementById('marketSearch').value = '';
      renderCategories();
      renderMarket();
    });

    document.getElementById('btnClearServicesFilter').addEventListener('click', () => {
      state.servicesCategory = null;
      state.servicesSearch = '';
      document.getElementById('servicesSearch').value = '';
      renderCategories();
      renderServices();
    });

    document.getElementById('btnOpenEmergencyModal').addEventListener('click', () => {
      window.APP_EMERGENCY.openModal(state.userCoords, state.governorate);
    });

    document.getElementById('emergencyForm').addEventListener('submit', (e) => {
      window.APP_EMERGENCY.submitForm(e, refreshData);
    });

    document.getElementById('btnAuthSubmit').addEventListener('click', handleAuthSubmit);

    document.querySelectorAll('.close-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-close');
        if (id === 'emergencyModal') window.APP_EMERGENCY.closeModal();
        else document.getElementById(id)?.classList.add('hidden');
      });
    });

    document.getElementById('btnTerms').addEventListener('click', () => {
      document.getElementById('infoModalTitle').textContent = '⚖️ شروط الاستخدام وإخلاء المسؤولية';
      document.getElementById('infoModalBody').innerHTML = `
        <p><strong>خوذ بايك</strong> منصة تواصل محلية تربط المواطنين بالحرفيين، تجار الحومة، ومقدمي الخدمات عبر الولايات التونسية.</p>
        <p>• التواصل والاتفاق والتسعير يتم مباشرة بين الزبون ومقدم الخدمة أو البائع دون تدخل المنصة.</p>
        <p>• التصفح مجاني للجميع، ويحصل المعلنون على 60 يوماً مجانية تبدأ من تاريخ تسجيل الحساب.</p>
        <p>• في بلاغات الطوارئ 24/24، يتم إخفاء رقم الهاتف تلقائياً عند إغلاق البلاغ حمايةً لخصوصية المستخدم.</p>
      `;
      document.getElementById('infoModal').classList.remove('hidden');
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('SW registration:', err);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const saved = window.APP_STORAGE.getSavedLocation();
    if (saved?.governorate) {
      state.governorate = saved.governorate;
      state.userCoords = {
        lat: saved.lat ?? window.APP_CONFIG.defaultLocation.lat,
        lng: saved.lng ?? window.APP_CONFIG.defaultLocation.lng,
        isGps: Boolean(saved.isGps)
      };
    }

    populateGovernorates();
    updateLocationLabel();
    renderCategories();
    bindEvents();
    registerServiceWorker();

    await refreshData();
    if (!saved?.isGps) {
      autoDetectTravelLocation(false);
    }
  });
})();
