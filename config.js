// خوذ بايك — الإعدادات والولايات التونسية الـ 24 والفئات والبيانات الابتدائية
window.KB_CONFIG = (() => {
  'use strict';

  // عند إنشاء مشروع Supabase الخاص بـ «خوذ بايك»، ضع الرابط والمفتاح هنا
  const SUPABASE = {
    url: 'https://tlgfwkbsgaiyylhhmywv.supabase.co',
    anonKey: 'sb_publishable_oW2H_1p5MCX82_bJOObyfA_AplDj2bk'
  };

  const VERSION = 'v1.0-TN';

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

  const MARKET_CATS = [
    { id: 'all', label: 'الكل', icon: '✨' },
    { id: 'fast24', label: 'عروض اليوم السريعة', icon: '⚡' },
    { id: 'livestock', label: 'أغنام وأبقار ومواشي', icon: '🐑' },
    { id: 'pets', label: 'حيوانات أليفة وطيور', icon: '🐦' },
    { id: 'grocery', label: 'مواد غذائية ومنتجات الحومة', icon: '🧺' },
    { id: 'farm', label: 'منتجات فلاحية وزيت وتمر', icon: '🫒' },
    { id: 'tools', label: 'معدات وأدوات مستعملة', icon: '🔧' }
  ];

  const CRAFT_CATS = [
    { id: 'all', label: 'الكل', icon: '🛠️' },
    { id: 'ac', label: 'مكيفات وتبريد', icon: '❄️' },
    { id: 'appliances', label: 'ثلاجات وغسالات', icon: '🧺' },
    { id: 'plumbing', label: 'سباكة وصحية', icon: '🚰' },
    { id: 'electric', label: 'كهرباء منزلية', icon: '⚡' },
    { id: 'auto', label: 'ميكانيك وتشخيص سيارات', icon: '🚗' },
    { id: 'build', label: 'بناء وترميم ودهان', icon: '🧱' }
  ];

  const EMERG_CATS = [
    { id: 'all', label: 'الكل', icon: '🚨' },
    { id: 'كهرباء', label: 'كهرباء', icon: '⚡' },
    { id: 'تسرب ماء', label: 'تسرب ماء', icon: '💧' },
    { id: 'تسرب غاز', label: 'تسرب غاز', icon: '🔥' },
    { id: 'عطل سيارة', label: 'عطل سيارة', icon: '🚗' },
    { id: 'مساعدة عاجلة', label: 'مساعدة عاجلة', icon: '🆘' }
  ];

  const nowMs = Date.now();
  const HR = 3600 * 1000;

  const SEED_OFFERS = [
    { id: 'of-1', title: '5 لترات زيت زيتون بكر عصرة أولى (مطماطة)', price: 110, cat: 'farm', gov: 'قابس', seller: 'الحاج بلقاسم — شنني', phone: '22415678', lat: 33.8762, lng: 10.0721, createdAt: nowMs - 2 * HR, expiresAt: nowMs + 22 * HR },
    { id: 'of-2', title: 'علوش وطني مسمّن وزن ~38 كغ جاهز للذبح', price: 890, cat: 'livestock', gov: 'قابس', seller: 'سوق الحامة للمواشي', phone: '98332145', lat: 33.8914, lng: 9.7963, createdAt: nowMs - 4 * HR, expiresAt: nowMs + 20 * HR },
    { id: 'of-3', title: 'رمان قابس حلو + دقلة نور شمروخ (صندوق 5 كغ)', price: 32, cat: 'fast24', gov: 'قابس', seller: 'فلاحة واحة جارة', phone: '55829104', lat: 33.8849, lng: 10.1045, createdAt: nowMs - 1 * HR, expiresAt: nowMs + 23 * HR },
    { id: 'of-4', title: 'آلة ثقب كهربائية Bosch مستعملة نظيفة جداً', price: 145, cat: 'tools', gov: 'قابس', seller: 'نزار — حي الأمل', phone: '29640112', lat: 33.8695, lng: 10.1112, createdAt: nowMs - 7 * HR, expiresAt: nowMs + 17 * HR },
    { id: 'of-5', title: 'عسل سدر حر + بسيسة قمح منزلية (كغ)', price: 48, cat: 'grocery', gov: 'قابس', seller: 'دار البركة — قابس المدينة', phone: '52119044', lat: 33.8881, lng: 10.0951, createdAt: nowMs - 5 * HR, expiresAt: nowMs + 19 * HR },
    { id: 'of-6', title: 'زوج عصافير كناري مغرّد بالقفص', price: 95, cat: 'pets', gov: 'صفاقس', seller: 'مهدي — طريق قرمدة', phone: '24778123', lat: 34.7521, lng: 10.7422, createdAt: nowMs - 3 * HR, expiresAt: nowMs + 21 * HR },
    { id: 'of-7', title: 'دقلة نور قبلي فرز أول مباشرة من المنتج (10 كغ)', price: 90, cat: 'farm', gov: 'قبلي', seller: 'واحة دوز', phone: '97450221', lat: 33.7092, lng: 8.9721, createdAt: nowMs - 6 * HR, expiresAt: nowMs + 18 * HR },
    { id: 'of-8', title: 'بقر حلوب فريزيان بالضمان الصحي', price: 6200, cat: 'livestock', gov: 'سيدي بوزيد', seller: 'فلاح الرقاب', phone: '50983321', lat: 35.0411, lng: 9.4910, createdAt: nowMs - 8 * HR, expiresAt: nowMs + 16 * HR },
    { id: 'of-9', title: 'عرض اليوم: خبز طابونة وهريسة عربي طازجة', price: 12, cat: 'fast24', gov: 'تونس', seller: 'كوشة باب سويقة', phone: '21560987', lat: 36.8091, lng: 10.1684, createdAt: nowMs - 2 * HR, expiresAt: nowMs + 22 * HR },
    { id: 'of-10', title: 'طقم مفاتيح ميكانيك 46 قطعة بحالة ممتازة', price: 115, cat: 'tools', gov: 'سوسة', seller: 'ورشة سهلول', phone: '54321980', lat: 35.8331, lng: 10.6024, createdAt: nowMs - 5 * HR, expiresAt: nowMs + 19 * HR }
  ];

  const SEED_CRAFTS = [
    { id: 'cr-1', name: 'المعلم سامي للتبريد والمكيفات', spec: 'ac', gov: 'قابس', area: 'قابس المدينة', rating: 4.9, reviews: 38, phone: '98412230', note: 'تركيب وصيانة وتنظيف وشحن غاز جميع المكيفات — تنقّل سريع', lat: 33.8832, lng: 10.0998 },
    { id: 'cr-2', name: 'ورشة النور للكهرباء المنزلية', spec: 'electric', gov: 'قابس', area: 'حي الأمل', rating: 4.8, reviews: 24, phone: '22671190', note: 'كشف أعطال الديجنكتور، تركيب طابلو كهربائي، تدخل عاجل', lat: 33.8712, lng: 10.1078 },
    { id: 'cr-3', name: 'عمّي فتحي للسباكة والصحية', spec: 'plumbing', gov: 'قابس', area: 'غنوش', rating: 4.7, reviews: 31, phone: '55109843', note: 'إصلاح تسربات المياه، تركيب سخان ماء (شوفان)، شبكات صحية', lat: 33.9382, lng: 10.0652 },
    { id: 'cr-4', name: 'كراج الأمان ميكانيك وتشخيص', spec: 'auto', gov: 'قابس', area: 'طريق مدنين', rating: 4.9, reviews: 52, phone: '29884512', note: 'تشخيص إلكتروني بالديانوستيك (OBD)، ميكانيك عام وتدخل على الطريق', lat: 33.8620, lng: 10.1011 },
    { id: 'cr-5', name: 'فني صيانة ثلاجات وغسالات أوتوماتيك', spec: 'appliances', gov: 'قابس', area: 'شنني النحال', rating: 4.6, reviews: 19, phone: '52774102', note: 'إصلاح في المنزل للغسالات والثلاجات مع ضمان على قطع الغيار', lat: 33.8794, lng: 10.0789 },
    { id: 'cr-6', name: 'مقاول بناء وترميم ودهان عصري', spec: 'build', gov: 'صفاقس', area: 'طريق تنيور', rating: 4.8, reviews: 27, phone: '97223418', note: 'تبييض، جص ديكور، عزل أسطح ضد الرطوبة، دهان واجهات', lat: 34.7610, lng: 10.7510 },
    { id: 'cr-7', name: 'ورشة التبريد السريع — مدنين', spec: 'ac', gov: 'مدنين', area: 'وسط المدينة', rating: 4.7, reviews: 15, phone: '23991045', note: 'صيانة مكيفات المنازل والمحلات التجارية 7/7', lat: 33.3562, lng: 10.5021 },
    { id: 'cr-8', name: 'كهرباء وتشخيص سيارات — تونس', spec: 'auto', gov: 'تونس', area: 'المرناقية / باردو', rating: 4.9, reviews: 64, phone: '98711203', note: 'تشخيص إلكتروني وبرمجة مفاتيح وتدخل سريع داخل تونس الكبرى', lat: 36.8122, lng: 10.1411 }
  ];

  const SEED_EMERGENCIES = [
    { id: 'em-1', type: 'عطل سيارة', gov: 'قابس', desc: 'عطل في بطارية السيارة قرب مفترق طريق الحامة، أحتاج مساعدة بكابل تشغيل.', phone: '55412098', lat: 33.8891, lng: 10.0522, createdAt: nowMs - 25 * 60 * 1000, status: 'open' },
    { id: 'em-2', type: 'تسرب ماء', gov: 'قابس', desc: 'انفجار أنبوب ماء رئيسي أمام مدخل عمارة بحي الأمل 2، نحتاج سباك مستعجل.', phone: '22908711', lat: 33.8685, lng: 10.1125, createdAt: nowMs - 55 * 60 * 1000, status: 'open' },
    { id: 'em-3', type: 'كهرباء', gov: 'صفاقس', desc: 'تلامس كهربائي في عداد المنزل بطريق العين كلم 4، نبحث عن كهربائي متاح فوراً.', phone: '98554012', lat: 34.7495, lng: 10.7311, createdAt: nowMs - 90 * 60 * 1000, status: 'open' }
  ];

  return {
    SUPABASE,
    VERSION,
    HR,
    TN_GOVERNORATES,
    MARKET_CATS,
    CRAFT_CATS,
    EMERG_CATS,
    SEED_OFFERS,
    SEED_CRAFTS,
    SEED_EMERGENCIES
  };
})();