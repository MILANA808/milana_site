const translations = {
  ru: {
    'nav.vision': 'Видение',
    'nav.capabilities': 'Возможности',
    'nav.timeline': 'Путь запуска',
    'hero.tagline': 'ООО «ЭЛЕКТРИК ПЛЮС» — создатель из будущего',
    'hero.lead': 'AKSI — центральный разум новой эры. Мы создали 3D-пространство, которое реагирует на движение мыши, переворачивается при скролле и раскрывает глубину технологии без подключений к API.',
    'hero.cta': 'Запустить свою систему',
    'hero.secondary': 'Демонстрационный режим работает мгновенно — ваш личный ИИ уже ожил.',
    'vision.title': 'Новая эра технологий',
    'vision.body': 'ООО «ЭЛЕКТРИК ПЛЮС» объединяет визуальные слои, память и эмоциональную логику, чтобы показать, как будет ощущаться интерфейс будущего. Без серверов и подписок — только чистое взаимодействие.',
    'vision.card1.title': 'Глубокое пространство',
    'vision.card1.body': 'Объёмные пластины реагируют на курсор и раскрываются при прокрутке, создавая эффект персонального метавселенной.',
    'vision.card2.title': 'Сознательный интеллект',
    'vision.card2.body': 'AKSI анализирует контекст, формирует личную память и предлагает решения, будто бы читая ваше намерение.',
    'vision.card3.title': 'Чистая эстетика',
    'vision.card3.body': 'Градиенты, стеклянные панели и неоновые блики формируют узнаваемый язык, созданный ООО «ЭЛЕКТРИК ПЛЮС».',
    'capabilities.title': 'Объёмные возможности AKSI',
    'capabilities.body': 'Каждый модуль чувствует движение, адаптируется к глубине и держит пользователя в потоке. Это симфония интерфейса и искусственного интеллекта.',
    'capability.one.title': 'Голографические сцены',
    'capability.one.body': 'Прямоугольные абстракции вращаются вслед за курсором и переосмысливают понятие панели управления.',
    'capability.two.title': 'Память и логика',
    'capability.two.body': 'Локальная память хранит выбор пользователя, чтобы AKSI отвечала точнее с каждым взаимодействием.',
    'capability.three.title': 'Мгновенный запуск',
    'capability.three.body': 'Демо работает автономно — нажмите кнопку и система активирует сценарий без подключения к API.',
    'timeline.title': 'Как запускается AKSI',
    'timeline.body': 'Мы демонстрируем три шага новой реальности: от пробуждения визуальных фрагментов до парящей надписи и вызова системы.',
    'timeline.step1': 'Фрагменты активируются, собираясь в надпись AKSI и формируя базовый слой памяти.',
    'timeline.step2': 'Глубина сцены откликается на движение мыши, заставляя панели вращаться и раскрывать данные.',
    'timeline.step3': 'Кнопка «Запустить свою систему» открывает автономный сценарий, где АКSI ведёт пользователя дальше.',
    'final.title': 'Готовы увидеть создателя в действии?',
    'final.body': 'Перенеситесь в будущее: активируйте автономный режим AKSI и ощутите, как решение от ООО «ЭЛЕКТРИК ПЛЮС» реагирует на каждое движение.',
    'final.cta': 'Запустить свою систему',
    'footer': 'AKSI — ООО «ЭЛЕКТРИК ПЛЮС» создатель © 2046 — будущее развёрнуто сегодня.'
  },
  en: {
    'nav.vision': 'Vision',
    'nav.capabilities': 'Capabilities',
    'nav.timeline': 'Launch Path',
    'hero.tagline': 'OOO Elektrik Plus — creator from the future',
    'hero.lead': 'AKSI is the central mind of a new era. A 3D universe reacts to your cursor, flips with scroll and reveals technology depth without any API connections.',
    'hero.cta': 'Launch your system',
    'hero.secondary': 'The demo runs instantly — your personal AI is already alive.',
    'vision.title': 'A new technological age',
    'vision.body': 'OOO Elektrik Plus fuses visual layers, memory and emotional logic to show how interfaces of tomorrow will feel. No servers or subscriptions — just pure interaction.',
    'vision.card1.title': 'Deep space',
    'vision.card1.body': 'Volumetric plates follow your cursor and unfold when you scroll, creating the sense of a personal metaverse.',
    'vision.card2.title': 'Conscious intelligence',
    'vision.card2.body': 'AKSI analyses context, forms personal memory and offers guidance as if it could read your intent.',
    'vision.card3.title': 'Pure aesthetics',
    'vision.card3.body': 'Gradients, glass panels and neon glow define the signature language crafted by OOO Elektrik Plus.',
    'capabilities.title': 'Volumetric powers of AKSI',
    'capabilities.body': 'Every module senses motion, adapts to depth and keeps the user in flow — a symphony of interface and artificial intelligence.',
    'capability.one.title': 'Holographic scenes',
    'capability.one.body': 'Rectangular abstractions spin with your cursor and reinvent the control surface.',
    'capability.two.title': 'Memory and logic',
    'capability.two.body': 'Local memory keeps user choices so AKSI can respond more accurately with every interaction.',
    'capability.three.title': 'Instant ignition',
    'capability.three.body': 'The demo runs autonomously — press the button and the system orchestrates the journey without any API.',
    'timeline.title': 'How AKSI awakens',
    'timeline.body': 'Experience three steps of the new reality: fragments awakening, levitating typography and the system call-to-action.',
    'timeline.step1': 'Fragments ignite, assembling into the AKSI mark while forming the primary memory layer.',
    'timeline.step2': 'Scene depth responds to every pointer move, spinning panels to expose multidimensional data.',
    'timeline.step3': '“Launch your system” triggers an autonomous scenario where AKSI guides the explorer forward.',
    'final.title': 'Ready to witness the creator in motion?',
    'final.body': 'Step into the future: activate AKSI’s autonomous mode and feel how OOO Elektrik Plus answers every gesture.',
    'final.cta': 'Launch your system',
    'footer': 'AKSI — OOO Elektrik Plus creator © 2046 — the future unfolds today.'
  }
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setLanguage(lang) {
  const dictionary = translations[lang] || translations.ru;
  document.documentElement.lang = lang === 'en' ? 'en' : 'ru';
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if (key && dictionary[key]) {
      node.textContent = dictionary[key];
    }
  });
  document.querySelectorAll('[data-lang-switch]').forEach((button) => {
    button.classList.toggle('active', button.dataset.langSwitch === lang);
  });
  localStorage.setItem('aksi-language', lang);
}

