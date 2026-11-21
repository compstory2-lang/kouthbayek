// خوذ بايك — طبقة البيانات والحفظ المحلي والمزامنة مع Supabase
window.KB_DATA = (() => {
  'use strict';

  const C = window.KB_CONFIG;
  const STORE_KEYS = {
    prefs: 'kb_v1_prefs',
    offers: 'kb_v1_offers',
    crafts: 'kb_v1_crafts',
    emergencies: 'kb_v1_emergencies',
    account: 'kb_v1_account'
  };

  let sbClient = null;
  if (C.SUPABASE.url && C.SUPABASE.anonKey && window.supabase && typeof window.supabase.createClient === 'function') {
    sbClient = window.supabase.createClient(C.SUPABASE.url, C.SUPABASE.anonKey);
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
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (_) {}
  }

  function lsRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
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
    return String(p || '').replace(/\D/g, '').slice(-8);
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
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `متبقي ${hrs}س ${mins}د`;
  }

  function formatAgo(ts) {
    const mins = Math.max(1, Math.floor((Date.now() - ts) / 60000));
    if (mins < 60) return `منذ ${mins} دق`;
    const hrs = Math.floor(mins / 60);
    return `منذ ${hrs} سا`;
  }

  function getMarketCatInfo(id) {
    return C.MARKET_CATS.find((c) => c.id === id) || C.MARKET_CATS[0];
  }

  function getCraftCatInfo(id) {
    return C.CRAFT_CATS.find((c) => c.id === id) || C.CRAFT_CATS[0];
  }

  // مزامنة اختيارية مع Supabase عند توفر الرابط والمفتاح
  async function syncFromSupabase(state) {
    if (!sbClient) return false;
    try {
      const since24h = new Date(Date.now() - 24 * C.HR).toISOString();
      const [ofRes, crRes, emRes] = await Promise.all([
        sbClient.from('kb_offers').select('*').gte('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(100),
        sbClient.from('kb_craftsmen').select('*').order('rating', { ascending: false }).limit(100),
        sbClient.from('kb_emergencies').select('*').eq('status', 'open').gte('created_at', since24h).order('created_at', { ascending: false }).limit(100)
      ]);
      if (Array.isArray(ofRes.data) && ofRes.data.length) {
        state.offers = ofRes.data.map((r) => ({
          id: r.id, title: r.title, price: Number(r.price), cat: r.category,
          gov: r.governorate, seller: r.seller_name, phone: r.phone,
          lat: r.lat, lng: r.lng,
          createdAt: Date.parse(r.created_at) || Date.now(),
          expiresAt: Date.parse(r.expires_at) || (Date.now() + 24 * C.HR)
        }));
      }
      if (Array.isArray(crRes.data) && crRes.data.length) {
        state.crafts = crRes.data.map((r) => ({
          id: r.id, name: r.name, spec: r.specialty, gov: r.governorate,
          area: r.area || '', rating: Number(r.rating || 5), reviews: Number(r.reviews_count || 1),
          phone: r.phone, note: r.description || '', lat: r.lat, lng: r.lng
        }));
      }
      if (Array.isArray(emRes.data) && emRes.data.length) {
        state.emergencies = emRes.data.map((r) => ({
          id: r.id, type: r.emergency_type, gov: r.governorate, desc: r.description,
          phone: r.phone || '', lat: r.lat, lng: r.lng,
          createdAt: Date.parse(r.created_at) || Date.now(), status: r.status || 'open'
        }));
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  async function pushOffer(o) {
    if (!sbClient) return;
    try {
      await sbClient.from('kb_offers').insert({
        title: o.title, price: o.price, category: o.cat, governorate: o.gov,
        seller_name: o.seller, phone: o.phone, lat: o.lat, lng: o.lng,
        expires_at: new Date(o.expiresAt).toISOString()
      });
    } catch (_) {}
  }

  async function pushCraft(c) {
    if (!sbClient) return;
    try {
      await sbClient.from('kb_craftsmen').insert({
        name: c.name, specialty: c.spec, governorate: c.gov, area: c.area,
        phone: c.phone, description: c.note, rating: c.rating, reviews_count: c.reviews,
        lat: c.lat, lng: c.lng
      });
    } catch (_) {}
  }

  async function pushEmergency(e) {
    if (!sbClient) return;
    try {
      await sbClient.from('kb_emergencies').insert({
        emergency_type: e.type, governorate: e.gov, description: e.desc,
        phone: e.phone || null, lat: e.lat, lng: e.lng, status: 'open'
      });
    } catch (_) {}
  }

  // تسجيل الـ Service Worker الموحد
  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  return {
    STORE_KEYS,
    isSupabaseConnected: () => Boolean(sbClient),
    lsGet,
    lsSet,
    lsRemove,
    escHtml,
    cleanPhone,
    haversineKm,
    getGovObj,
    detectNearestGov,
    formatRemaining,
    formatAgo,
    getMarketCatInfo,
    getCraftCatInfo,
    syncFromSupabase,
    pushOffer,
    pushCraft,
    pushEmergency
  };
})();
