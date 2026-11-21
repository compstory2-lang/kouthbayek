// خوذ بايك — الإعدادات والولايات التونسية الـ 24 والفئات الكاملة (v1.2-TN)
window.KB_CONFIG = (() => {
  'use strict';

  const SUPABASE = {
    url: 'https://tlgfwkbsgaiyylhhmywv.supabase.co',
    anonKey: 'sb_publishable_oW2H_1p5MCX82_bJOObyfA_AplDj2bk'
  };

  const VERSION = 'v1.2-TN';
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

  // فئات السوق اليومي (بنفس بطاقات الشبكة الثنائية المطلوبة + السيارات والدراجات)
  const MARKET_CATS = [
    { id: 'all', label: 'كل العروض', icon: '✨' },
    { id: 'vehicles', label: 'سيارات ودراجات', icon: '🚗' },
    { id: 'livestock', label: 'أغنام وأبقار ومواشي', icon: '🐑' },
    { id: 'fish', label: 'حوت وسردينة طازجة', icon: '🐟' },
    { id: 'farm', label: 'عولة ومنتوجات فلاحية', icon: '🫒' },
    { id: 'frip', label: 'نصب فريب وملابس', icon: '👕' },
    { id: 'shoes', label: 'نصب أحذية وحقائب', icon: '👟' },
    { id: 'homeware', label: 'أواني ولوازم منزلية', icon: '🍽️' },
    { id: 'cleaning', label: 'مواد تنظيف وعطور', icon: '🧴' },
    { id: 'phones', label: 'إكسسوارات هواتف', icon: '🔌' },
    { id: 'sweets', label: 'أكل وحلويات منزلية', icon: '🍲' },
    { id: 'sewing', label: 'خياطة وحرف منزلية', icon: '🧵' },
    { id: 'meat', label: 'لحم ودواجن وبيض', icon: '🥩' },
    { id: 'dairy', label: 'ألبان وأجبان', icon: '🧀' },
    { id: 'bakery', label: 'مخابز وطابونة وملاوي', icon: '🥖' },
    { id: 'grocery', label: 'عطّار ومواد غذائية', icon: '🛒' },
    { id: 'streetfood', label: 'أكل شعبي', icon: '🥪' },
    { id: 'used', label: 'مستعمل وأوكازيون', icon: '🛋️' },
    { id: 'plants', label: 'مشاتل ونباتات', icon: '🪴' },
    { id: 'gas', label: 'موزعون صغار (غاز ومواد)', icon: '🛢️' },
    { id: 'pets', label: 'حيوانات أليفة وطيور', icon: '🐦' }
  ];

  // مجموعات وتخصصات الحرفيين الكاملة (كما في الصور)
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

  const EMERG_CATS = [
    { id: 'all', label: 'الكل', icon: '🚨' },
    { id: 'سبّاك طوارئ', label: 'سبّاك طوارئ', icon: '🔧' },
    { id: 'كهربائي طوارئ', label: 'كهربائي طوارئ', icon: '⚡' },
    { id: 'تسرب غاز', label: 'تسرب غاز', icon: '🔥' },
    { id: 'عطل سيارة', label: 'عطل سيارة', icon: '🚗' },
    { id: 'مساعدة عاجلة', label: 'مساعدة عاجلة', icon: '🆘' }
  ];

  const nowMs = Date.now();
  const SEED_OFFERS = [
    {
      id: 'of-fish1', title: 'سردينة طازجة ومرجان صيد الصباح — باب بحر قابس', price: 5.5, cat: 'fish',
      gov: 'قابس', seller: 'عم الطاهر للحوت • كرهبة ونصبة متنقلة', phone: '55192340',
      desc: 'سردينة طازجة: 5.500 د / كغ • مرجان صيد اليوم • التوصيل قرب باب بحر قابس.',
      imageUrl: '', status: 'active', userId: '',
      lat: 33.8861, lng: 10.1065, createdAt: nowMs - 1 * HR, expiresAt: nowMs + 71 * HR
    },
    {
      id: 'of-liv1', title: 'علوش بركوس وعجول للتسمين والذبح — شنني قابس', price: 890, cat: 'livestock',
      gov: 'قابس', seller: 'مزرعة الحاج مبروك للمواشي • مشروع فلاحي', phone: '98332145',
      desc: 'علوش بركوس مسمّن علف طبيعي، المعاينة يومياً في شنني قابس.',
      imageUrl: '', status: 'active', userId: '',
      lat: 33.8762, lng: 10.0721, createdAt: nowMs - 2 * HR, expiresAt: nowMs + 70 * HR
    },
    {
      id: 'of-v1', title: 'رينو كليو 4 (Clio 4) بنزين بحالة ممتازة', price: 31500, cat: 'vehicles',
      gov: 'قابس', seller: 'أمين — قابس المدينة', phone: '98224110',
      desc: 'موديل 2017 • 138,000 كم • بنزين 4 خيول • مكيف بارد، دهان أصلي، أوراق خالصة.',
      imageUrl: '', status: 'active', userId: '',
      lat: 33.8824, lng: 10.0975, createdAt: nowMs - 3 * HR, expiresAt: nowMs + 69 * HR
    },
    {
      id: 'of-v2', title: 'دراجة نارية Forza 110cc + دراجة هوائية VTT', price: 2450, cat: 'vehicles',
      gov: 'قابس', seller: 'يوسف — حي الأمل', phone: '55190822',
      desc: 'موديل 2022 • محرك نظيف، بطاقة رمادية جاهزة، إطارات جديدة.',
      imageUrl: '', status: 'active', userId: '',
      lat: 33.8708, lng: 10.1091, createdAt: nowMs - 5 * HR, expiresAt: nowMs + 67 * HR
    },
    {
      id: 'of-1', title: '5 لترات زيت زيتون بكر عصرة أولى (مطماطة)', price: 110, cat: 'farm',
      gov: 'قابس', seller: 'الحاج بلقاسم — شنني', phone: '22415678',
      desc: 'زيت زيتون عصرة باردة لموسم هذا العام، تعبئة نظيفة وتوصيل داخل قابس.',
      imageUrl: '', status: 'active', userId: '',
      lat: 33.8790, lng: 10.0810, createdAt: nowMs - 4 * HR, expiresAt: nowMs + 68 * HR
    },
    {
      id: 'of-v3', title: 'بيجو 206+ بنزين اقتصادية جداً', price: 21000, cat: 'vehicles',
      gov: 'صفاقس', seller: 'كريم — طريق تنيور', phone: '22883344',
      desc: 'موديل 2012 • 165,000 كم • بنزين 4 خيول • صيانة دورية منتظمة.',
      imageUrl: '', status: 'active', userId: '',
      lat: 34.7460, lng: 10.7555, createdAt: nowMs - 6 * HR, expiresAt: nowMs + 66 * HR
    }
  ];

  const SEED_CRAFTS = [
    { id: 'cr-1', name: 'المعلم سامي للتبريد والمكيفات', spec: 'ac', gov: 'قابس', area: 'قابس المدينة', rating: 4.9, reviews: 38, phone: '98412230', note: 'تركيب وصيانة وتنظيف وشحن غاز جميع المكيفات — تنقّل سريع', lat: 33.8832, lng: 10.0998 },
    { id: 'cr-2', name: 'ورشة النور للكهرباء المنزلية', spec: 'electric', gov: 'قابس', area: 'حي الأمل', rating: 4.8, reviews: 24, phone: '22671190', note: 'كشف أعطال الديجنكتور، تركيب طابلو كهربائي، تدخل عاجل', lat: 33.8712, lng: 10.1078 },
    { id: 'cr-3', name: 'عمّي فتحي للسباكة والصحية', spec: 'plumbing', gov: 'قابس', area: 'غنوش', rating: 4.7, reviews: 31, phone: '55109843', note: 'إصلاح تسربات المياه، تركيب سخان ماء (شوفان)، شبكات صحية', lat: 33.9382, lng: 10.0652 },
    { id: 'cr-4', name: 'كراج الأمان ميكانيك وتشخيص', spec: 'auto', gov: 'قابس', area: 'طريق مدنين', rating: 4.9, reviews: 52, phone: '29884512', note: 'تشخيص إلكتروني بالديانوستيك (OBD)، ميكانيك عام وتدخل على الطريق', lat: 33.8620, lng: 10.1011 }
  ];

  const SEED_EMERGENCIES = [
    { id: 'em-1', type: 'عطل سيارة', gov: 'قابس', desc: 'عطل في بطارية السيارة قرب مفترق طريق الحامة، أحتاج مساعدة بكابل تشغيل.', phone: '55412098', lat: 33.8891, lng: 10.0522, createdAt: nowMs - 25 * 60 * 1000, status: 'open', claimedBy: '' },
    { id: 'em-2', type: 'سبّاك طوارئ', gov: 'قابس', desc: 'انفجار أنبوب ماء رئيسي أمام مدخل عمارة بحي الأمل 2، نحتاج سباك مستعجل.', phone: '22908711', lat: 33.8685, lng: 10.1125, createdAt: nowMs - 55 * 60 * 1000, status: 'open', claimedBy: '' }
  ];

  return {
    SUPABASE, VERSION, OFFER_TTL_HOURS, STORAGE_BUCKET, HR,
    TN_GOVERNORATES, MARKET_CATS, CRAFT_GROUPS, CRAFT_CATS, EMERG_CATS,
    SEED_OFFERS, SEED_CRAFTS, SEED_EMERGENCIES
  };
})();