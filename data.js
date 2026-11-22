// خوذ بايك — طبقة البيانات والأمان والبث الحي وتعديل السعر السريع وRealtime ومراسلة الإدارة (v1.5-TN)
window.KB_DATA = (() => {
  'use strict';

  const C = window.KB_CONFIG;
  const STORE_KEYS = {
    prefs: 'kb_v11_prefs',
    offers: 'kb_v11_offers',
    crafts: 'kb_v11_crafts',
    emergencies: 'kb_v11_emergencies',
    account: 'kb_v11_account',
    claimed: 'kb_v11_claimed',
    favCats: 'kb_v14_fav_cats'
  };

  let sbClient = null;
  if (C.SUPABASE.url && C.SUPABASE.anonKey && window.supabase && typeof window.supabase.createClient === 'function') {
    sbClient = window.supabase.createClient(C.SUPABASE.url, C.SUPABASE.anonKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  function lsRemove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeAr(str) {
    return String(str == null ? '' : str)
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .toLowerCase()
      .trim();
  }

  function checkContentModeration(text) {
    const norm = normalizeAr(text);
    if (!norm || norm.length < 3) {
      return { ok: false, reason: '⚠️ يرجى كتابة وصف واضح ومناسب قبل النشر.' };
    }
    const rules = C.MODERATION_RULES || {};
    const groups = [
      { list: rules.alcohol || [], msg: '🚫 يُمنع نشر إعلانات الخمور والمشروبات الكحولية على «خوذ بايك».' },
      { list: rules.contraband || [], msg: '🚫 يُمنع نشر الممنوعات أو المواد غير القانونية على «خوذ بايك».' },
      { list: rules.profanity || [], msg: '🚫 يرجى احترام الآداب العامة؛ تم رصد ألفاظ غير لائقة في النص.' }
    ];
    for (const g of groups) {
      for (const word of g.list) {
        const w = normalizeAr(word);
        if (w && norm.includes(w)) {
          return { ok: false, reason: g.msg };
        }
      }
    }
    return { ok: true, reason: '' };
  }

  function cleanPhone(p) {
    let digits = String(p || '').replace(/\D/g, '');
    if (digits.startsWith('00216')) digits = digits.slice(5);
    else if (digits.startsWith('216') && digits.length >= 11) digits = digits.slice(3);
    return digits.length > 8 ? digits.slice(-8) : digits;
  }

  function isValidTnPhone(p) {
    return /^[234579]\d{7}$/.test(cleanPhone(p));
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getGovObj(arName) {
    return C.TN_GOVERNORATES.find((g) => g.ar === arName) || C.TN_GOVERNORATES[0];
  }

  function detectNearestGov(lat, lng) {
    let best = C.TN_GOVERNORATES[0];
    let bestD = Infinity;
    C.TN_GOVERNORATES.forEach((g) => {
      const d = haversineKm(lat, lng, g.lat, g.lng);
      if (d < bestD) { bestD = d; best = g; }
    });
    return best;
  }

  function formatRemaining(expiresAt) {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'منتهي';
    const totalHrs = Math.floor(diff / 3600000);
    const days = Math.floor(totalHrs / 24);
    const hrs = totalHrs % 24;
    const mins = Math.floor((diff % 3600000) / 60000);
    if (days >= 1) return `متبقي ${days}ي ${hrs}س`;
    if (hrs >= 1) return `متبقي ${hrs}س ${mins}د`;
    return `متبقي ${Math.max(1, mins)} دق`;
  }

  function formatAgo(ts) {
    const mins = Math.max(1, Math.floor((Date.now() - ts) / 60000));
    if (mins < 60) return `منذ ${mins} دق`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} سا`;
    return `منذ ${Math.floor(hrs / 24)} ي`;
  }

  function getMarketCatInfo(id) {
    return C.MARKET_CATS.find((c) => c.id === id) || C.MARKET_CATS[0];
  }

  function getCraftCatInfo(id) {
    return C.CRAFT_CATS.find((c) => c.id === id) || C.CRAFT_CATS[0];
  }

  function compressImageFile(file, maxDim = 680, maxBytes = 55000) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          let quality = 0.72;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          while (dataUrl.length * 0.75 > maxBytes && quality > 0.28) {
            quality -= 0.08;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          canvas.toBlob((blob) => {
            resolve({ dataUrl, blob, sizeKb: Math.round(((blob && blob.size) || (dataUrl.length * 0.75)) / 1024) });
          }, 'image/jpeg', quality);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadOfferImage(blob, userId, prefix = 'of') {
    if (!sbClient || !blob || !userId) {
      return { ok: false, url: '', error: 'يجب تسجيل الدخول لرفع الصور' };
    }
    try {
      const safeUid = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
      const safePre = String(prefix || 'of').replace(/[^a-zA-Z0-9_-]/g, '');
      const path = `${safeUid}/${safePre}_${Date.now()}_${Math.floor(Math.random() * 9999)}.jpg`;
      const { error } = await sbClient.storage.from(C.STORAGE_BUCKET).upload(path, blob, {
        contentType: 'image/jpeg',
        cacheControl: '604800',
        upsert: false
      });
      if (error) return { ok: false, url: '', error: error.message };
      const { data } = sbClient.storage.from(C.STORAGE_BUCKET).getPublicUrl(path);
      if (!data || !data.publicUrl) return { ok: false, url: '', error: 'تعذر توليد رابط الصورة' };
      return { ok: true, url: data.publicUrl, error: '' };
    } catch (err) {
      return { ok: false, url: '', error: (err && err.message) || 'تعذر رفع الصورة' };
    }
  }

  // ==================== GOOGLE OAUTH (PKCE) & CLOUD ACCOUNT ====================
  const isCapNative = () => Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());

  if (isCapNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('appUrlOpen', async (ev) => {
      const u = (ev && ev.url) || '';
      try {
        const parsed = new URL(u);
        if (parsed.protocol !== 'tn.kouthbayek.app:' || parsed.host !== 'callback') return;
        try { if (window.Capacitor.Plugins.Browser) await window.Capacitor.Plugins.Browser.close(); } catch (_) {}
        const code = parsed.searchParams.get('code');
        if (!code || !sbClient) return;
        const { error } = await sbClient.auth.exchangeCodeForSession(code);
        if (!error) window.location.reload();
      } catch (_) {}
    });
  }

  async function signInWithGoogle() {
    if (!sbClient) throw new Error('Supabase غير متصل');
    if (isCapNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
      const { data, error } = await sbClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'tn.kouthbayek.app://callback',
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' }
        }
      });
      if (error) throw error;
      if (data && data.url) await window.Capacitor.Plugins.Browser.open({ url: data.url });
      return;
    }
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await sbClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, queryParams: { prompt: 'select_account' } }
    });
    if (error) throw error;
  }

  async function getAuthUser() {
    if (!sbClient) return null;
    try {
      const { data } = await sbClient.auth.getUser();
      return (data && data.user) || null;
    } catch (_) {
      return null;
    }
  }

  async function fetchCloudAccount(userId) {
    if (!sbClient || !userId) return null;
    try {
      const { data, error } = await sbClient.from('kb_accounts')
        .select('user_id,email,display_name,role,phone,governorate,created_at,trial_ends_at')
        .eq('user_id', userId).maybeSingle();
      if (error || !data) return null;
      return {
        userId: data.user_id,
        email: data.email || '',
        name: data.display_name || '',
        role: data.role || 'advertiser',
        phone: cleanPhone(data.phone),
        gov: data.governorate || 'قابس',
        createdAt: Date.parse(data.created_at) || Date.now(),
        trialEndsAt: Date.parse(data.trial_ends_at) || (Date.now() + 60 * 24 * C.HR),
        verified: isValidTnPhone(data.phone)
      };
    } catch (_) {
      return null;
    }
  }

  async function saveCloudAccount(acc) {
    if (!sbClient || !acc.userId) return { ok: false, error: 'غير متصل' };
    const { data, error } = await sbClient.from('kb_accounts').upsert({
      user_id: acc.userId,
      email: acc.email || '',
      display_name: acc.name,
      role: acc.role,
      phone: acc.phone,
      governorate: acc.gov
    }, { onConflict: 'user_id' }).select('created_at,trial_ends_at').maybeSingle();
    return {
      ok: !error,
      error: error ? error.message : '',
      createdAt: data && data.created_at ? Date.parse(data.created_at) : acc.createdAt,
      trialEndsAt: data && data.trial_ends_at ? Date.parse(data.trial_ends_at) : acc.trialEndsAt
    };
  }

  async function signOutGoogle() {
    if (sbClient) { try { await sbClient.auth.signOut(); } catch (_) {} }
    lsRemove(STORE_KEYS.account);
  }

  async function deleteUserAccountAndData(userId) {
    if (sbClient && userId) {
      await Promise.allSettled([
        sbClient.from('kb_offers').delete().eq('user_id', userId),
        sbClient.from('kb_craftsmen').delete().eq('user_id', userId),
        sbClient.from('kb_emergencies').delete().eq('user_id', userId),
        sbClient.from('kb_accounts').delete().eq('user_id', userId)
      ]);
      try { await sbClient.auth.signOut(); } catch (_) {}
    }
    lsRemove(STORE_KEYS.account);
    lsRemove(STORE_KEYS.claimed);
  }

  // ==================== SYNC ====================
  const syncCache = { key: '', at: 0 };

  async function syncFromSupabase(state, force = false) {
    if (!sbClient) return false;
    const scopeKey = state.radius === 'gov' ? `gov:${state.gov}` : `r:${state.radius}`;
    if (!force && syncCache.key === scopeKey && (Date.now() - syncCache.at) < 90000) {
      return false;
    }
    try {
      const nowIso = new Date().toISOString();
      const since24h = new Date(Date.now() - 24 * C.HR).toISOString();
      const offerLimit = state.radius === 'gov' ? 80 : 150;

      let ofQ = sbClient.from('kb_offers')
        .select('id,title,price,prev_price,category,governorate,seller_name,phone,description,image_url,status,user_id,lat,lng,live_location,live_updated_at,created_at,expires_at')
        .eq('status', 'active')
        .gte('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(offerLimit);

      let crQ = sbClient.from('kb_craftsmen')
        .select('id,name,specialty,governorate,area,phone,description,rating,reviews_count,user_id,lat,lng')
        .order('rating', { ascending: false })
        .limit(100);

      let emQ = sbClient.from('kb_emergencies')
        .select('id,emergency_type,governorate,description,phone,image_url,lat,lng,created_at,status,user_id,claimed_by,craftsman_status')
        .in('status', ['open', 'claimed'])
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(60);

      if (state.radius === 'gov' && state.gov) {
        ofQ = ofQ.eq('governorate', state.gov);
        crQ = crQ.eq('governorate', state.gov);
        emQ = emQ.eq('governorate', state.gov);
      }

      const [ofRes, crRes, emRes] = await Promise.all([ofQ, crQ, emQ]);
      syncCache.key = scopeKey;
      syncCache.at = Date.now();

      if (!ofRes.error && Array.isArray(ofRes.data)) {
        state.offers = ofRes.data.map((r) => ({
          id: r.id, title: r.title, price: Number(r.price),
          prevPrice: r.prev_price != null ? Number(r.prev_price) : null,
          cat: r.category, gov: r.governorate, seller: r.seller_name, phone: r.phone,
          desc: r.description || '', imageUrl: r.image_url || '',
          status: r.status || 'active', userId: r.user_id || '',
          lat: Number(r.lat), lng: Number(r.lng),
          liveLocation: Boolean(r.live_location),
          liveUpdatedAt: r.live_updated_at ? Date.parse(r.live_updated_at) : null,
          createdAt: Date.parse(r.created_at) || Date.now(),
          expiresAt: Date.parse(r.expires_at) || (Date.now() + C.OFFER_TTL_HOURS * C.HR)
        }));
      }
      if (!crRes.error && Array.isArray(crRes.data)) {
        state.crafts = crRes.data.map((r) => ({
          id: r.id, name: r.name, spec: r.specialty, gov: r.governorate,
          area: r.area || '', rating: Number(r.rating || 5), reviews: Number(r.reviews_count || 1),
          phone: r.phone, note: r.description || '', userId: r.user_id || '',
          lat: Number(r.lat), lng: Number(r.lng)
        }));
      }
      if (!emRes.error && Array.isArray(emRes.data)) {
        state.emergencies = emRes.data.map((r) => ({
          id: r.id, type: r.emergency_type, gov: r.governorate, desc: r.description,
          phone: r.phone || '', imageUrl: r.image_url || '',
          lat: Number(r.lat), lng: Number(r.lng),
          createdAt: Date.parse(r.created_at) || Date.now(),
          status: r.status || 'open',
          userId: r.user_id || '',
          claimedBy: r.claimed_by || '',
          craftsmanStatus: r.craftsman_status || 'pending'
        }));
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  async function pushOffer(o) {
    if (!sbClient) return { ok: false, id: o.id, error: 'غير متصل بالخادم' };
    try {
      const { data, error } = await sbClient.from('kb_offers').insert({
        title: o.title, price: o.price, prev_price: null, category: o.cat, governorate: o.gov,
        seller_name: o.seller, phone: o.phone, description: o.desc || '',
        image_url: o.imageUrl || null, status: 'active',
        user_id: o.userId || null, lat: o.lat, lng: o.lng,
        live_location: Boolean(o.liveLocation),
        live_updated_at: o.liveLocation ? new Date().toISOString() : null,
        expires_at: new Date(o.expiresAt).toISOString()
      }).select('id').single();
      syncCache.at = 0;
      return { ok: !error, id: (data && data.id) || o.id, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, id: o.id, error: (err && err.message) || 'خطأ في الاتصال' };
    }
  }

  async function markOfferSold(offerId, userId) {
    if (!sbClient || !userId) return { ok: false, error: 'يجب تسجيل الدخول' };
    try {
      const { error } = await sbClient.from('kb_offers')
        .update({ status: 'sold', live_location: false })
        .eq('id', offerId)
        .eq('user_id', userId);
      syncCache.at = 0;
      return { ok: !error, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'تعذر التحديث' };
    }
  }

  async function updateOfferPrice(offerId, userId, newPrice, oldPrice) {
    if (!sbClient || !userId) return { ok: false, error: 'يجب تسجيل الدخول' };
    try {
      const prevPrice = newPrice < oldPrice ? oldPrice : null;
      const { error } = await sbClient.from('kb_offers')
        .update({ price: newPrice, prev_price: prevPrice })
        .eq('id', offerId)
        .eq('user_id', userId);
      syncCache.at = 0;
      return { ok: !error, prevPrice, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, prevPrice: null, error: (err && err.message) || 'تعذر تعديل السعر' };
    }
  }

  async function updateOfferLiveLocation(offerId, userId, lat, lng, isLive) {
    if (!sbClient || !userId) return { ok: false, error: 'يجب تسجيل الدخول' };
    try {
      const patch = isLive
        ? { lat, lng, live_location: true, live_updated_at: new Date().toISOString() }
        : { live_location: false };
      const { error } = await sbClient.from('kb_offers')
        .update(patch)
        .eq('id', offerId)
        .eq('user_id', userId);
      syncCache.at = 0;
      return { ok: !error, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'تعذر تحديث الموقع' };
    }
  }

  async function pushCraft(c) {
    if (!sbClient) return { ok: false, error: 'غير متصل بالخادم' };
    try {
      const { data, error } = await sbClient.from('kb_craftsmen').insert({
        name: c.name, specialty: c.spec, governorate: c.gov, area: c.area,
        phone: c.phone, description: c.note,
        user_id: c.userId || null, lat: c.lat, lng: c.lng
      }).select('id').single();
      syncCache.at = 0;
      return { ok: !error, id: (data && data.id) || c.id, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'خطأ في الاتصال' };
    }
  }

  async function updateCraft(c, userId) {
    if (!sbClient || !userId) return { ok: false, error: 'يجب تسجيل الدخول' };
    try {
      const { error } = await sbClient.from('kb_craftsmen').update({
        name: c.name,
        specialty: c.spec,
        governorate: c.gov,
        area: c.area,
        phone: c.phone,
        description: c.note,
        lat: c.lat,
        lng: c.lng
      }).eq('id', c.id).eq('user_id', userId);
      syncCache.at = 0;
      return { ok: !error, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'تعذر تعديل بطاقة الحرفي' };
    }
  }

  async function deleteCraft(craftId, userId) {
    if (!sbClient || !userId) return { ok: false, error: 'يجب تسجيل الدخول' };
    try {
      const { error } = await sbClient.from('kb_craftsmen')
        .delete()
        .eq('id', craftId)
        .eq('user_id', userId);
      syncCache.at = 0;
      return { ok: !error, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'تعذر حذف بطاقة الحرفي' };
    }
  }

  async function pushEmergency(e) {
    if (!sbClient) return { ok: false, id: e.id, error: 'غير متصل بالخادم' };
    try {
      const { data, error } = await sbClient.from('kb_emergencies').insert({
        emergency_type: e.type, governorate: e.gov, description: e.desc,
        phone: e.phone || null, image_url: e.imageUrl || null,
        lat: e.lat, lng: e.lng, status: 'open',
        user_id: e.userId || null, craftsman_status: 'pending'
      }).select('id').single();
      syncCache.at = 0;
      return { ok: !error, id: (data && data.id) || e.id, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, id: e.id, error: (err && err.message) || 'خطأ في الاتصال' };
    }
  }

  async function claimEmergencyAtomic(emergId, userId) {
    if (!sbClient || !userId) return { ok: false, alreadyClaimed: false, error: 'يجب تسجيل الدخول' };
    try {
      const { data, error } = await sbClient
        .from('kb_emergencies')
        .update({ status: 'claimed', claimed_by: userId, claimed_at: new Date().toISOString(), craftsman_status: 'in_progress' })
        .eq('id', emergId)
        .eq('status', 'open')
        .select('id');
      syncCache.at = 0;
      if (error) return { ok: false, alreadyClaimed: false, error: error.message };
      if (!data || !data.length) return { ok: false, alreadyClaimed: true, error: '' };
      return { ok: true, alreadyClaimed: false, error: '' };
    } catch (err) {
      return { ok: false, alreadyClaimed: false, error: (err && err.message) || 'خطأ في الاتصال' };
    }
  }

  async function markEmergencyCraftsmanStatus(emergId, userId, outcome) {
    if (!sbClient || !userId) return { ok: false, error: 'يجب تسجيل الدخول' };
    try {
      const patch = outcome === 'completed'
        ? { craftsman_status: 'completed' }
        : { status: 'open', claimed_by: null, claimed_at: null, craftsman_status: 'pending' };
      const { error } = await sbClient
        .from('kb_emergencies')
        .update(patch)
        .eq('id', emergId)
        .eq('claimed_by', userId);
      syncCache.at = 0;
      return { ok: !error, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'تعذر التحديث' };
    }
  }

  async function confirmEmergencyOwner(emergId, userId) {
    if (!sbClient || !userId) return { ok: false, error: 'يجب تسجيل الدخول' };
    try {
      const { error } = await sbClient
        .from('kb_emergencies')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', emergId)
        .eq('user_id', userId);
      syncCache.at = 0;
      return { ok: !error, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'تعذر تأكيد التنفيذ' };
    }
  }

  async function reopenEmergencyOwner(emergId, userId) {
    if (!sbClient || !userId) return { ok: false, error: 'يجب تسجيل الدخول' };
    try {
      const { error } = await sbClient
        .from('kb_emergencies')
        .update({ status: 'open', claimed_by: null, claimed_at: null, craftsman_status: 'pending' })
        .eq('id', emergId)
        .eq('user_id', userId);
      syncCache.at = 0;
      return { ok: !error, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'تعذر إعادة فتح البلاغ' };
    }
  }

  async function submitReport(targetType, targetId, reason, reporterId) {
    if (!sbClient) return { ok: false, error: 'غير متصل بالخادم' };
    try {
      const { error } = await sbClient.from('kb_reports').insert({
        target_type: targetType,
        target_id: String(targetId),
        reason: String(reason || '').slice(0, 300),
        reporter_user_id: reporterId || null
      });
      return { ok: !error, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'تعذر إرسال البلاغ' };
    }
  }

  // إرسال رسالة خاصة إلى الإدارة عبر Supabase دون كشف أي بريد إلكتروني
  async function submitAdminMessage(payload) {
    if (!sbClient) return { ok: false, error: 'غير متصل بالخادم حالياً.' };
    const msg = String((payload && payload.message) || '').trim();
    if (msg.length < 5) {
      return { ok: false, error: 'يرجى كتابة رسالة واضحة (5 أحرف على الأقل).' };
    }
    const rawPhone = String((payload && payload.senderPhone) || '').trim();
    const cleanedPhone = rawPhone ? cleanPhone(rawPhone) : '';
    if (rawPhone && !isValidTnPhone(cleanedPhone)) {
      return { ok: false, error: 'رقم الهاتف التونسي غير صحيح (8 أرقام أو اتركه فارغاً).' };
    }
    try {
      const { error } = await sbClient.from('kb_messages').insert({
        topic: String((payload && payload.topic) || 'استفسار عام').slice(0, 100),
        sender_name: String((payload && payload.senderName) || '').trim().slice(0, 100),
        sender_phone: cleanedPhone,
        message: msg.slice(0, 1500),
        sender_user_id: (payload && payload.userId) || null,
        source_page: String((payload && payload.sourcePage) || 'app').slice(0, 30),
        status: 'unread'
      });
      return { ok: !error, error: error ? error.message : '' };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'تعذر إرسال الرسالة، حاول مجدداً.' };
    }
  }

  let realtimeChannel = null;
  function subscribeEmergencies(onChange) {
    if (!sbClient || realtimeChannel) return;
    try {
      realtimeChannel = sbClient
        .channel('kb_emergencies_live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kb_emergencies' }, () => {
          syncCache.at = 0;
          if (typeof onChange === 'function') onChange();
        })
        .subscribe();
    } catch (_) {}
  }

  if (!isCapNative() && 'serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  return {
    STORE_KEYS,
    isSupabaseConnected: () => Boolean(sbClient),
    lsGet, lsSet, lsRemove,
    escHtml, normalizeAr, checkContentModeration, cleanPhone, isValidTnPhone,
    haversineKm, getGovObj, detectNearestGov,
    formatRemaining, formatAgo, getMarketCatInfo, getCraftCatInfo,
    compressImageFile, uploadOfferImage,
    signInWithGoogle, getAuthUser, fetchCloudAccount, saveCloudAccount, signOutGoogle, deleteUserAccountAndData,
    syncFromSupabase, pushOffer, markOfferSold, updateOfferPrice, updateOfferLiveLocation,
    pushCraft, updateCraft, deleteCraft, pushEmergency, claimEmergencyAtomic, markEmergencyCraftsmanStatus,
    confirmEmergencyOwner, reopenEmergencyOwner, submitReport, submitAdminMessage, subscribeEmergencies
  };
})();
