// خوذ بايك — وحدة لوحة الإدارة الكاملة (admin.js: المراقبة، المسجّلين، الرسائل، رادار البلاغات، توثيق الحرفيين، إدارة العروض)
(() => {
  'use strict';

  const C = window.KB_CONFIG || {};
  const D = window.KB_DATA || {};
  const $ = (id) => document.getElementById(id);

  let sbClient = null;
  let adminState = {
    isAdmin: false,
    activeSubTab: 'messages',
    accounts: [],
    messages: [],
    reports: [],
    craftsmen: [],
    offers: [],
    emergencies: [],
    loading: false
  };

  function getSupabase() {
    if (sbClient) return sbClient;
    const url = (C.SUPABASE && C.SUPABASE.url) || C.SUPABASE_URL;
    const key = (C.SUPABASE && C.SUPABASE.anonKey) || C.SUPABASE_ANON_KEY;
    if (window.supabase && url && key) {
      sbClient = window.supabase.createClient(url, key, {
        auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
      });
    }
    return sbClient;
  }

  function esc(str) {
    return typeof D.escHtml === 'function'
      ? D.escHtml(str)
      : String(str == null ? '' : str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
  }

  function fmtDate(val) {
    if (!val) return '';
    try {
      const d = new Date(val);
      return d.toLocaleString('ar-TN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return String(val);
    }
  }

  function toast(msg) {
    const el = $('kbToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3600);
  }

  async function checkIsAdmin() {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { data: userData } = await sb.auth.getUser();
      const user = userData && userData.user;
      if (!user) return false;

      const email = String(user.email || '').toLowerCase();
      const uid = String(user.id || '');
      const adminEmails = Array.isArray(C.ADMIN_EMAILS) ? C.ADMIN_EMAILS.map((x) => String(x).toLowerCase()) : [];
      if (!adminEmails.includes('jabeurj011@gmail.com')) adminEmails.push('jabeurj011@gmail.com');
      const adminIds = Array.isArray(C.ADMIN_USER_IDS) ? C.ADMIN_USER_IDS.map(String) : [];

      if ((uid && adminIds.includes(uid)) || (email && adminEmails.includes(email))) {
        return true;
      }

      const { data: rpcRes, error } = await sb.rpc('is_kb_admin');
      if (!error && rpcRes === true) return true;
    } catch (_) {}
    return false;
  }

  async function loadAdminData() {
    const sb = getSupabase();
    if (!sb || !adminState.isAdmin) return;
    adminState.loading = true;
    renderAdminPanel();

    try {
      const [accRes, msgRes, repRes, crRes, ofRes, emRes] = await Promise.all([
        sb.from('kb_accounts').select('user_id,display_name,role,phone,governorate,created_at').order('created_at', { ascending: false }).limit(300),
        sb.from('kb_messages').select('*').order('created_at', { ascending: false }).limit(50),
        sb.from('kb_reports').select('*').order('created_at', { ascending: false }).limit(80),
        sb.from('kb_craftsmen').select('*').order('created_at', { ascending: false }).limit(150),
        sb.from('kb_offers').select('*').in('status', ['active', 'sold']).order('created_at', { ascending: false }).limit(150),
        sb.from('kb_emergencies').select('*').in('status', ['open', 'claimed']).order('created_at', { ascending: false }).limit(60)
      ]);

      adminState.accounts = (!accRes.error && Array.isArray(accRes.data)) ? accRes.data : [];
      adminState.messages = (!msgRes.error && Array.isArray(msgRes.data)) ? msgRes.data : [];
      adminState.reports = (!repRes.error && Array.isArray(repRes.data)) ? repRes.data : [];
      adminState.craftsmen = (!crRes.error && Array.isArray(crRes.data)) ? crRes.data : [];
      adminState.offers = (!ofRes.error && Array.isArray(ofRes.data)) ? ofRes.data : [];
      adminState.emergencies = (!emRes.error && Array.isArray(emRes.data)) ? emRes.data : [];
    } catch (_) {}

    adminState.loading = false;
    renderAdminPanel();
  }

  function getReportCountMap() {
    const map = {};
    adminState.reports.forEach((r) => {
      const k = String(r.target_id || '');
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return map;
  }

  function renderAdminPanel() {
    const box = $('adminPanelBox');
    if (!box) return;
    box.classList.toggle('hidden', !adminState.isAdmin);
    if (!adminState.isAdmin) return;

    const activeOffersCount = adminState.offers.filter((o) => o.status === 'active').length;
    const statsEl = $('adminStatsTxt');
    if (statsEl) {
      statsEl.textContent = `👥 ${adminState.accounts.length} مسجل • ✉️ ${adminState.messages.length} رسالة • 🚩 ${adminState.reports.length} بلاغ • 🛠️ ${adminState.craftsmen.length} حرفي • 🧺 ${activeOffersCount} عرض`;
    }

    const bodyEl = $('adminPanelContent');
    if (!bodyEl) return;

    document.querySelectorAll('[data-admin-subtab]').forEach((btn) => {
      const active = btn.dataset.adminSubtab === adminState.activeSubTab;
      btn.className = active
        ? 'rounded-xl bg-[#0D6857] text-white px-1.5 py-2 text-[10px] font-black transition'
        : 'rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 px-1.5 py-2 text-[10px] font-extrabold transition';
    });

    if (adminState.loading) {
      bodyEl.innerHTML = '<p class="text-center text-xs font-bold text-slate-500 py-4">⏳ جاري تحميل بيانات الإدارة من Supabase...</p>';
      return;
    }

    const reportMap = getReportCountMap();

    // 0) لوحة المراقبة: إحصائيات اليوم، توزيع الولايات، والطوارئ المتأخرة
    if (adminState.activeSubTab === 'monitor') {
      const now = Date.now();
      const since24h = now - 24 * 3600000;
      const since2h = now - 2 * 3600000;

      const todayOffers = adminState.offers.filter((o) => Date.parse(o.created_at) >= since24h).length;
      const soldOffers = adminState.offers.filter((o) => o.status === 'sold').length;
      const openEmerg = adminState.emergencies.filter((e) => e.status === 'open');
      const delayedEmerg = openEmerg.filter((e) => (Date.parse(e.created_at) || now) <= since2h);
      const verifiedCrafts = adminState.craftsmen.filter((c) => Boolean(c.patente_verified || c.verified)).length;

      // توزيع النشاط حسب الولاية
      const govStats = {};
      const addGov = (g, field) => {
        const name = String(g || 'غير محدد').trim() || 'غير محدد';
        if (!govStats[name]) govStats[name] = { gov: name, offers: 0, crafts: 0, accounts: 0 };
        govStats[name][field] += 1;
      };
      adminState.offers.filter((o) => o.status === 'active').forEach((o) => addGov(o.governorate, 'offers'));
      adminState.craftsmen.forEach((c) => addGov(c.governorate, 'crafts'));
      adminState.accounts.forEach((a) => addGov(a.governorate, 'accounts'));

      const govRows = Object.values(govStats)
        .sort((a, b) => (b.offers + b.crafts + b.accounts) - (a.offers + a.crafts + a.accounts))
        .slice(0, 10);

      const kpiHtml = `
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-2xl bg-emerald-50 border border-emerald-200 p-2.5 text-center">
            <div class="text-lg font-black text-[#0D6857]">${todayOffers}</div>
            <div class="text-[10px] font-extrabold text-emerald-900">🆕 عروض آخر 24 ساعة</div>
          </div>
          <div class="rounded-2xl bg-amber-50 border border-amber-200 p-2.5 text-center">
            <div class="text-lg font-black text-amber-900">${soldOffers}</div>
            <div class="text-[10px] font-extrabold text-amber-900">✅ عروض تم بيعها</div>
          </div>
          <div class="rounded-2xl bg-rose-50 border border-rose-200 p-2.5 text-center">
            <div class="text-lg font-black text-rose-800">${delayedEmerg.length} / ${openEmerg.length}</div>
            <div class="text-[10px] font-extrabold text-rose-900">🚨 طوارئ متأخرة (&gt;2س)</div>
          </div>
          <div class="rounded-2xl bg-sky-50 border border-sky-200 p-2.5 text-center">
            <div class="text-lg font-black text-sky-900">${verifiedCrafts} / ${adminState.craftsmen.length}</div>
            <div class="text-[10px] font-extrabold text-sky-900">🏅 حرفيون موثّقون</div>
          </div>
        </div>
      `;

      const delayedHtml = delayedEmerg.length ? `
        <div class="rounded-2xl border border-rose-200 bg-rose-50/50 p-3 space-y-2">
          <h4 class="text-xs font-black text-rose-900">⏰ طلبات صيانة عاجلة مفتوحة منذ أكثر من ساعتين</h4>
          ${delayedEmerg.map((e) => `
            <div class="rounded-xl bg-white border border-rose-100 p-2 flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-[11px] font-black text-[#132A23] truncate">⚡ ${esc(e.emergency_type || 'طوارئ')} — ${esc(e.governorate || '')}</div>
                <div class="text-[10px] font-bold text-slate-500 truncate">${esc(e.description || '')} • ${esc(fmtDate(e.created_at))}</div>
              </div>
              <button type="button" data-admin-close-emerg="${esc(e.id)}" class="shrink-0 rounded-lg bg-rose-600 text-white px-2 py-1 text-[10px] font-black">إغلاق</button>
            </div>
          `).join('')}
        </div>
      ` : '<div class="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-2.5 text-center text-[11px] font-extrabold text-emerald-900">✓ لا توجد طلبات طوارئ متأخرة حالياً.</div>';

      const govHtml = `
        <div class="rounded-2xl border border-slate-200 bg-[#F8FAF9] p-3 space-y-2">
          <h4 class="text-xs font-black text-[#132A23]">🗺️ توزيع النشاط حسب الولاية (الأكثر نشاطاً)</h4>
          ${govRows.length ? `
            <div class="space-y-1.5">
              ${govRows.map((g) => `
                <div class="flex items-center justify-between rounded-xl bg-white border border-slate-100 px-2.5 py-1.5 text-[11px] font-bold">
                  <span class="font-black text-[#132A23]">📍 ${esc(g.gov)}</span>
                  <span class="text-slate-600">🧺 ${g.offers} عرض • 🛠️ ${g.crafts} حرفي • 👥 ${g.accounts} مسجل</span>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-[11px] font-bold text-slate-400">لا توجد بيانات ولايات بعد.</p>'}
        </div>
      `;

      bodyEl.innerHTML = kpiHtml + delayedHtml + govHtml;
      return;
    }

    // 1) إحصائيات المسجّلين (مواطنين، أصحاب مهن، أصحاب نصب) + إيقاف منشورات المخالفين
    if (adminState.activeSubTab === 'accounts') {
      const totalAcc = adminState.accounts.length;
      const craftsAcc = adminState.accounts.filter((a) => a.role === 'craftsman').length;
      const advAcc = adminState.accounts.filter((a) => a.role === 'advertiser').length;
      const citizensAcc = Math.max(0, totalAcc - craftsAcc - advAcc);

      const summaryHtml = `
        <div class="grid grid-cols-2 gap-2 pb-2">
          <div class="rounded-2xl bg-emerald-50 border border-emerald-200 p-2.5 text-center">
            <div class="text-lg font-black text-[#0D6857]">${totalAcc}</div>
            <div class="text-[11px] font-extrabold text-emerald-900">👥 العدد الجملي للمسجّلين</div>
          </div>
          <div class="rounded-2xl bg-amber-50 border border-amber-200 p-2.5 text-center">
            <div class="text-lg font-black text-amber-900">${craftsAcc}</div>
            <div class="text-[11px] font-extrabold text-amber-900">🛠️ أصحاب المهن (حرفيون)</div>
          </div>
          <div class="rounded-2xl bg-sky-50 border border-sky-200 p-2.5 text-center">
            <div class="text-lg font-black text-sky-900">${advAcc}</div>
            <div class="text-[11px] font-extrabold text-sky-900">🧺 أصحاب النصب والمعلنين</div>
          </div>
          <div class="rounded-2xl bg-slate-100 border border-slate-200 p-2.5 text-center">
            <div class="text-lg font-black text-slate-800">${citizensAcc}</div>
            <div class="text-[11px] font-extrabold text-slate-700">🙋 مواطنون (تصفح/طوارئ)</div>
          </div>
        </div>
      `;

      if (!totalAcc) {
        bodyEl.innerHTML = summaryHtml + '<p class="text-center text-xs font-bold text-slate-400 py-2">لا توجد حسابات ظاهرة — تأكد من تنفيذ سياسة قراءة الأدمن على kb_accounts.</p>';
        return;
      }

      const listHtml = adminState.accounts.map((a) => {
        const roleBadge = a.role === 'craftsman'
          ? '<span class="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-black">🛠️ حرفي</span>'
          : (a.role === 'advertiser'
            ? '<span class="rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[10px] font-black">🧺 نصبة / معلن</span>'
            : '<span class="rounded-full bg-slate-200 text-slate-800 px-2 py-0.5 text-[10px] font-black">🙋 مواطن</span>');
        return `
          <div class="rounded-2xl border border-slate-200 bg-[#F8FAF9] p-2.5 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-xs font-black text-[#132A23] truncate">${esc(a.display_name || 'مستخدم')}</div>
                <div class="text-[10px] font-bold text-slate-500">📍 ${esc(a.governorate || '—')} • 📞 ${esc(a.phone || '—')} • ${esc(fmtDate(a.created_at))}</div>
              </div>
              ${roleBadge}
            </div>
            <div class="flex justify-end">
              <button type="button" data-admin-suspend-user="${esc(a.user_id)}" data-admin-user-name="${esc(a.display_name || 'المستخدم')}" class="rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 px-2 py-0.5 text-[10px] font-extrabold">🚫 إيقاف منشوراته</button>
            </div>
          </div>
        `;
      }).join('');

      bodyEl.innerHTML = summaryHtml + listHtml;
      return;
    }

    if (adminState.activeSubTab === 'messages') {
      if (!adminState.messages.length) {
        bodyEl.innerHTML = '<p class="text-center text-xs font-bold text-slate-400 py-4">لا توجد رسائل إدارية واردة حالياً.</p>';
        return;
      }
      bodyEl.innerHTML = adminState.messages.map((m) => `
        <div class="rounded-2xl border border-slate-200 bg-[#F8FAF9] p-3 space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-black text-[#132A23]">📌 ${esc(m.topic || m.subject || 'رسالة واردة')}</span>
            <span class="text-[10px] font-bold text-slate-400">${esc(fmtDate(m.created_at))}</span>
          </div>
          <p class="text-[11px] font-bold text-emerald-800">
            👤 ${esc(m.sender_name || 'زائر')} ${(m.sender_phone || m.sender_contact) ? '• 📞 ' + esc(m.sender_phone || m.sender_contact) : ''}
          </p>
          <p class="text-xs font-semibold text-slate-700 whitespace-pre-line bg-white rounded-xl p-2.5 border border-slate-100">${esc(m.message || '')}</p>
          <div class="flex justify-end pt-1">
            <button type="button" data-admin-del-msg="${esc(m.id)}" class="rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 px-2.5 py-1 text-[10px] font-extrabold">🗑️ حذف الرسالة</button>
          </div>
        </div>
      `).join('');
      return;
    }

    // 3) رادار البلاغات مع ربط الإعلان وصورته
    if (adminState.activeSubTab === 'reports') {
      if (!adminState.reports.length) {
        bodyEl.innerHTML = '<p class="text-center text-xs font-bold text-slate-400 py-4">لا توجد بلاغات مسجّلة حالياً.</p>';
        return;
      }
      bodyEl.innerHTML = adminState.reports.map((r) => {
        const linkedOffer = adminState.offers.find((o) => String(o.id) === String(r.target_id));
        const cnt = reportMap[String(r.target_id || '')] || 1;
        return `
          <div class="rounded-2xl border ${cnt >= 2 ? 'border-rose-400 bg-rose-50/70' : 'border-rose-200 bg-rose-50/40'} p-3 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-black text-rose-900">🚩 بلاغ (${cnt}×) على: ${esc(r.target_type || 'offer')}</span>
              <span class="text-[10px] font-bold text-slate-500">${esc(fmtDate(r.created_at))}</span>
            </div>
            <p class="text-xs font-bold text-slate-800">السبب: ${esc(r.reason || '—')}</p>
            ${linkedOffer ? `
              <div class="flex items-center gap-2 rounded-xl bg-white border border-rose-100 p-2">
                ${linkedOffer.image_url ? `<button type="button" data-zoom-img="${esc(linkedOffer.image_url)}" data-zoom-title="${esc(linkedOffer.title)}" class="shrink-0 cursor-zoom-in"><img src="${esc(linkedOffer.image_url)}" alt="" class="h-12 w-12 rounded-lg object-cover border border-slate-200" /></button>` : ''}
                <div class="min-w-0">
                  <div class="text-[11px] font-black text-[#132A23] truncate">${esc(linkedOffer.title)} (${esc(linkedOffer.price)} د.ت)</div>
                  <div class="text-[10px] font-bold text-slate-500">👤 ${esc(linkedOffer.seller_name || '')} • 📍 ${esc(linkedOffer.governorate || '')}</div>
                </div>
              </div>
            ` : ''}
            <div class="flex flex-wrap justify-end gap-1.5 pt-1">
              ${r.target_id ? `<button type="button" data-admin-hide-offer="${esc(r.target_id)}" class="rounded-lg bg-rose-600 text-white px-2.5 py-1 text-[10px] font-extrabold">⛔ إخفاء الإعلان المُبلَّغ عنه</button>` : ''}
              <button type="button" data-admin-del-report="${esc(r.id)}" class="rounded-lg bg-slate-200 text-slate-800 px-2.5 py-1 text-[10px] font-extrabold">✓ إغلاق البلاغ</button>
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    if (adminState.activeSubTab === 'craftsmen') {
      if (!adminState.craftsmen.length) {
        bodyEl.innerHTML = '<p class="text-center text-xs font-bold text-slate-400 py-4">لا يوجد حرفيون مسجّلون بعد.</p>';
        return;
      }
      bodyEl.innerHTML = adminState.craftsmen.map((c) => {
        const sp = typeof D.getCraftCatInfo === 'function' ? D.getCraftCatInfo(c.specialty || c.spec) : { icon: '🛠️', label: c.specialty || '' };
        const isVerified = Boolean(c.patente_verified || c.verified);
        return `
          <div class="rounded-2xl border ${isVerified ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-[#F8FAF9]'} p-3 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-black text-[#132A23]">${sp.icon} ${esc(c.name)} — ${esc(sp.label)}</span>
              <span class="rounded-full ${isVerified ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-900'} px-2 py-0.5 text-[10px] font-black">
                ${isVerified ? '✓ موثّق بالباتيندا' : '⏳ غير موثّق'}
              </span>
            </div>
            <p class="text-[11px] font-bold text-slate-600">📍 ${esc(c.governorate || c.gov || '')} (${esc(c.area || '')}) • 📞 ${esc(c.phone || '')}</p>
            <div class="flex flex-wrap justify-end gap-1.5 pt-1">
              <button type="button" data-admin-toggle-verify="${esc(c.id)}" data-current-verify="${isVerified ? '1' : '0'}" class="rounded-lg ${isVerified ? 'bg-amber-100 text-amber-950' : 'bg-[#0D6857] text-white'} px-2.5 py-1 text-[10px] font-extrabold">
                ${isVerified ? 'إلغاء التوثيق' : '🏅 توثيق الحرفي'}
              </button>
              <button type="button" data-admin-del-craft="${esc(c.id)}" class="rounded-lg bg-rose-100 text-rose-800 px-2.5 py-1 text-[10px] font-extrabold">🗑️ حذف</button>
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    // 5) العروض: ترتيب العروض المُبلَّغ عنها والمشبوهة في الأعلى مع معاينة الصورة
    if (adminState.activeSubTab === 'offers') {
      const visibleOffers = adminState.offers.filter((o) => o.status === 'active');
      if (!visibleOffers.length) {
        bodyEl.innerHTML = '<p class="text-center text-xs font-bold text-slate-400 py-4">لا توجد عروض نشطة حالياً.</p>';
        return;
      }

      const rankedOffers = [...visibleOffers].map((o) => {
        const repCnt = reportMap[String(o.id)] || 0;
        const modOk = typeof D.checkContentModeration === 'function'
          ? D.checkContentModeration(`${o.title || ''} ${o.description || ''}`).ok
          : true;
        return { o, repCnt, flagged: repCnt > 0 || !modOk, modFlag: !modOk };
      }).sort((a, b) => (b.repCnt - a.repCnt) || (Number(b.flagged) - Number(a.flagged)));

      bodyEl.innerHTML = rankedOffers.map(({ o, repCnt, flagged, modFlag }) => `
        <div class="rounded-2xl border ${flagged ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-[#F8FAF9]'} p-3 space-y-2">
          <div class="flex items-start gap-2.5">
            ${o.image_url ? `<button type="button" data-zoom-img="${esc(o.image_url)}" data-zoom-title="${esc(o.title)}" class="shrink-0 cursor-zoom-in"><img src="${esc(o.image_url)}" alt="" class="h-14 w-14 rounded-xl object-cover border border-slate-200" /></button>` : ''}
            <div class="flex-1 min-w-0 space-y-1">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-black text-[#132A23] truncate">🧺 ${esc(o.title)} (${esc(o.price)} د.ت)</span>
                <span class="text-[10px] font-bold text-slate-500 shrink-0">📍 ${esc(o.governorate || o.gov || '')}</span>
              </div>
              <p class="text-[11px] font-bold text-slate-600">👤 ${esc(o.seller_name || o.seller || '')} • 📞 ${esc(o.phone || '')}</p>
              <div class="flex flex-wrap gap-1">
                ${repCnt > 0 ? `<span class="rounded-full bg-rose-600 text-white px-2 py-0.5 text-[10px] font-black">🚩 ${repCnt} بلاغ</span>` : ''}
                ${modFlag ? '<span class="rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black">⚠️ كلمات مشبوهة</span>' : ''}
              </div>
            </div>
          </div>
          <div class="flex justify-end">
            <button type="button" data-admin-hide-offer="${esc(o.id)}" class="rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 px-2.5 py-1 text-[10px] font-extrabold">⛔ حذف / إخفاء العرض</button>
          </div>
        </div>
      `).join('');
    }
  }

  document.addEventListener('click', async (e) => {
    const sb = getSupabase();
    if (!sb) return;

    const subTabBtn = e.target.closest('[data-admin-subtab]');
    if (subTabBtn) {
      adminState.activeSubTab = subTabBtn.dataset.adminSubtab;
      renderAdminPanel();
      return;
    }

    if (e.target.closest('#adminRefreshBtn')) {
      toast('🔄 جاري تحديث بيانات لوحة الإدارة...');
      await loadAdminData();
      return;
    }

    const delMsgBtn = e.target.closest('[data-admin-del-msg]');
    if (delMsgBtn) {
      const id = delMsgBtn.dataset.adminDelMsg;
      const { error } = await sb.from('kb_messages').delete().eq('id', id);
      if (error) return toast('⚠️ تعذر حذف الرسالة: ' + error.message);
      adminState.messages = adminState.messages.filter((m) => String(m.id) !== String(id));
      renderAdminPanel();
      toast('🗑️ تم حذف الرسالة.');
      return;
    }

    const delRepBtn = e.target.closest('[data-admin-del-report]');
    if (delRepBtn) {
      const id = delRepBtn.dataset.adminDelReport;
      const { error } = await sb.from('kb_reports').delete().eq('id', id);
      if (error) return toast('⚠️ تعذر إغلاق البلاغ: ' + error.message);
      adminState.reports = adminState.reports.filter((r) => String(r.id) !== String(id));
      renderAdminPanel();
      toast('✓ تم إغلاق البلاغ.');
      return;
    }

    const hideOfBtn = e.target.closest('[data-admin-hide-offer]');
    if (hideOfBtn) {
      const id = hideOfBtn.dataset.adminHideOffer;
      const { error } = await sb.from('kb_offers').update({ status: 'removed_by_admin' }).eq('id', id);
      if (error) return toast('⚠️ تعذر إخفاء الإعلان: ' + error.message);
      adminState.offers = adminState.offers.filter((o) => String(o.id) !== String(id));
      renderAdminPanel();
      toast('⛔ تم إخفاء الإعلان من السوق.');
      return;
    }

    const closeEmBtn = e.target.closest('[data-admin-close-emerg]');
    if (closeEmBtn) {
      const id = closeEmBtn.dataset.adminCloseEmerg;
      const { error } = await sb.from('kb_emergencies').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id);
      if (error) return toast('⚠️ تعذر إغلاق الطلب: ' + error.message);
      adminState.emergencies = adminState.emergencies.filter((x) => String(x.id) !== String(id));
      renderAdminPanel();
      toast('✓ تم إغلاق طلب الطوارئ.');
      return;
    }

    const suspendBtn = e.target.closest('[data-admin-suspend-user]');
    if (suspendBtn) {
      const uid = suspendBtn.dataset.adminSuspendUser;
      const uname = suspendBtn.dataset.adminUserName || 'المستخدم';
      if (!uid) return;
      if (!confirm(`إيقاف وإخفاء جميع عروض وبطاقات «${uname}»؟`)) return;
      await Promise.allSettled([
        sb.from('kb_offers').update({ status: 'removed_by_admin', live_location: false }).eq('user_id', uid),
        sb.from('kb_craftsmen').delete().eq('user_id', uid)
      ]);
      adminState.offers = adminState.offers.filter((o) => String(o.user_id) !== String(uid));
      adminState.craftsmen = adminState.craftsmen.filter((c) => String(c.user_id) !== String(uid));
      renderAdminPanel();
      toast(`🚫 تم إيقاف منشورات «${uname}».`);
      return;
    }

    const verBtn = e.target.closest('[data-admin-toggle-verify]');
    if (verBtn) {
      const id = verBtn.dataset.adminToggleVerify;
      const nextVal = verBtn.dataset.currentVerify !== '1';
      const { error } = await sb.from('kb_craftsmen').update({ patente_verified: nextVal }).eq('id', id);
      if (error) return toast('⚠️ تأكد من إضافة عمود patente_verified في kb_craftsmen: ' + error.message);
      adminState.craftsmen = adminState.craftsmen.map((c) => String(c.id) === String(id) ? { ...c, patente_verified: nextVal } : c);
      renderAdminPanel();
      toast(nextVal ? '🏅 تم توثيق الحرفي بنجاح!' : 'تم إلغاء شارة التوثيق.');
      return;
    }

    const delCrBtn = e.target.closest('[data-admin-del-craft]');
    if (delCrBtn) {
      const id = delCrBtn.dataset.adminDelCraft;
      if (!confirm('حذف بطاقة هذا الحرفي نهائياً؟')) return;
      const { error } = await sb.from('kb_craftsmen').delete().eq('id', id);
      if (error) return toast('⚠️ تعذر حذف الحرفي: ' + error.message);
      adminState.craftsmen = adminState.craftsmen.filter((c) => String(c.id) !== String(id));
      renderAdminPanel();
      toast('🗑️ تم حذف بطاقة الحرفي.');
    }
  });

  async function initAdmin() {
    adminState.isAdmin = await checkIsAdmin();
    renderAdminPanel();
    if (adminState.isAdmin) {
      await loadAdminData();
    }
    const sb = getSupabase();
    if (sb && sb.auth && sb.auth.onAuthStateChange) {
      sb.auth.onAuthStateChange(async () => {
        const wasAdmin = adminState.isAdmin;
        adminState.isAdmin = await checkIsAdmin();
        renderAdminPanel();
        if (adminState.isAdmin && !wasAdmin) {
          await loadAdminData();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
  } else {
    initAdmin();
  }
})();