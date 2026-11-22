// خوذ بايك — الإعدادات والولايات التونسية الـ 24 والفئات ودليل الأسعار والرقابة الذاتية (v1.4-TN)
window.KB_CONFIG = (() => {
  'use strict';

  const SUPABASE = {
    url: 'https://tlgfwkbsgaiyylhhmywv.supabase.co',
    anonKey: 'sb_publishable_oW2H_1p5MCX82_bJOObyfA_AplDj2bk'
  };

  const VERSION = 'v1.4-TN';
  const OFFER_TTL_HOURS = 72; // 3 أيام
  const STORAGE_BUCKET = 'offer-images';
  const HR = 3600 * 1000;

  const TN_GOVERNORATES = [
    { id: 'Gabès', ar: 'قابس', lat: 33.8815, lng: 10.0982 },
    { id: 'Tunis', ar: 'تونس', lat: 36.8065, lng: 10.1815 },
    { id: 'Ariana', ar: 'أريانة', lat: 36.8665, lng: 10.1647 },
    { id: 'Ben Arous', ar: 'بن عروس', lat: 36.7531, lng: 10.2189 },
    { id: 'Manouba', ar: 'منوبة', lat: 36.8101, lng: 10.0956 },
    { id: 'Nabeul', ar: 'نابل', lat: 36.4561, lng: 10.7376 },
    { id: 'Zaghouan', ar: 'زغوان', lat: 36.4029, lng: 10.1429 },
    { id: 'Bizerte', ar: 'بنزرت', lat: 37.2744, lng: 9.8739 },
    { id: 'Béja', ar: 'باجة', lat: 36.7256, lng: 9.1817 },
    { id: 'Jendouba', ar: 'جندوبة', lat: 36.5011, lng: 8.7802 },
    { id: 'Kef', ar: 'الكاف', lat: 36.1742, lng: 8.7049 },
    { id: 'Siliana', ar: 'سليانة', lat: 36.0850, lng: 9.3708 },
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

  // فئات السوق بالترتيب اليومي الجديد: الخضر والغلال أولاً ثم اللحوم ثم الحوت ثم الألبان ثم العولة ثم البقية
  const MARKET_CATS = [
    { id: 'all', label: 'كل العروض', icon: '✨' },
    { id: 'produce', label: 'خضر وغلال', icon: '🥬' },
    { id: 'meat', label: 'لحوم ودواجن وبيض', icon: '🥩' },
    { id: 'fish', label: 'حوت وسردينة', icon: '🐟' },
    { id: 'dairy', label: 'ألبان وأجبان', icon: '🧀' },
    { id: 'farm', label: 'عولة ومنتوجات فلاحية', icon: '🫒' },
    { id: 'bakery', label: 'مخابز وطابونة وملاوي', icon: '🥖' },
    { id: 'grocery', label: 'عطّار ومواد غذائية', icon: '🛒' },
    { id: 'sweets', label: 'أكل وحلويات منزلية', icon: '🍲' },
    { id: 'streetfood', label: 'أكل شعبي', icon: '🥪' },
    { id: 'livestock', label: 'أغنام وأبقار ومواشي', icon: '🐑' },
    { id: 'vehicles', label: 'سيارات ودراجات', icon: '🚗' },
    { id: 'frip', label: 'نصب فريب وملابس', icon: '👕' },
    { id: 'shoes', label: 'نصب أحذية وحقائب', icon: '👟' },
    { id: 'homeware', label: 'أواني ولوازم منزلية', icon: '🍽️' },
    { id: 'cleaning', label: 'مواد تنظيف وعطور', icon: '🧴' },
    { id: 'phones', label: 'إكسسوارات هواتف', icon: '🔌' },
    { id: 'sewing', label: 'خياطة وحرف منزلية', icon: '🧵' },
    { id: 'used', label: 'مستعمل وأوكازيون', icon: '🛋️' },
    { id: 'plants', label: 'مشاتل ونباتات', icon: '🪴' },
    { id: 'gas', label: 'موزعون صغار (غاز ومواد)', icon: '🛢️' },
    { id: 'pets', label: 'حيوانات أليفة وطيور', icon: '🐦' }
  ];

  // مجموعات وتخصصات الحرفيين
  const CRAFT_GROUPS = [
    { id: 'all', label: 'الكل', icon: '' },
    { id: 'home', label: 'صيانة المنزل', icon: '🏠' },
    { id: 'auto', label: 'مهن السيارات', icon: '🚗' },
    { id: 'build', label: 'البناء والأبواب', icon: '🧱' }
  ];

  const CRAFT_CATS = [
    { id: 'all', label: 'الكل', icon: '🛠️', group: 'all' },
    { id: 'plumbing', label: 'سبّاك', icon: '🔧', group: 'home' },
    { id: 'electric', label: 'كهربائي', icon: '⚡', group: 'home' },
    { id: 'ac', label: 'فريغوريست وتبريد ومكيفات', icon: '❄️', group: 'home' },
    { id: 'appliances', label: 'تصليح آلات غسيل وكهرومنزلية', icon: '🧺', group: 'home' },
    { id: 'heating', label: 'شوفاج وسخان ماء', icon: '🔥', group: 'home' },
    { id: 'build', label: 'بنّاء', icon: '🧱', group: 'build' },
    { id: 'tiler', label: 'جليزي ورخّامي', icon: '⬜', group: 'build' },
    { id: 'painter', label: 'دهّان', icon: '🖌️', group: 'build' },
    { id: 'waterproof', label: 'عزل مائي', icon: '🌧️', group: 'build' },
    { id: 'plaster', label: 'جبّاص', icon: '🏛️', group: 'build' },
    { id: 'carpenter', label: 'نجّار', icon: '🪚', group: 'build' },
    { id: 'alu', label: 'ألمنيوم و PVC', icon: '🪟', group: 'build' },
    { id: 'shutters', label: 'ريدوات وأبواب أوتوماتيك', icon: '🚪', group: 'build' },
    { id: 'welder', label: 'حدّاد وتلحيم', icon: '⚒️', group: 'build' },
    { id: 'locksmith', label: 'فني أقفال', icon: '🔑', group: 'home' },
    { id: 'glass', label: 'زجّاج', icon: '🪞', group: 'build' },
    { id: 'tanks', label: 'تنظيف مواجل وخزانات', icon: '💧', group: 'home' },
    { id: 'pest', label: 'مكافحة حشرات', icon: '🐜', group: 'home' },
    { id: 'handyman', label: 'بريكولور', icon: '🔨', group: 'home' },
    { id: 'worker', label: 'عامل يومي', icon: '👷', group: 'home' },
    { id: 'auto', label: 'ميكانيكي سيارات', icon: '🚗', group: 'auto' },
    { id: 'auto_elec', label: 'كهربائي سيارات', icon: '🔋', group: 'auto' }
  ];

  // دليل أسعار استرشادي تقريبي للمهن في تونس (على غرار مرصد Afous — يد عاملة دون قطع الغيار)
  const CRAFT_PRICE_GUIDE = {
    plumbing: [
      { task: 'فتح مجاري / بالوعة مسدودة', range: '40 – 80 د.ت' },
      { task: 'تغيير حنفية أو خلاّط ماء', range: '30 – 50 د.ت' },
      { task: 'إصلاح تسرب أنبوب ظاهر', range: '45 – 90 د.ت' }
    ],
    electric: [
      { task: 'تغيير ديجنكتور أو قاطع كهربائي', range: '35 – 70 د.ت' },
      { task: 'كشف عطل كهربائي منزلي (تشخيص)', range: '30 – 50 د.ت' },
      { task: 'تركيب طابلو كهربائي منزلي', range: '150 – 300 د.ت' }
    ],
    ac: [
      { task: 'تركيب مكيف هواء 12000 BTU', range: '120 – 180 د.ت' },
      { task: 'تنظيف وصيانة شاملة للمكيف', range: '50 – 80 د.ت' },
      { task: 'شحن غاز المكيف (حسب النوع)', range: '60 – 110 د.ت' }
    ],
    appliances: [
      { task: 'كشف عطل آلة غسيل أو ثلاجة', range: '30 – 45 د.ت' },
      { task: 'تغيير مضخة تصريف آلة غسيل', range: '60 – 110 د.ت' }
    ],
    heating: [
      { task: 'تركيب سخان ماء (شوفان غاز/كهرباء)', range: '60 – 100 د.ت' },
      { task: 'صيانة وتنظيف شوفان غاز', range: '40 – 70 د.ت' }
    ],
    build: [
      { task: 'يومية بنّاء محترف', range: '70 – 100 د.ت' },
      { task: 'بناء وترميم جدار (بالمتر المربع)', range: '25 – 45 د.ت / م²' }
    ],
    tiler: [
      { task: 'تركيب جليز / فايونس (يد عاملة)', range: '18 – 30 د.ت / م²' },
      { task: 'تركيب رخام مطبخ أو درج', range: '35 – 60 د.ت / م²' }
    ],
    painter: [
      { task: 'دهان غرفة متوسطة (يد عاملة)', range: '120 – 220 د.ت' },
      { task: 'دهان معجون + طبقتين (بالمتر)', range: '8 – 15 د.ت / م²' }
    ],
    waterproof: [
      { task: 'عزل سطح بالزفت أو الراتنج', range: '20 – 40 د.ت / م²' }
    ],
    plaster: [
      { task: 'سقف جبس (Faux plafond)', range: '28 – 48 د.ت / م²' }
    ],
    carpenter: [
      { task: 'تعديل أو إصلاح باب خشبي', range: '35 – 70 د.ت' },
      { task: 'تركيب قفل أو مفصلات باب', range: '30 – 50 د.ت' }
    ],
    alu: [
      { task: 'صيانة وتغيير عجلات شباك ألمنيوم', range: '40 – 80 د.ت' }
    ],
    shutters: [
      { task: 'إصلاح ريدو كهربائي أو يدوي', range: '50 – 110 د.ت' },
      { task: 'تغيير محرك ريدو (يد عاملة)', range: '70 – 120 د.ت' }
    ],
    welder: [
      { task: 'تلحيم وتصليح باب حديدي', range: '40 – 90 د.ت' }
    ],
    locksmith: [
      { task: 'فتح باب مقفل (طوارئ)', range: '40 – 80 د.ت' },
      { task: 'تغيير قلب القفل (Cylindre)', range: '30 – 60 د.ت' }
    ],
    glass: [
      { task: 'تغيير بلور نافذة عادية', range: '35 – 75 د.ت' }
    ],
    tanks: [
      { task: 'تنظيف وتعقيم ماجل أو خزان ماء', range: '80 – 160 د.ت' }
    ],
    pest: [
      { task: 'رش ومعالجة شقة ضد الحشرات', range: '70 – 140 د.ت' }
    ],
    handyman: [
      { task: 'تدخل منزلي سريع (ساعة عمل)', range: '30 – 50 د.ت' }
    ],
    worker: [
      { task: 'أجرة عامل يومي (يوم عمل)', range: '40 – 60 د.ت' }
    ],
    auto: [
      { task: 'تشخيص إلكتروني بالديانوستيك (OBD)', range: '30 – 50 د.ت' },
      { task: 'تغيير زيت وفلاتر (يد عاملة)', range: '25 – 45 د.ت' },
      { task: 'تدخل عاجل على الطريق (بطارية/عطل)', range: '40 – 90 د.ت' }
    ],
    auto_elec: [
      { task: 'فحص دينامو / ديمارور وبطارية', range: '30 – 60 د.ت' },
      { task: 'إصلاح عطل كهرباء سيارة', range: '50 – 120 د.ت' }
    ]
  };

  const EMERG_CATS = [
    { id: 'all', label: 'الكل', icon: '🚨' },
    { id: 'سبّاك طوارئ', label: 'سبّاك طوارئ', icon: '🔧' },
    { id: 'كهربائي طوارئ', label: 'كهربائي طوارئ', icon: '⚡' },
    { id: 'تسرب غاز', label: 'تسرب غاز', icon: '🔥' },
    { id: 'عطل سيارة', label: 'عطل سيارة', icon: '🚗' },
    { id: 'مساعدة عاجلة', label: 'مساعدة عاجلة', icon: '🆘' }
  ];

  // قواعد الرقابة الذاتية: منع الخمور والممنوعات والألفاظ السوقية
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

  // لا بيانات وهمية في الإنتاج (تُجلب البيانات الحقيقية مباشرة من Supabase)
  const SEED_OFFERS = [];
  const SEED_CRAFTS = [];
  const SEED_EMERGENCIES = [];

  return {
    SUPABASE, VERSION, OFFER_TTL_HOURS, STORAGE_BUCKET, HR,
    TN_GOVERNORATES, MARKET_CATS, CRAFT_GROUPS, CRAFT_CATS, CRAFT_PRICE_GUIDE,
    EMERG_CATS, MODERATION_RULES,
    SEED_OFFERS, SEED_CRAFTS, SEED_EMERGENCIES
  };
})();