window.APP_STORAGE = (() => {
  const SESSION_KEY = 'khoudh_bayek_provider_v1';
  const LOC_KEY = 'khoudh_bayek_loc_v1';

  let client = null;
  if (
    window.supabase &&
    window.APP_CONFIG?.supabase?.url &&
    window.APP_CONFIG?.supabase?.anonKey &&
    !window.APP_CONFIG.supabase.anonKey.includes('...')
  ) {
    client = window.supabase.createClient(
      window.APP_CONFIG.supabase.url,
      window.APP_CONFIG.supabase.anonKey
    );
  }

  function isReady() {
    return Boolean(client);
  }

  function getSavedLocation() {
    try {
      const raw = localStorage.getItem(LOC_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveLocation(loc) {
    try {
      localStorage.setItem(LOC_KEY, JSON.stringify(loc));
    } catch (_) {}
  }

  function getSessionProvider() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setSessionProvider(provider) {
    try {
      if (provider) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(provider));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (_) {}
  }

  function getTrialDaysLeft(provider) {
    if (!provider?.trial_ends_at) return window.APP_CONFIG.trialDays || 60;
    const diffMs = new Date(provider.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  async function uploadImageFile(fileOrBlob, folder = 'offers') {
    if (!client) throw new Error('قاعدة البيانات غير متصلة بعد');
    const bucket = window.APP_CONFIG.storageBucket || 'khoudh-bayek-media';
    const ext = folder === 'selfies' ? 'jpg' : (fileOrBlob.name?.split('.').pop() || 'jpg');
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await client.storage.from(bucket).upload(fileName, fileOrBlob, {
      contentType: folder === 'selfies' ? 'image/jpeg' : (fileOrBlob.type || 'image/jpeg'),
      upsert: false
    });
    if (error) throw error;

    const { data } = client.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function loginOrRegisterProvider(payload) {
    if (!client) throw new Error('يرجى ضبط مفتاح Supabase في js/config.js');
    const phone = String(payload.phone || '').trim();
    const pin = String(payload.pin || '').trim();

    const { data: existing, error: findErr } = await client
      .from('providers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (findErr) throw findErr;

    if (existing) {
      if (existing.pin_code !== pin) {
        throw new Error('الرمز السري غير صحيح لهذا الرقم');
      }
      setSessionProvider(existing);
      return { provider: existing, isNew: false };
    }

    const trialDays = window.APP_CONFIG.trialDays || 60;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    const insertObj = {
      phone,
      pin_code: pin,
      name: payload.name,
      kind: payload.kind,
      section: payload.section,
      category_id: payload.category_id,
      governorate: payload.governorate,
      district: payload.district || '',
      lat: payload.lat,
      lng: payload.lng,
      selfie_url: payload.selfie_url || null,
      phone_verified: false,
      verified: false,
      trial_ends_at: trialEndsAt
    };

    const { data: created, error: insErr } = await client
      .from('providers')
      .insert(insertObj)
      .select('*')
      .single();

    if (insErr) throw insErr;
    setSessionProvider(created);
    return { provider: created, isNew: true };
  }

  async function refreshCurrentProvider() {
    const current = getSessionProvider();
    if (!client || !current?.id) return current;
    const { data, error } = await client
      .from('providers')
      .select('*')
      .eq('id', current.id)
      .maybeSingle();
    if (!error && data) {
      setSessionProvider(data);
      return data;
    }
    return current;
  }

  async function attachSelfieToProvider(providerId, selfieUrl) {
    if (!client) throw new Error('قاعدة البيانات غير متصلة');
    const { data, error } = await client
      .from('providers')
      .update({ selfie_url: selfieUrl })
      .eq('id', providerId)
      .select('*')
      .single();
    if (error) throw error;
    setSessionProvider(data);
    return data;
  }

  async function markPhoneVerified(providerId) {
    if (!client) throw new Error('قاعدة البيانات غير متصلة');
    const { data, error } = await client
      .from('providers')
      .update({ phone_verified: true })
      .eq('id', providerId)
      .select('*')
      .single();
    if (error) throw error;
    setSessionProvider(data);
    return data;
  }

  async function fetchProviders() {
    if (!client) return [];
    const { data, error } = await client
      .from('providers')
      .select('*')
      .order('verified', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      console.error('fetchProviders:', error);
      return [];
    }
    return data || [];
  }

  async function fetchActiveOffers() {
    if (!client) return [];
    const nowIso = new Date().toISOString();
    const { data, error } = await client
      .from('offers')
      .select('*')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('fetchActiveOffers:', error);
      return [];
    }
    return data || [];
  }

  async function createOffer(offerPayload) {
    if (!client) throw new Error('قاعدة البيانات غير متصلة');
    const hours = window.APP_CONFIG.offerHours || 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await client
      .from('offers')
      .insert({
        ...offerPayload,
        expires_at: expiresAt
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async function fetchOpenEmergencies() {
    if (!client) return [];
    const nowIso = new Date().toISOString();
    const { data, error } = await client
      .from('emergencies')
      .select('*')
      .eq('status', 'open')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('fetchOpenEmergencies:', error);
      return [];
    }
    return data || [];
  }

  async function createEmergency(emPayload) {
    if (!client) throw new Error('قاعدة البيانات غير متصلة');
    const hours = window.APP_CONFIG.emergencyHours || 6;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await client
      .from('emergencies')
      .insert({
        ...emPayload,
        status: 'open',
        expires_at: expiresAt
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async function closeEmergencySafely(emergencyId) {
    if (!client) throw new Error('قاعدة البيانات غير متصلة');
    const { error } = await client
      .from('emergencies')
      .update({ status: 'closed', phone: null })
      .eq('id', emergencyId)
      .eq('status', 'open');

    if (error) throw error;
  }

  return {
    isReady,
    getSavedLocation,
    saveLocation,
    getSessionProvider,
    setSessionProvider,
    getTrialDaysLeft,
    uploadImageFile,
    loginOrRegisterProvider,
    refreshCurrentProvider,
    attachSelfieToProvider,
    markPhoneVerified,
    fetchProviders,
    fetchActiveOffers,
    createOffer,
    fetchOpenEmergencies,
    createEmergency,
    closeEmergencySafely
  };
})();
