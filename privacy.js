// خوذ بايك — وحدة حماية المعطيات الشخصية ومراسلة الإدارة عبر Supabase (v1.5-TN)
window.KB_PRIVACY = (() => {
  'use strict';

  const POLICY_VERSION = (window.KB_CONFIG && window.KB_CONFIG.VERSION) || 'v1.5-TN';
  const COOLDOWN_KEY = 'kb_last_admin_msg_at';
  const COOLDOWN_MS = 30000; // 30 ثانية بين كل رسالة وأخرى لمنع الإغراق

  const CONSENT_LABELS = {
    offer: 'أتحمّل كامل المسؤولية القانونية عن ملكية وشرعية المعروض (غير مسروق ولا مخالف للقانون) وصحة رقم الهاتف، وأوافق على',
    emergency: 'أقرّ بصحة البلاغ وأن هذا القسم لا يعوّض أرقام النجدة (198/197/193/190)، وأوافق على مشاركة موقعي وهاتفي وفق',
    craft: 'أقرّ بصحة رقم هاتفي ومهنتي، وأوافق على عرض بياناتي للعموم في دليل الحرفيين وفق',
    account: 'أقرّ بأن رقم الهاتف التونسي يعود لي شخصياً، وأوافق على'
  };

  const POLICY_HTML = `
    <div id="privacyModal" class="kb-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="privacyTitle" dir="rtl">
      <div class="kb-modal-card">
        <div class="kb-modal-header">
          <h3 id="privacyTitle">🛡️ حماية المعطيات وشروط الاستخدام</h3>
          <button type="button" class="kb-modal-close" id="closePrivacyBtn" aria-label="إغلاق">&times;</button>
        </div>

        <div class="kb-modal-body">
          <p class="kb-policy-meta">
            الإصدار: ${POLICY_VERSION} — وفقاً للقانون الأساسي عدد 63 لسنة 2004 المؤرخ في 27 جويلية 2004 المتعلق بحماية المعطيات الشخصية (الجمهورية التونسية).
          </p>

          <h4>1. طبيعة المنصة وإخلاء المسؤولية</h4>
          <ul>
            <li>«خوذ بايك» هي <strong>مبادرة فردية مجانية غير ربحية</strong> تهدف إلى ربط المواطنين بالحرفيين وتسهيل تداول عروض السوق اليومي في الولايات الـ 24.</li>
            <li>تقتصر المنصة على دور <strong>الوسيط التقني فقط</strong>، ولا تتدخل في الاتفاقات المالية، ولا تضمن جودة الخدمات أو صحة المعاملات بين الأطراف.</li>
            <li><strong>قسم الطوارئ 24/24:</strong> مخصص للصيانة الاستعجالية فقط، ولا يعوّض أرقام النجدة الرسمية (الحماية المدنية 198، الشرطة 197، الحرس الوطني 193، الإسعاف 190).</li>
          </ul>

          <h4>2. شرعية المعروضات والمسؤولية القانونية للناشر</h4>
          <ul>
            <li>يتحمل الناشر وحده <strong>كامل المسؤولية المدنية والجزائية</strong> عن كل ما ينشره من إعلانات أو صور أو عروض.</li>
            <li>لا تتحمل المنصة أي مسؤولية إذا تبيّن أن السلعة المعروضة <strong>مسروقة، مقلّدة، مجهولة المصدر، أو مخالفة للقانون التونسي</strong>.</li>
            <li>يُمنع نشر الخمور والممنوعات والألفاظ غير اللائقة، ويتعهد الناشر بأن رقم الهاتف المدرج يعود له شخصياً أو بموافقة صاحبه.</li>
            <li>تحتفظ المنصة بحق <strong>الحذف الفوري</strong> لأي إعلان مشبوه أو محل شكاية دون سابق إنذار، مع الاستعداد للتعاون مع السلطات القضائية عند الطلب القانوني.</li>
          </ul>

          <h4>3. المعطيات الشخصية والاستضافة والخرائط</h4>
          <ul>
            <li><strong>بيانات الحساب والتواصل:</strong> الاسم والبريد الإلكتروني (عبر Google)، رقم الهاتف التونسي، والولاية.</li>
            <li><strong>الموقع الجغرافي (GPS):</strong> يُستخدم فقط عند تفعيله أو تشغيل «أنا هنا الآن» أو إرسال بلاغ طارئ.</li>
            <li><strong>التقنيات المستعملة:</strong> تُخزَّن البيانات والصور عبر خوادم مؤمَّنة (Supabase) بتشفير HTTPS، وتُعرض الخرائط عبر Leaflet / Esri ArcGIS. تُستخدم ذاكرة المتصفح (localStorage) لحفظ التفضيلات فقط دون أي تتبع إشهاري.</li>
          </ul>

          <h4>4. مدة الاحتفاظ وحقوقك القانونية</h4>
          <ul>
            <li><strong>عروض السوق اليومي:</strong> مدتها القصوى 24 ساعة ثم تنتهي تلقائياً (أو فور الضغط على «تم البيع»).</li>
            <li><strong>بلاغات الطوارئ:</strong> بحد أقصى 24 ساعة، وتُخفى فور الاستلام أو تأكيد التنفيذ.</li>
            <li><strong>الحذف النهائي ومراسلة الإدارة:</strong> يمكنك حذف حسابك وجميع بياناتك فوراً من تبويب «حسابي»، أو إرسال رسالة مباشرة للإدارة لطلب حذف رقم هاتف أو التبليغ عن مخالفة:
              <div style="margin-top:8px;">
                <button type="button" id="openContactFromPolicyBtn" class="kb-link-btn">✉️ إرسال رسالة مباشرة للإدارة الآن</button>
              </div>
            </li>
          </ul>
        </div>

        <div class="kb-modal-footer">
          <button type="button" id="acceptPrivacyModalBtn" class="kb-btn-primary">قرأت وأوافق على السياسة والشروط</button>
        </div>
      </div>
    </div>
  `;

  const CONTACT_MODAL_HTML = `
    <div id="kbContactModal" class="kb-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="kbContactTitle" dir="rtl">
      <div class="kb-modal-card">
        <div class="kb-modal-header">
          <h3 id="kbContactTitle">✉️ مراسلة إدارة «خوذ بايك»</h3>
          <button type="button" class="kb-modal-close" id="closeContactBtn" aria-label="إغلاق">&times;</button>
        </div>

        <div class="kb-modal-body">
          <p class="kb-policy-meta">
            تُرسل رسالتك مباشرة وبسرية إلى إدارة التطبيق (لطلبات حذف المعطيات أو الأرقام، التبليغ عن سلعة مخالفة، أو أي استفسار).
          </p>

          <form id="kbContactForm" class="space-y-3">
            <div>
              <label for="kbMsgTopic" class="block text-xs font-extrabold text-slate-700 mb-1">موضوع الرسالة</label>
              <select id="kbMsgTopic" class="w-full rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] px-3 py-2 text-xs font-bold outline-none focus:border-[#0D6857]">
                <option value="طلب حذف معطيات / رقم هاتف">🔒 طلب حذف معطيات أو رقم هاتف</option>
                <option value="تبليغ عن سلعة مشبوهة أو مخالفة">🚩 تبليغ عن سلعة مشبوهة أو مخالفة</option>
                <option value="مشكلة تقنية في التطبيق">🛠️ مشكلة تقنية في التطبيق</option>
                <option value="اقتراح أو استفسار عام">💬 اقتراح أو استفسار عام</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label for="kbMsgName" class="block text-xs font-extrabold text-slate-700 mb-1">الاسم (اختياري)</label>
                <input id="kbMsgName" type="text" maxlength="100" placeholder="اسمك" class="w-full rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] px-3 py-2 text-xs font-bold outline-none focus:border-[#0D6857]" />
              </div>
              <div>
                <label for="kbMsgPhone" class="block text-xs font-extrabold text-slate-700 mb-1">هاتف للرد (اختياري)</label>
                <input id="kbMsgPhone" type="tel" inputmode="tel" maxlength="16" placeholder="55123456" class="w-full rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] px-3 py-2 text-xs font-bold outline-none focus:border-[#0D6857]" dir="ltr" />
              </div>
            </div>

            <div>
              <label for="kbMsgText" class="block text-xs font-extrabold text-slate-700 mb-1">نص الرسالة *</label>
              <textarea id="kbMsgText" rows="4" required minlength="5" maxlength="1500" placeholder="اكتب تفاصيل طلبك أو عنوان الإعلان أو الرقم المطلوب حذفه..." class="w-full rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] px-3 py-2 text-xs font-bold outline-none focus:border-[#0D6857]"></textarea>
            </div>

            <div id="kbContactStatus" class="hidden rounded-xl px-3 py-2 text-xs font-extrabold"></div>

            <button type="submit" id="kbMsgSubmitBtn" class="kb-btn-primary">إرسال الرسالة إلى الإدارة</button>
          </form>
        </div>
      </div>
    </div>
  `;

  let activeCheckboxId = null;

  function ensureModalExists() {
    if (document.getElementById('privacyModal')) return;
    document.body.insertAdjacentHTML('beforeend', POLICY_HTML);

    const modal = document.getElementById('privacyModal');
    const closeBtn = document.getElementById('closePrivacyBtn');
    const acceptBtn = document.getElementById('acceptPrivacyModalBtn');
    const contactLinkBtn = document.getElementById('openContactFromPolicyBtn');

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    acceptBtn.addEventListener('click', () => {
      if (activeCheckboxId) {
        const cb = document.getElementById(activeCheckboxId);
        if (cb) {
          cb.checked = true;
          clearConsentError(activeCheckboxId);
        }
      }
      closeModal();
    });

    if (contactLinkBtn) {
      contactLinkBtn.addEventListener('click', () => {
        closeModal();
        openContactModal('طلب حذف معطيات / رقم هاتف');
      });
    }
  }

  function showContactStatus(text, isError) {
    const el = document.getElementById('kbContactStatus');
    if (!el) return;
    el.textContent = text;
    el.className = isError
      ? 'rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-800'
      : 'rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-900';
    el.classList.remove('hidden');
  }

  function ensureContactModalExists() {
    if (document.getElementById('kbContactModal')) return;
    document.body.insertAdjacentHTML('beforeend', CONTACT_MODAL_HTML);

    const modal = document.getElementById('kbContactModal');
    const closeBtn = document.getElementById('closeContactBtn');
    const form = document.getElementById('kbContactForm');

    closeBtn.addEventListener('click', closeContactModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeContactModal();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const D = window.KB_DATA;
      if (!D || typeof D.submitAdminMessage !== 'function') {
        return showContactStatus('⚠️ تعذر الاتصال بالخادم، يرجى تحديث الصفحة.', true);
      }

      const lastAt = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
      if (Date.now() - lastAt < COOLDOWN_MS) {
        const sec = Math.ceil((COOLDOWN_MS - (Date.now() - lastAt)) / 1000);
        return showContactStatus(`⏳ يرجى الانتظار ${sec} ثانية قبل إرسال رسالة أخرى.`, true);
      }

      const btn = document.getElementById('kbMsgSubmitBtn');
      const acc = D.lsGet(D.STORE_KEYS.account, null);
      btn.disabled = true;
      btn.textContent = '⏳ جاري الإرسال...';

      try {
        const res = await D.submitAdminMessage({
          topic: document.getElementById('kbMsgTopic').value,
          senderName: document.getElementById('kbMsgName').value,
          senderPhone: document.getElementById('kbMsgPhone').value,
          message: document.getElementById('kbMsgText').value,
          userId: (acc && acc.userId) || null,
          sourcePage: 'app'
        });

        if (!res.ok) {
          showContactStatus('⚠️ ' + (res.error || 'تعذر إرسال الرسالة، حاول مجدداً.'), true);
          return;
        }

        try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch (_) {}
        document.getElementById('kbMsgText').value = '';
        showContactStatus('✅ تم إرسال رسالتك إلى الإدارة بنجاح، سيتم مراجعتها في أقرب وقت.', false);
      } finally {
        btn.disabled = false;
        btn.textContent = 'إرسال الرسالة إلى الإدارة';
      }
    });
  }

  function openModal(checkboxId = null) {
    ensureModalExists();
    activeCheckboxId = checkboxId;
    document.getElementById('privacyModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('privacyModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function openContactModal(defaultTopic = '') {
    ensureContactModalExists();
    const D = window.KB_DATA;
    const statusEl = document.getElementById('kbContactStatus');
    if (statusEl) statusEl.classList.add('hidden');

    if (defaultTopic) {
      const sel = document.getElementById('kbMsgTopic');
      if (sel && Array.from(sel.options).some((o) => o.value === defaultTopic)) {
        sel.value = defaultTopic;
      }
    }

    if (D) {
      const acc = D.lsGet(D.STORE_KEYS.account, null);
      const nameInput = document.getElementById('kbMsgName');
      const phoneInput = document.getElementById('kbMsgPhone');
      if (acc && nameInput && !nameInput.value) nameInput.value = acc.name || '';
      if (acc && phoneInput && !phoneInput.value) phoneInput.value = acc.phone || '';
    }

    document.getElementById('kbContactModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeContactModal() {
    const modal = document.getElementById('kbContactModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeContactModal();
    }
  });

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-contact]');
    if (!trigger) return;
    e.preventDefault();
    const termsModal = document.getElementById('termsModal');
    if (termsModal) termsModal.classList.add('hidden');
    openContactModal(trigger.dataset.openContact || '');
  });

  function clearConsentError(checkboxId) {
    const box = document.getElementById(`box_${checkboxId}`);
    const err = document.getElementById(`err_${checkboxId}`);
    if (box) box.classList.remove('kb-consent-error');
    if (err) err.style.display = 'none';
  }

  function renderConsentField(containerId, checkboxId = 'privacyConsent', context = 'offer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const prefixText = CONSENT_LABELS[context] || CONSENT_LABELS.offer;

    container.innerHTML = `
      <div class="kb-consent-wrapper">
        <label class="kb-consent-box" id="box_${checkboxId}" for="${checkboxId}">
          <input type="checkbox" id="${checkboxId}" name="privacy_accepted" />
          <span>
            ${prefixText}
            <button type="button" class="kb-link-btn" id="openPolicy_${checkboxId}">
              سياسة حماية المعطيات وشروط الاستخدام
            </button>.
          </span>
        </label>
        <div class="kb-consent-err-msg" id="err_${checkboxId}" role="alert">
          ⚠️ يرجى التأشير على الموافقة على شروط الاستخدام وحماية المعطيات قبل المتابعة.
        </div>
      </div>
    `;

    const cb = document.getElementById(checkboxId);
    cb.addEventListener('change', () => {
      if (cb.checked) clearConsentError(checkboxId);
    });

    document.getElementById(`openPolicy_${checkboxId}`).addEventListener('click', (e) => {
      e.preventDefault();
      openModal(checkboxId);
    });
  }

  function validateConsent(checkboxId = 'privacyConsent') {
    const cb = document.getElementById(checkboxId);
    if (!cb || !cb.checked) {
      const box = document.getElementById(`box_${checkboxId}`);
      const err = document.getElementById(`err_${checkboxId}`);
      if (box) {
        box.classList.add('kb-consent-error');
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (err) err.style.display = 'block';
      return false;
    }
    return true;
  }

  function getConsentMetadata() {
    return {
      privacy_accepted: true,
      privacy_version: POLICY_VERSION,
      privacy_accepted_at: new Date().toISOString()
    };
  }

  return {
    openModal,
    closeModal,
    openContactModal,
    closeContactModal,
    clearConsentError,
    renderConsentField,
    validateConsent,
    getConsentMetadata
  };
})();

const PrivacyManager = window.KB_PRIVACY;
