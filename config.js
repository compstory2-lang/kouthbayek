// خوذ بايك — ملف الإعدادات والثوابت الكامل والموحّد (config.js v1.5-TN)
window.KB_CONFIG = (() => {
  'use strict';

  const HR = 3600000; // ساعة واحدة بالملي ثانية
  const VERSION = 'v1.5-TN';
  const OFFER_TTL_HOURS = 24;
  const NON_FOOD_TTL_HOURS = 72;
  const NON_FOOD_CATS = ['livestock', 'vehicles', 'electronics', 'furniture', 'construction', 'other'];
  const isNonFoodCat = (catId) => NON_FOOD_CATS.includes(catId);
  const STORAGE_BUCKET = 'offer-images';

  const SUPABASE_URL = 'https://tlgfwkbsgaiyylhhmywv.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_oW2H_1p5MCX82_bJOObyfA_AplDj2bk';
  const SUPABASE = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
  };

  const ADMIN_EMAILS = ['jabeurj011@gmail.com'];
  const ADMIN_USER_IDS = [];

  // 1) الولايات التونسية الـ 24 مع الإحداثيات المركزية
  const TN_GOVERNORATES = [
    { id: 'Gabès', ar: 'قابس', lat: 33.8815, lng: 10.0982 },
    { id: 'Tunis', ar: 'تونس', lat: 36.8065, lng: 10.1815 },
    { id: 'Ariana', ar: 'أريانة', lat: 36.8665, lng: 10.1647 },
    { id: 'Ben Arous', ar: 'بن عروس', lat: 36.7533, lng: 10.2282 },
    { id: 'Manouba', ar: 'منوبة', lat: 36.8081, lng: 10.0972 },
    { id: 'Nabeul', ar: 'نابل', lat: 36.4561, lng: 10.7376 },
    { id: 'Zaghouan', ar: 'زغوان', lat: 36.4029, lng: 10.1429 },
    { id: 'Bizerte', ar: 'بنزرت', lat: 37.2744, lng: 9.8739 },
    { id: 'Béja', ar: 'باجة', lat: 36.7256, lng: 9.1817 },
    { id: 'Jendouba', ar: 'جندوبة', lat: 36.5011, lng: 8.7802 },
    { id: 'Kef', ar: 'الكاف', lat: 36.1742, lng: 8.7049 },
    { id: 'Siliana', ar: 'سليانة', lat: 36.0849, lng: 9.3708 },
    { id: 'Sousse', ar: 'سوسة', lat: 35.8256, lng: 10.6369 },
    { id: 'Monastir', ar: 'المنستير', lat: 35.7643, lng: 10.8113 },
    { id: 'Mahdia', ar: 'المهدية', lat: 35.5047, lng: 11.0622 },
    { id: 'Sfax', ar: 'صفاقس', lat: 34.7406, lng: 10.7603 },
    { id: 'Kairouan', ar: 'القيروان', lat: 35.6781, lng: 10.0963 },
    { id: 'Kasserine', ar: 'القصرين', lat: 35.1676, lng: 8.8365 },
    { id: 'Sidi Bouzid', ar: 'سيدي بوزيد', lat: 35.0382, lng: 9.4849 },
    { id: 'Médenine', ar: 'مدنين', lat: 33.3549, lng: 10.5055 },
    { id: 'Tataouine', ar: 'تطاوين', lat: 32.9297, lng: 10.4518 },
    { id: 'Gafsa', ar: 'قفصة', lat: 34.4250, lng: 8.7842 },
    { id: 'Tozeur', ar: 'توزر', lat: 33.9197, lng: 8.1335 },
    { id: 'Kebili', ar: 'قبلي', lat: 33.7044, lng: 8.9690 }
  ];

  // 2) فئات سوق الحومة والعروض اليومية (24 ساعة)
  const MARKET_CATS = [
    { id: 'all', label: 'الكل', icon: '✨' },
    { id: 'produce', label: 'خضر وغلال طازجة', icon: '🥬' },
    { id: 'meat', label: 'لحوم ودواجن', icon: '🥩' },
    { id: 'fish', label: 'أسماك وغلال البحر', icon: '🐟' },
    { id: 'dairy', label: 'أجبان وألبان وبيض', icon: '🧀' },
    { id: 'farm', label: 'عولة ومنتوجات فلاحية', icon: '🫒' },
    { id: 'olive_oil', label: 'زيت زيتون وعسل وتمور', icon: '🍯' },
    { id: 'bakery', label: 'خبز وحلويات ومأكولات', icon: '🥖' },
    { id: 'livestock', label: 'مواشي وأعلاف وفلاحة', icon: '🐑' },
    { id: 'vehicles', label: 'سيارات ودراجات وقطع', icon: '🚗' },
    { id: 'electronics', label: 'هواتف وكهرومنزلية', icon: '📱' },
    { id: 'furniture', label: 'أثاث وتجهيزات منزلية', icon: '🛋️' },
    { id: 'construction', label: 'مواد بناء وخردوات', icon: '🧱' },
    { id: 'other', label: 'عروض متنوعة أخرى', icon: '🧺' }
  ];

  // 3) مجموعات وتخصصات دليل الحرفيين
  const CRAFT_GROUPS = [
    { id: 'all', label: 'الكل', icon: '🛠️' },
    { id: 'home', label: 'المنزل والبناء', icon: '🏠' },
    { id: 'tech', label: 'تبريد وكهرومنزلية', icon: '❄️' },
    { id: 'auto', label: 'السيارات والميكانيك', icon: '🚗' },
    { id: 'general', label: 'خدمات وأشغال عامة', icon: '👷' }
  ];

  const CRAFT_CATS = [
    { id: 'all', label: 'الكل', icon: '🛠️', group: 'all' },
    { id: 'plumbing', label: 'سبّاك (بلومبيي)', icon: '🔧', group: 'home' },
    { id: 'electric', label: 'كهربائي منازل', icon: '⚡', group: 'home' },
    { id: 'heating', label: 'تدفئة وغاز وسخّانات', icon: '🔥', group: 'home' },
    { id: 'hvac', label: 'تبريد وتكييف (فريغوريست)', icon: '❄️', group: 'tech' },
    { id: 'ac', label: 'تبريد ومكيفات', icon: '❄️', group: 'tech' },
    { id: 'appliances', label: 'إصلاح كهرومنزلية', icon: '🧺', group: 'tech' },
    { id: 'mason', label: 'بنّاء وتليس وزليز', icon: '🧱', group: 'home' },
    { id: 'painter', label: 'دهّان وديكور وجبس', icon: '🎨', group: 'home' },
    { id: 'carpenter', label: 'نجّار خشب وألمنيوم', icon: '🪚', group: 'home' },
    { id: 'welder', label: 'حدّاد ولحام (سودور)', icon: '⚙️', group: 'home' },
    { id: 'auto', label: 'ميكانيكي سيارات', icon: '🚗', group: 'auto' },
    { id: 'auto_elec', label: 'كهربائي سيارات', icon: '🔋', group: 'auto' },
    { id: 'handyman', label: 'صيانة عامة متعددة', icon: '🛠️', group: 'general' },
    { id: 'worker', label: 'عامل يومي / نقل ومساعدة', icon: '👷', group: 'general' }
  ];

  // 4) مرصد الأسعار الاسترشادية للحرفيين في تونس (د.ت)
  const CRAFT_PRICE_GUIDE = {
    plumbing: [
      { task: 'تغيير حنفية أو خلاط ماء', range: '20 – 35 د.ت' },
      { task: 'إصلاح تسرب أنبوب أو سيفون', range: '25 – 50 د.ت' },
      { task: 'تركيب سخّان ماء (Chauffe-eau)', range: '40 – 70 د.ت' }
    ],
    electric: [
      { task: 'كشف عطب كهربائي وإصلاح قاطع', range: '25 – 45 د.ت' },
      { task: 'تركيب ثريا أو نقاط إنارة', range: '15 – 30 د.ت' },
      { task: 'تحديث لوحة كهرباء منزلية', range: '60 – 120 د.ت' }
    ],
    heating: [
      { task: 'صيانة وتنظيف سخّان غاز', range: '30 – 50 د.ت' },
      { task: 'فحص وإصلاح تسرب غاز', range: '30 – 60 د.ت' }
    ],
    hvac: [
      { task: 'تنظيف وصيانة مكيف (Entretien)', range: '35 – 55 د.ت' },
      { task: 'شحن غاز المكيف (Gaz)', range: '60 – 110 د.ت' },
      { task: 'تركيب مكيف جديد (Installation)', range: '90 – 150 د.ت' }
    ],
    ac: [
      { task: 'تنظيف وصيانة مكيف (Entretien)', range: '35 – 55 د.ت' },
      { task: 'شحن غاز المكيف (Gaz)', range: '60 – 110 د.ت' },
      { task: 'تركيب مكيف جديد (Installation)', range: '90 – 150 د.ت' }
    ],
    appliances: [
      { task: 'تشخيص وإصلاح غسالة ملابس', range: '30 – 65 د.ت' },
      { task: 'إصلاح ثلاجة أو مجمد', range: '35 – 80 د.ت' }
    ],
    auto: [
      { task: 'تغيير زيت وفلاتر (Vidange)', range: '20 – 35 د.ت' },
      { task: 'تغيير فرامل (Plaquettes)', range: '25 – 45 د.ت' },
      { task: 'تدخّل ميداني لعطل طارئ', range: '40 – 80 د.ت' }
    ],
    auto_elec: [
      { task: 'فحص بالكمبيوتر (Diagnostic)', range: '25 – 40 د.ت' },
      { task: 'إصلاح دينامو أو ديمارور', range: '40 – 90 د.ت' }
    ],
    handyman: [
      { task: 'تدخّل صيانة منزلية سريعة', range: '20 – 40 د.ت' }
    ],
    worker: [
      { task: 'أجرة يوم عمل كامل', range: '40 – 60 د.ت' },
      { task: 'نصف يوم / مساعدة سريعة', range: '20 – 35 د.ت' }
    ]
  };

  // 5) تصنيفات الصيانة العاجلة
  const EMERG_CATS = [
    { id: 'all', label: 'الكل', icon: '🚨' },
    { id: 'سبّاك طوارئ', label: 'سبّاك طوارئ', icon: '🔧' },
    { id: 'كهربائي طوارئ', label: 'كهربائي طوارئ', icon: '⚡' },
    { id: 'تسرب غاز', label: 'تسرب غاز', icon: '🔥' },
    { id: 'عطل سيارة', label: 'عطل سيارة', icon: '🚗' },
    { id: 'مساعدة عاجلة', label: 'مساعدة عاجلة', icon: '🛠️' }
  ];

  // 6) قواعد الرقابة الذاتية: منع الخمور والممنوعات والألفاظ السوقية
  const MODERATION_RULES = {
    alcohol: [
      'خمر', 'خمور', 'بيرة', 'ببيره', 'شراب كحولي', 'كحول للبيع', 'ويسكي', 'فودكا', 'نبيذ', 'شامبانيا', 'بوخة', 'سيلتيا', 'لاقي مخمر',
      'alcool', 'biere', 'bière', 'whisky', 'whiskey', 'vodka', 'vin rouge', 'vin blanc', 'champagne', 'celtia', 'boukha', 'heineken'
    ],
    contraband: [
      'مخدرات', 'زطلة', 'زطله', 'حشيش', 'كوكايين', 'هيروين', 'اكستازي', 'اقراص مخدرة', 'اريكا مخدر', 'باركيزول', 'ليريكا',
      'drogue', 'cannabis', 'cocaine', 'heroine', 'zatla', 'extasy', 'tramadol', 'pregabaline',
      'سلاح ناري', 'مسدس', 'بندقية صيد بدون رخصة', 'ذخيرة', 'متفجرات', 'صاعق كهربائي', 'pistolet', 'arme a feu', 'arme à feu'
    ],
    profanity: [
      'قحب', 'منيك', 'منيوك', 'عاهرة', 'شرموط', 'زبي', 'كس ام', 'نيك', 'ميبون', 'طحان', 'كلب ابن', 'ابن الحرام',
      'putain', 'salope', 'connard', 'encule', 'enculé', 'fdp', 'nik', 'kahba', 'miboune', 'tahan'
    ]
  };

  const SEED_OFFERS = [];
  const SEED_CRAFTS = [];
  const SEED_EMERGENCIES = [];

  return {
    HR,
    VERSION,
    OFFER_TTL_HOURS,
    NON_FOOD_TTL_HOURS,
    NON_FOOD_CATS,
    isNonFoodCat,
    STORAGE_BUCKET,
    SUPABASE,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    ADMIN_EMAILS,
    ADMIN_USER_IDS,
    TN_GOVERNORATES,
    MARKET_CATS,
    CRAFT_GROUPS,
    CRAFT_CATS,
    CRAFT_PRICE_GUIDE,
    EMERG_CATS,
    MODERATION_RULES,
    SEED_OFFERS,
    SEED_CRAFTS,
    SEED_EMERGENCIES
  };
})();