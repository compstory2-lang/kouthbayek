(function () {
  const cfg = window.APP_CONFIG || {};
  const sbCfg = cfg.supabase || {};
  let client = null;

  if (
    typeof window.supabase !== 'undefined' &&
    sbCfg.url &&
    sbCfg.anonKey &&
    !sbCfg.anonKey.includes('ضع_هنا') &&
    !sbCfg.anonKey.includes('...')
  ) {
    try {
      client = window.supabase.createClient(sbCfg.url, sbCfg.anonKey);
    } catch (_) {
      client = null;
    }
  }

  function getList(key) {
    try {
      const raw = localStorage.getItem(`kb_${key}`);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveList(key, arr) {
    try {
      localStorage.setItem(`kb_${key}`, JSON.stringify(Array.isArray(arr) ? arr : []));
    } catch (_) {}
  }

  async function fetchRemoteTable(table, localKey) {
    if (!client) return getList(localKey);
    try {
      const { data, error } = await client.from(table).select('*').limit(100);
      if (error || !Array.isArray(data)) return getList(localKey);
      if (data.length > 0) {
        saveList(localKey, data);
        return data;
      }
      return getList(localKey);
    } catch (_) {
      return getList(localKey);
    }
  }

  window.AppStorage = {
    getClient: () => client,
    getList,
    saveList,
    fetchOffers: () => fetchRemoteTable('offers', 'offers'),
    fetchProviders: () => fetchRemoteTable('providers', 'providers'),
    fetchEmergencies: () => fetchRemoteTable('emergencies', 'emergencies')
  };
})();
