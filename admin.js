// خوذ بايك — وحدة لوحة الإدارة الكاملة (admin.js: الرسائل الإدارية، البلاغات، توثيق الحرفيين/الباتيندا، إدارة العروض)
(() => {
  'use strict';

  const C = window.KB_CONFIG || {};
  const D = window.KB_DATA || {};
  const $ = (id) => document.getElementById(id);

  let sbClient = null;
  let adminState = {
    isAdmin: false,
    activeSubTab: 'messages',
    messages: [],
    reports: [],
    craftsmen: [],
    offers: [],
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
      const [msgRes, repRes, crRes, ofRes] = await Promise.all([
        sb.from('kb_messages').select('*').order('created_at', { ascending: false }).limit(50),
        sb.from('kb_reports').select('*').order('created_at', { ascending: false }).limit(50),
        sb.from('kb_craftsmen').select('*').order('created_at', { ascending: false }).limit(100),
        sb.from('kb_offers').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(100)
      ]);

      adminState.messages = (!msgRes.error && Array.isArray(msgRes.data)) ? msgRes.data : [];
      adminState.reports = (!repRes.error && Array.isArray(repRes.data)) ? repRes.data : [];
      adminState.craftsmen = (!crRes.error && Array.isArray(crRes.data)) ? crRes.data : [];
      adminState.offers = (!ofRes.error && Array.isArray(ofRes.data)) ? ofRes.data : [];
    } catch (_) {}

    adminState.loading = false;
    renderAdminPanel();
  }

  function renderAdminPanel() {
    const box = $('adminPanelBox');
    if (!box) return;
    box.classList.toggle('hidden', !adminState.isAdmin);
    if (!adminState.isAdmin) return;

    const statsEl = $('adminStatsTxt');
    if (statsEl) {
      statsEl.textContent = `✉️ ${adminState.messages.length} رسالة • 🚩 ${adminState.reports.length} بلاغ • 🛠️ ${adminState.craftsmen.length} حرفي • 🧺 ${adminState.offers.length} عرض نشط`;
    }

    const bodyEl = $('adminPanelContent');
    if (!bodyEl) return;

    document.querySelectorAll('[data-admin-subtab]').forEach((btn) => {
      const active = btn.dataset.adminSubtab === adminState.activeSubTab;
      btn.className = active
        ? 'rounded-xl bg-[#0D6857] text-white px-2.5 py-2 text-[11px] font-black transition'
        : 'rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 px-2.5 py-2 text-[11px] font-extrabold transition';
    });

    if (adminState.loading) {
      bodyEl.innerHTML = '<p class="text-center text-xs font-bold text-slate-500 py-4">⏳ جاري تحميل بيانات الإدارة من Supabase...</p>';
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

    if (adminState.activeSubTab === 'reports') {
      if (!adminState.reports.length) {
        bodyEl.innerHTML = '<p class="text-center text-xs font-bold text-slate-400 py-4">لا توجد بلاغات مسجّلة حالياً.</p>';
        return;
      }
      bodyEl.innerHTML = adminState.reports.map((r) => `
        <div class="rounded-2xl border border-rose-200 bg-rose-50/40 p-3 space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-black text-rose-900">🚩 بلاغ على: ${esc(r.target_type || 'offer')} (${esc(r.target_id || '')})</span>
            <span class="text-[10px] font-bold text-slate-500">${esc(fmtDate(r.created_at))}</span>
          </div>
          <p class="text-xs font-bold text-slate-800">السبب: ${esc(r.reason || '—')}</p>
          <div class="flex flex-wrap justify-end gap-1.5 pt-1">
            ${r.target_id ? `<button type="button" data-admin-hide-offer="${esc(r.target_id)}" class="rounded-lg bg-rose-600 text-white px-2.5 py-1 text-[10px] font-extrabold">⛔ إخفاء الإعلان المُبلَّغ عنه</button>` : ''}
            <button type="button" data-admin-del-report="${esc(r.id)}" class="rounded-lg bg-slate-200 text-slate-800 px-2.5 py-1 text-[10px] font-extrabold">✓ إغلاق البلاغ</button>
          </div>
        </div>
      `).join('');
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

    if (adminState.activeSubTab === 'offers') {
      if (!adminState.offers.length) {
        bodyEl.innerHTML = '<p class="text-center text-xs font-bold text-slate-400 py-4">لا توجد عروض نشطة حالياً.</p>';
        return;
      }
      bodyEl.innerHTML = adminState.offers.map((o) => `
        <div class="rounded-2xl border border-slate-200 bg-[#F8FAF9] p-3 space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-black text-[#132A23]">🧺 ${esc(o.title)} (${esc(o.price)} د.ت)</span>
            <span class="text-[10px] font-bold text-slate-500">📍 ${esc(o.governorate || o.gov || '')}</span>
          </div>
          <p class="text-[11px] font-bold text-slate-600">👤 ${esc(o.seller_name || o.seller || '')} • 📞 ${esc(o.phone || '')}</p>
          <div class="flex justify-end pt-1">
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