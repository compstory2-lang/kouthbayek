// خوذ بايك — وحدة الخصوصية والموافقة ومراسلة الإدارة (privacy.js v1.5-TN)
window.KB_PRIVACY = (() => {
  'use strict';

  const D = window.KB_DATA;
  const $ = (id) => document.getElementById(id);

  const LABELS = {
    account: 'أوافق على سياسة حماية المعطيات وشروط الاستخدام، وأؤكد أن رقم الهاتف يعود لي شخصياً.',
    offer: 'أقرّ بشرعية السلعة المعروضة ومسؤوليتي الكاملة عنها، وأوافق على ظهور بيانات التواصل للعموم لمدة أقصاها 24 ساعة.',
    craft: 'أوافق على نشر اسمي ورقم هاتفي وولايتي في دليل الحرفيين العمومي، وأتحمّل مسؤولية صحة البيانات.',
    emergency: 'أوافق على مشاركة موقعي ورقم هاتفي مع الحرفيين لتلبية طلب الصيانة العاجلة، وأعلم أنها لا تغني عن 198 / 197 / 190.'
  };

  function renderConsentField(slotId, checkboxId, kind) {
    const slot = $(slotId);
    if (!slot) return;
    const labelTxt = LABELS[kind] || LABELS.account;
    const safeCb = D ? D.escHtml(checkboxId) : checkboxId;
    slot.innerHTML = `
      <div class="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-2.5 space-y-1">
        <label for="${safeCb}" class="flex items-start gap-2 cursor-pointer text-[11px] font-bold text-slate-700 leading-relaxed">
          <input id="${safeCb}" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-[#0D6857] rounded" />
          <span>${labelTxt} <a href="./privacy.html" class="font-black text-[#0D6857] underline">التفاصيل</a></span>
        </label>
        <p id="${safeCb}_err" class="hidden text-[10px] font-black text-rose-700">⚠️ يرجى التأشير على الموافقة أولاً للمتابعة.</p>
      </div>
    `;
  }

  function clearConsentError(checkboxId) {
    const err = $(`${checkboxId}_err`);
    if (err) err.classList.add('hidden');
  }

  function validateConsent(checkboxId) {
    const cb = $(checkboxId);
    if (!cb) return true;
    const ok = Boolean(cb.checked);
    const err = $(`${checkboxId}_err`);
    if (err) err.classList.toggle('hidden', ok);
    if (!ok) {
      try { cb.focus(); } catch (_) {}
    }
    return ok;
  }

  function ensureContactModal() {
    if ($('kbContactModal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'kbContactModal';
    wrap.className = 'hidden fixed inset-0 z-50 kb-modal-backdrop flex items-end sm:items-center justify-center p-2 sm:p-4';
    wrap.innerHTML = `
      <div class="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl space-y-3">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 class="text-sm font-black text-[#0D6857]">✉️ مراسلة إدارة «خوذ بايك»</h3>
          <button type="button" data-close-modal="kbContactModal" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">✕</button>
        </div>
        <form id="kbContactForm" class="space-y-2.5">
          <div>
            <label for="kbContactTopic" class="block text-xs font-extrabold text-slate-700 mb-1">الموضوع</label>
            <input id="kbContactTopic" type="text" required maxlength="100" class="w-full rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] px-3 py-2 text-xs font-bold outline-none focus:border-[#0D6857]" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="kbContactName" class="block text-xs font-extrabold text-slate-700 mb-1">الاسم (اختياري)</label>
              <input id="kbContactName" type="text" maxlength="100" placeholder="اسمك" class="w-full rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] px-3 py-2 text-xs font-bold outline-none" />
            </div>
            <div>
              <label for="kbContactPhone" class="block text-xs font-extrabold text-slate-700 mb-1">الهاتف (اختياري)</label>
              <input id="kbContactPhone" type="tel" inputmode="tel" maxlength="16" placeholder="55123456" class="w-full rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] px-3 py-2 text-xs font-bold outline-none" dir="ltr" />
            </div>
          </div>
          <div>
            <label for="kbContactMsg" class="block text-xs font-extrabold text-slate-700 mb-1">الرسالة *</label>
            <textarea id="kbContactMsg" rows="3" required minlength="5" maxlength="1500" placeholder="اكتب رسالتك أو طلب الحذف أو التبليغ..." class="w-full rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] px-3 py-2 text-xs font-bold outline-none focus:border-[#0D6857]"></textarea>
          </div>
          <p id="kbContactStatus" class="hidden rounded-xl px-3 py-2 text-xs font-extrabold"></p>
          <button id="kbContactSubmitBtn" type="submit" class="w-full rounded-xl bg-[#0D6857] hover:bg-[#094D40] py-2.5 text-xs font-black text-white">إرسال إلى الإدارة</button>
        </form>
      </div>
    `;
    document.body.appendChild(wrap);

    $('kbContactForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!D || typeof D.submitAdminMessage !== 'function') return;
      const btn = $('kbContactSubmitBtn');
      const st = $('kbContactStatus');
      const acc = D.lsGet(D.STORE_KEYS.account, null);
      btn.disabled = true;
      btn.textContent = '⏳ جاري الإرسال...';
      try {
        const res = await D.submitAdminMessage({
          topic: $('kbContactTopic').value,
          senderName: $('kbContactName').value,
          senderPhone: $('kbContactPhone').value,
          message: $('kbContactMsg').value,
          userId: (acc && acc.userId) || null,
          sourcePage: 'app_modal'
        });
        st.classList.remove('hidden');
        if (!res.ok) {
          st.className = 'rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-800';
          st.textContent = '⚠️ ' + (res.error || 'تعذر الإرسال، حاول مجدداً.');
          return;
        }
        st.className = 'rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-900';
        st.textContent = '✅ تم إرسال رسالتك إلى الإدارة بنجاح.';
        $('kbContactMsg').value = '';
        setTimeout(() => { $('kbContactModal').classList.add('hidden'); }, 1200);
      } finally {
        btn.disabled = false;
        btn.textContent = 'إرسال إلى الإدارة';
      }
    });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-contact]');
    if (!btn) return;
    ensureContactModal();
    const acc = D ? D.lsGet(D.STORE_KEYS.account, null) : null;
    $('kbContactTopic').value = btn.dataset.openContact || 'استفسار عام';
    if (acc) {
      if (acc.name && !$('kbContactName').value) $('kbContactName').value = acc.name;
      if (acc.phone && !$('kbContactPhone').value) $('kbContactPhone').value = acc.phone;
    }
    $('kbContactStatus').classList.add('hidden');
    $('kbContactModal').classList.remove('hidden');
  });

  return { renderConsentField, clearConsentError, validateConsent };
})();