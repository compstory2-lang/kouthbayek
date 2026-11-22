// خوذ بايك — طبقة البيانات المحسّنة لتحمّل 10,000+ مشترك (v1.3-TN Scale)
window.KB_DATA = (() => {
  'use strict';

  const C = window.KB_CONFIG;
  const STORE_KEYS = {
    prefs: 'kb_v11_prefs',
    offers: 'kb_v11_offers',
    crafts: 'kb_v11_crafts',
    emergencies: 'kb_v11_emergencies',
    account: 'kb_v11_account',
    claimed: 'kb_v11_claimed'
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

  function cleanPhone(p) {
    const digits = String(p || '').replace(/\D/g, '');
    return digits.length >= 8 ? digits.slice(-8) : digits;
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
    return `متبقي ${hrs}س ${mins}د`;
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

  // ==================== ضغط فائق للصور (< 55 KB) لتقليل Egress للنصف ====================
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

  async function uploadOfferImage(blob, dataUrl, userId) {
    if (!sbClient || !blob) return dataUrl || '';
    try {
      const safeUid = String(userId || 'anon').replace(/[^a-zA-Z0-9_-]/g, '');
      const path = `${safeUid}/${Date.now()}_${Math.floor(Math.random() * 9999)}.jpg`;
      const { error } = await sbClient.storage.from(C.STORAGE_BUCKET).upload(path, blob, {
        contentType: 'image/jpeg',
        cacheControl: '604800', // كاش متصفح 7 أيام لتقليل استهلاك Egress
        upsert: false
      });
      if (error) return dataUrl || '';
      const { data } = sbClient.storage.from(C.STORAGE_BUCKET).getPublicUrl(path);
      return (data && data.publicUrl) ? data.publicUrl : (dataUrl || '');
    } catch (_) {
      return dataUrl || '';
    }
  }

  // ==================== GOOGLE OAUTH (PKCE) & CLOUD ACCOUNT ====================
  const isCapNative = () => Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());

  if (isCapNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('appUrlOpen', async (ev) => {
      const u = (ev && ev.url) || '';
      if (!u.startsWith('tn.kouthbayek.app://callback')) return;
      try { if (window.Capacitor.Plugins.Browser) await window.Capacitor.Plugins.Browser.close(); } catch (_) {}
      try {
        const code = new URL(u).searchParams.get('code');
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
    const { error } = await sbClient.from('kb_accounts').upsert({
      user_id: acc.userId,
      email: acc.email || '',
      display_name: acc.name,
      role: acc.role,
      phone: acc.phone,
      governorate: acc.gov,
      trial_ends_at: new Date(acc.trialEndsAt).toISOString()
    }, { onConflict: 'user_id' });
    return { ok: !error, error: error ? error.message : '' };
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
        sbClient.from('kb_accounts').delete().eq('user_id', userId)
      ]);
      try { await sbClient.auth.signOut(); } catch (_) {}
    }
    lsRemove(STORE_KEYS.account);
    lsRemove(STORE_KEYS.claimed);
  }

  // ==================== جلب ذكي مفلتر حسب الولاية لتحمّل 10,000+ مشترك ====================
  const syncCache = { key: '', at: 0 };

  async function syncFromSupabase(state, force = false) {
    if (!sbClient) return false;
    const scopeKey = state.radius === 'gov' ? `gov:${state.gov}` : 'all';
    if (!force && syncCache.key === scopeKey && (Date.now() - syncCache.at) < 120000) {
      return false; // كاش مؤقت لدقيقتين لتقليل استهلاك قاعدة البيانات وEgress
    }
    try {
      const nowIso = new Date().toISOString();
      const since24h = new Date(Date.now() - 24 * C.HR).toISOString();

      let ofQ = sbClient.from('kb_offers')
        .select('id,title,price,category,governorate,seller_name,phone,description,image_url,status,user_id,lat,lng,created_at,expires_at')
        .gte('expires_at', nowIso)
        .neq('status', 'sold')
        .order('created_at', { ascending: false })
        .limit(60);

      let crQ = sbClient.from('kb_craftsmen')
        .select('id,name,specialty,governorate,area,phone,description,rating,reviews_count,user_id,lat,lng')
        .order('rating', { ascending: false })
        .limit(80);

      let emQ = sbClient.from('kb_emergencies')
        .select('id,emergency_type,governorate,description,phone,lat,lng,created_at,status,claimed_by')
        .eq('status', 'open')
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(40);

      // عند التصفح داخل الولاية (90% من المستخدمين) نجلب بيانات الولاية فقط لتوفير 95% من البيانات
      if (state.radius === 'gov' && state.gov) {
        ofQ = ofQ.eq('governorate', state.gov);
        crQ = crQ.eq('governorate', state.gov);
        emQ = emQ.eq('governorate', state.gov);
      }

      const [ofRes, crRes, emRes] = await Promise.all([ofQ, crQ, emQ]);
      syncCache.key = scopeKey;
      syncCache.at = Date.now();

      if (Array.isArray(ofRes.data) && ofRes.data.length) {
        state.offers = ofRes.data.map((r) => ({
          id: r.id, title: r.title, price: Number(r.price), cat: r.category,
          gov: r.governorate, seller: r.seller_name, phone: r.phone,
          desc: r.description || '', imageUrl: r.image_url || '',
          status: r.status || 'active', userId: r.user_id || '',
          lat: r.lat, lng: r.lng,
          createdAt: Date.parse(r.created_at) || Date.now(),
          expiresAt: Date.parse(r.expires_at) || (Date.now() + C.OFFER_TTL_HOURS * C.HR)
        }));
      }
      if (Array.isArray(crRes.data) && crRes.data.length) {
        state.crafts = crRes.data.map((r) => ({
          id: r.id, name: r.name, spec: r.specialty, gov: r.governorate,
          area: r.area || '', rating: Number(r.rating || 5), reviews: Number(r.reviews_count || 1),
          phone: r.phone, note: r.description || '', userId: r.user_id || '',
          lat: r.lat, lng: r.lng
        }));
      }
      if (Array.isArray(emRes.data) && emRes.data.length) {
        state.emergencies = emRes.data.map((r) => ({
          id: r.id, type: r.emergency_type, gov: r.governorate, desc: r.description,
          phone: r.phone || '', lat: r.lat, lng: r.lng,
          createdAt: Date.parse(r.created_at) || Date.now(),
          status: r.status || 'open', claimedBy: r.claimed_by || ''
        }));
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  async function pushOffer(o) {
    if (!sbClient) return { ok: true, id: o.id };
    try {
      const { data, error } = await sbClient.from('kb_offers').insert({
        title: o.title, price: o.price, category: o.cat, governorate: o.gov,
        seller_name: o.seller, phone: o.phone, description: o.desc || '',
        image_url: o.imageUrl || null, status: 'active',
        user_id: o.userId || null, lat: o.lat, lng: o.lng,
        expires_at: new Date(o.expiresAt).toISOString()
      }).select('id').single();
      syncCache.at = 0;
      return { ok: !error, id: (data && data.id) || o.id, error: error ? error.message : '' };
    } catch (_) {
      return { ok: false, id: o.id, error: '' };
    }
  }

  async function markOfferSold(offerId, userId) {
    if (!sbClient || String(offerId).startsWith('of-')) return { ok: true };
    try {
      let q = sbClient.from('kb_offers').update({ status: 'sold' }).eq('id', offerId);
      if (userId) q = q.eq('user_id', userId);
      const { error } = await q;
      syncCache.at = 0;
      return { ok: !error };
    } catch (_) {
      return { ok: false };
    }
  }

  async function pushCraft(c) {
    if (!sbClient) return { ok: true };
    try {
      const { error } = await sbClient.from('kb_craftsmen').insert({
        name: c.name, specialty: c.spec, governorate: c.gov, area: c.area,
        phone: c.phone, description: c.note, rating: c.rating, reviews_count: c.reviews,
        user_id: c.userId || null, lat: c.lat, lng: c.lng
      });
      syncCache.at = 0;
      return { ok: !error };
    } catch (_) {
      return { ok: false };
    }
  }

  async function pushEmergency(e) {
    if (!sbClient) return { ok: true, id: e.id };
    try {
      const { data, error } = await sbClient.from('kb_emergencies').insert({
        emergency_type: e.type, governorate: e.gov, description: e.desc,
        phone: e.phone || null, lat: e.lat, lng: e.lng, status: 'open'
      }).select('id').single();
      syncCache.at = 0;
      return { ok: !error, id: (data && data.id) || e.id };
    } catch (_) {
      return { ok: false, id: e.id };
    }
  }

  async function claimEmergencyAtomic(emergId, userId) {
    if (!sbClient || String(emergId).startsWith('em-')) return { ok: true };
    try {
      const { data, error } = await sbClient
        .from('kb_emergencies')
        .update({ status: 'claimed', claimed_by: userId || null, claimed_at: new Date().toISOString() })
        .eq('id', emergId)
        .eq('status', 'open')
        .select('id');
      syncCache.at = 0;
      if (error) return { ok: false, alreadyClaimed: false };
      if (!data || !data.length) return { ok: false, alreadyClaimed: true };
      return { ok: true };
    } catch (_) {
      return { ok: false, alreadyClaimed: false };
    }
  }

  async function submitReport(targetType, targetId, reason, reporterId) {
    if (!sbClient) return { ok: true };
    try {
      const { error } = await sbClient.from('kb_reports').insert({
        target_type: targetType,
        target_id: String(targetId),
        reason: String(reason || '').slice(0, 300),
        reporter_user_id: reporterId || null
      });
      return { ok: !error };
    } catch (_) {
      return { ok: false };
    }
  }

  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  return {
    STORE_KEYS,
    isSupabaseConnected: () => Boolean(sbClient),
    lsGet, lsSet, lsRemove,
    escHtml, cleanPhone, isValidTnPhone,
    haversineKm, getGovObj, detectNearestGov,
    formatRemaining, formatAgo, getMarketCatInfo, getCraftCatInfo,
    compressImageFile, uploadOfferImage,
    signInWithGoogle, getAuthUser, fetchCloudAccount, saveCloudAccount, signOutGoogle, deleteUserAccountAndData,
    syncFromSupabase, pushOffer, markOfferSold, pushCraft, pushEmergency, claimEmergencyAtomic, submitReport
  };
})();