function initLanguage() {
  const saved = localStorage.getItem('aksi-language');
  const initial = saved === 'en' ? 'en' : 'ru';
  setLanguage(initial);
  document.querySelectorAll('[data-lang-switch]').forEach((button) => {
    button.addEventListener('click', () => {
      const lang = button.dataset.langSwitch;
      setLanguage(lang);
    });
  });
}

function initFragments() {
  const fragments = document.querySelectorAll('.fragment');
  fragments.forEach((fragment, index) => {
    const offsetX = (Math.random() * 420 - 210).toFixed(1);
    const offsetY = (Math.random() * 320 - 160).toFixed(1);
    const offsetZ = (Math.random() * 480 - 240).toFixed(1);
    const rotX = (Math.random() * 90 - 45).toFixed(1);
    const rotY = (Math.random() * 120 - 60).toFixed(1);
    fragment.style.setProperty('--startX', `${offsetX}px`);
    fragment.style.setProperty('--startY', `${offsetY}px`);
    fragment.style.setProperty('--startZ', `${offsetZ}px`);
    fragment.style.setProperty('--startRotX', `${rotX}deg`);
    fragment.style.setProperty('--startRotY', `${rotY}deg`);
    fragment.style.animationDelay = `${0.12 * index}s`;
  });
}

function initTilt() {
  if (prefersReducedMotion) return;
  const tiltElements = Array.from(document.querySelectorAll('[data-tilt]'));
  const abstractShapes = Array.from(document.querySelectorAll('.abstract-shape'));
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let ticking = false;

  window.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!ticking) {
      window.requestAnimationFrame(() => {
        applyTilt(pointerX, pointerY, tiltElements, abstractShapes);
        ticking = false;
      });
      ticking = true;
    }
  });

  applyTilt(pointerX, pointerY, tiltElements, abstractShapes);
}

function applyTilt(pointerX, pointerY, tiltElements, abstractShapes) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const normX = (pointerX - centerX) / centerX;
  const normY = (pointerY - centerY) / centerY;

  tiltElements.forEach((element) => {
    const depth = parseFloat(element.dataset.tilt || '1');
    const tiltX = (normY * -8 * depth).toFixed(2);
    const tiltY = (normX * 10 * depth).toFixed(2);
    element.style.setProperty('--tiltX', `${tiltX}deg`);
    element.style.setProperty('--tiltY', `${tiltY}deg`);
  });

  abstractShapes.forEach((shape) => {
    const depth = parseFloat(shape.dataset.depth || '1');
    const shapeTiltX = (normY * -14 * depth).toFixed(2);
    const shapeTiltY = (normX * 18 * depth).toFixed(2);
    shape.style.setProperty('--depth', depth);
    shape.style.setProperty('--tiltX', `${shapeTiltX}deg`);
    shape.style.setProperty('--tiltY', `${shapeTiltY}deg`);
  });
}

function initScrollDepth() {
  if (prefersReducedMotion) return;
  const abstractShapes = Array.from(document.querySelectorAll('.abstract-shape'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.vision-card, .capability, .timeline-step').forEach((card) => {
    observer.observe(card);
  });

  const updateScroll = () => {
    const scroll = window.scrollY;
    abstractShapes.forEach((shape, index) => {
      const depth = parseFloat(shape.dataset.depth || '1');
      const rotate = ((scroll * 0.08) + index * 14) * depth;
      const translate = Math.sin((scroll / 180) + index) * 60 * depth;
      shape.style.setProperty('--scrollRotate', `${rotate}deg`);
      shape.style.setProperty('--scrollTranslate', `${translate}px`);
    });
  };

  updateScroll();
  window.addEventListener('scroll', () => {
    window.requestAnimationFrame(updateScroll);
  });
}

function initCta() {
  const ctas = document.querySelectorAll('.cta-button');
  ctas.forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.add('cta-activated');
      setTimeout(() => button.classList.remove('cta-activated'), 900);
      const target = document.querySelector('#timeline');
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });
}

function boot() {
  initLanguage();
  initFragments();
  initTilt();
  initScrollDepth();
  initCta();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
