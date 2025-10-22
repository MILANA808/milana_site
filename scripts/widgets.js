const byId = (id) => document.getElementById(id);

const initMoodMirror = () => {
    const button = byId('moodMirrorButton');
    if (!button) return;
    const select = byId('moodMirrorSelect');
    const display = byId('moodMirrorDisplay');
    const moods = {
        happy: { color: '#ffe066', text: 'Вы счастливы!' },
        sad: { color: '#74c0fc', text: 'Вы грустите.' },
        angry: { color: '#fa5252', text: 'Вы злитесь.' },
        calm: { color: '#b2f2bb', text: 'Вы спокойны.' }
    };
    button.addEventListener('click', () => {
        const mood = moods[select.value];
        if (!mood) return;
        display.style.backgroundColor = mood.color;
        display.textContent = mood.text;
    });
};

const initMindMirror = () => {
    const saveButton = byId('mindMirrorSave');
    if (!saveButton) return;
    const entryField = byId('mindMirrorEntry');
    const entriesContainer = byId('mindMirrorEntries');
    const reflectionOutput = byId('mindMirrorReflection');
    const reflections = [
        'Попробуйте выразить благодарность за что-то.',
        'Сделайте глубокий вдох и расслабьтесь.',
        'Запишите положительный момент из дня.',
        'Уделите время отдыху и восстановлению.'
    ];

    const loadEntries = () => {
        const entries = JSON.parse(localStorage.getItem('mindEntries') || '[]');
        entriesContainer.innerHTML = '';
        entries.forEach((entry, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<strong>Запись ${index + 1}</strong><p>${entry}</p>`;
            entriesContainer.appendChild(card);
        });
    };

    saveButton.addEventListener('click', () => {
        const text = entryField.value.trim();
        if (!text) return;
        const entries = JSON.parse(localStorage.getItem('mindEntries') || '[]');
        entries.push(text);
        localStorage.setItem('mindEntries', JSON.stringify(entries));
        entryField.value = '';
        loadEntries();
        const reflection = reflections[Math.floor(Math.random() * reflections.length)];
        reflectionOutput.textContent = `Совет: ${reflection}`;
    });

    loadEntries();
};

const initMindLink = () => {
    const button = byId('mindLinkButton');
    if (!button) return;
    const progress = byId('mindLinkProgress');
    const status = byId('mindLinkStatus');
    button.addEventListener('click', () => {
        const value = Math.floor(Math.random() * 101);
        progress.value = value;
        if (value < 33) status.textContent = 'Низкая активность';
        else if (value < 66) status.textContent = 'Средняя активность';
        else status.textContent = 'Высокая активность';
    });
};

const initHealthScan = () => {
    const button = byId('healthScanButton');
    if (!button) return;
    button.addEventListener('click', () => {
        const heart = parseInt(byId('healthPulse').value, 10);
        const sys = parseInt(byId('healthSystolic').value, 10);
        if (Number.isNaN(heart) || Number.isNaN(sys)) return;
        let message = '';
        if (heart > 100) message += 'Повышенный пульс. ';
        else if (heart < 60) message += 'Низкий пульс. ';
        else message += 'Пульс в норме. ';
        if (sys > 140) message += 'Высокое давление. ';
        else if (sys < 90) message += 'Низкое давление. ';
        else message += 'Давление в норме.';
        byId('healthResult').textContent = message.trim();
    });
};

const initMentor = () => {
    const button = byId('mentorAdviceButton');
    if (!button) return;
    const advices = [
        'Верить в себя — первый шаг к успеху.',
        'Каждый день учитесь чему-то новому.',
        'Планируйте и ставьте маленькие цели.',
        'Не бойтесь ошибок — они учат.'
    ];
    const output = byId('mentorAdvice');
    button.addEventListener('click', () => {
        const advice = advices[Math.floor(Math.random() * advices.length)];
        output.textContent = advice;
    });
};

const initFamily = () => {
    const button = byId('familyAddButton');
    if (!button) return;
    const nameField = byId('familyEventName');
    const dateField = byId('familyEventDate');
    const table = byId('familyEventsTable');

    const loadEvents = () => {
        const events = JSON.parse(localStorage.getItem('familyEvents') || '[]');
        table.innerHTML = '<tr><th>Событие</th><th>Дата</th></tr>';
        events.forEach((event) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${event.name}</td><td>${event.date}</td>`;
            table.appendChild(row);
        });
    };

    button.addEventListener('click', () => {
        const name = nameField.value.trim();
        const date = dateField.value;
        if (!name || !date) return;
        const events = JSON.parse(localStorage.getItem('familyEvents') || '[]');
        events.push({ name, date });
        localStorage.setItem('familyEvents', JSON.stringify(events));
        nameField.value = '';
        dateField.value = '';
        loadEvents();
    });

    loadEvents();
};

const initAura = () => {
    const button = byId('auraMoodButton');
    if (!button) return;
    const select = byId('auraMoodSelect');
    const display = byId('auraMoodDisplay');
    const moods = {
        happy: { color: '#ff922b', text: 'Ваша аура сияет радостью!' },
        sad: { color: '#4dabf7', text: 'Ваша аура спокойна и задумчива.' },
        angry: { color: '#ff6b6b', text: 'Аура насыщена сильной энергией.' },
        calm: { color: '#69db7c', text: 'Аура ровная и гармоничная.' }
    };
    button.addEventListener('click', () => {
        const mood = moods[select.value];
        if (!mood) return;
        display.style.backgroundColor = mood.color;
        display.textContent = mood.text;
    });
};

const initLove = () => {
    const button = byId('loveMatchButton');
    if (!button) return;
    const matches = ['Алексей', 'Ольга', 'Сергей', 'Мария', 'Иван', 'Екатерина'];
    button.addEventListener('click', () => {
        const name = byId('loveYourName').value.trim();
        const preference = byId('lovePreference').value.trim();
        const match = matches[Math.floor(Math.random() * matches.length)];
        const prefix = name ? `${name}, ` : '';
        const suffix = preference ? ` (учитывая предпочтение: ${preference})` : '';
        byId('loveMatchResult').textContent = `${prefix}ваша совместимость на сегодня: ${match}${suffix}`;
    });
};

const initMoodRadio = () => {
    const button = byId('moodRadioButton');
    if (!button) return;
    const select = byId('moodRadioSelect');
    const list = byId('moodRadioList');
    const playlists = {
        happy: ['Happy Song 1', 'Joyful Tune 2', 'Sunny Day'],
        sad: ['Melancholic Melody', 'Slow Ballad', 'Rainy Thoughts'],
        angry: ['Rock Anthem', 'Metal Fury', 'Energetic Beat'],
        calm: ['Peaceful Piano', 'Relaxing Waves', 'Soft Guitar']
    };
    button.addEventListener('click', () => {
        const mood = playlists[select.value];
        if (!mood) return;
        list.innerHTML = '';
        mood.forEach((song) => {
            const item = document.createElement('li');
            item.textContent = song;
            list.appendChild(item);
        });
    });
};

const initShopping = () => {
    const cartCount = byId('cartCount');
    const productList = byId('productList');
    if (!cartCount || !productList) return;
    const products = [
        { name: 'Смартфон', price: 500 },
        { name: 'Наушники', price: 50 },
        { name: 'Ноутбук', price: 800 },
        { name: 'Фитнес-браслет', price: 100 }
    ];
    let cart = JSON.parse(localStorage.getItem('shopCart') || '[]');

    const updateCart = () => {
        cartCount.textContent = `В корзине: ${cart.length}`;
    };

    const renderProducts = () => {
        productList.innerHTML = '';
        products.forEach((product) => {
            const card = document.createElement('div');
            card.className = 'card';
            const title = document.createElement('p');
            title.innerHTML = `<strong>${product.name}</strong> — ${product.price}₽`;
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Добавить в корзину';
            button.addEventListener('click', () => {
                cart.push(product);
                localStorage.setItem('shopCart', JSON.stringify(cart));
                updateCart();
            });
            card.appendChild(title);
            card.appendChild(button);
            productList.appendChild(card);
        });
    };

    updateCart();
    renderProducts();
};

const initStylist = () => {
    const button = byId('stylistButton');
    if (!button) return;
    const output = byId('stylistAdvice');
    const preferenceField = byId('stylistPreference');
    const outfits = [
        'Белая рубашка с джинсами — классика, которая подходит всем.',
        'Пастельные тона и лёгкие ткани — отличный выбор для весны.',
        'Спортивный костюм сочетается с кроссовками для активного дня.',
        'Деловой костюм подчеркнёт вашу уверенность.'
    ];
    button.addEventListener('click', () => {
        const advice = outfits[Math.floor(Math.random() * outfits.length)];
        const preference = preferenceField.value.trim();
        output.textContent = preference ? `${advice} Учтите ваш выбор: ${preference}.` : advice;
    });
};

const initEco = () => {
    const button = byId('ecoAnalyzeButton');
    if (!button) return;
    button.addEventListener('click', () => {
        const light = parseFloat(byId('ecoLight').value);
        const noise = parseFloat(byId('ecoNoise').value);
        const co2 = parseFloat(byId('ecoCO2').value);
        let result = '';
        result += light >= 300 && light <= 500 ? 'Хорошая освещённость. ' : 'Плохая освещённость. ';
        result += noise <= 50 ? 'Шум в норме. ' : 'Шум высокий. ';
        result += co2 <= 1000 ? 'CO₂ в норме.' : 'Повышенный CO₂.';
        byId('ecoResult').textContent = result.trim();
    });
};

const initDreamJournal = () => {
    const button = byId('dreamSaveButton');
    if (!button) return;
    const entryField = byId('dreamEntry');
    const container = byId('dreamEntries');

    const loadEntries = () => {
        const entries = JSON.parse(localStorage.getItem('dreamEntries') || '[]');
        container.innerHTML = '';
        entries.forEach((entry, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<strong>Запись ${index + 1}</strong><p>${entry}</p>`;
            container.appendChild(card);
        });
    };

    button.addEventListener('click', () => {
        const text = entryField.value.trim();
        if (!text) return;
        const entries = JSON.parse(localStorage.getItem('dreamEntries') || '[]');
        entries.push(text);
        localStorage.setItem('dreamEntries', JSON.stringify(entries));
        entryField.value = '';
        loadEntries();
    });

    loadEntries();
};

const initCompanion = () => {
    const talkButton = byId('companionTalkButton');
    const feedButton = byId('companionFeedButton');
    if (!talkButton || !feedButton) return;
    let happiness = 50;
    const phrases = [
        'Приятно с вами общаться!',
        'Надеюсь, у вас хороший день!',
        'Я всегда рядом.',
        'Расскажите мне что-то новое.'
    ];
    const status = byId('companionStatus');
    const message = byId('companionMessage');

    const updateCompanion = () => {
        status.textContent = `Уровень радости: ${happiness}%`;
    };

    talkButton.addEventListener('click', () => {
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        message.textContent = phrase;
        happiness = Math.min(100, happiness + 5);
        updateCompanion();
    });

    feedButton.addEventListener('click', () => {
        message.textContent = 'Спасибо за еду! :)';
        happiness = Math.min(100, happiness + 10);
        updateCompanion();
    });

    updateCompanion();
};

const initDressUp = () => {
    const button = byId('dressUpButton');
    if (!button) return;
    const select = byId('dressUpSelect');
    const result = byId('dressUpResult');
    button.addEventListener('click', () => {
        const item = select.value;
        result.textContent = item ? `Вы выбрали: ${item}` : '';
    });
};

const initGlobalId = () => {
    const button = byId('globalIdButton');
    if (!button) return;
    const nameField = byId('globalIdName');
    const numberField = byId('globalIdNumber');
    const card = byId('globalIdCard');
    button.addEventListener('click', () => {
        const name = nameField.value.trim();
        const number = numberField.value.trim();
        if (!name || !number) return;
        card.innerHTML = `<p><strong>Имя:</strong> ${name}</p><p><strong>ID:</strong> ${number}</p>`;
    });
};

const initLifeScan = () => {
    const button = byId('lifeCalcButton');
    if (!button) return;
    button.addEventListener('click', () => {
        const weight = parseFloat(byId('lifeWeight').value);
        const height = parseFloat(byId('lifeHeight').value) / 100;
        if (!weight || !height) return;
        const bmi = weight / (height * height);
        let category = '';
        if (bmi < 18.5) category = 'Недостаток веса';
        else if (bmi < 25) category = 'Норма';
        else if (bmi < 30) category = 'Избыточный вес';
        else category = 'Ожирение';
        byId('lifeBmiResult').textContent = `ИМТ: ${bmi.toFixed(1)} — ${category}`;
    });
};

const initTimeCapsule = () => {
    const saveButton = byId('capsuleSaveButton');
    const openButton = byId('capsuleOpenButton');
    if (!saveButton || !openButton) return;
    const messageField = byId('capsuleMessage');
    const dateField = byId('capsuleDate');
    const container = byId('capsuleList');

    const loadCapsules = () => JSON.parse(localStorage.getItem('timeCapsules') || '[]');

    const renderCapsules = () => {
        const now = new Date();
        container.innerHTML = '';
        loadCapsules().forEach((capsule) => {
            const openDate = new Date(capsule.date);
            if (openDate <= now) {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `<p>${capsule.msg}</p><small>Дата создания: ${capsule.date}</small>`;
                container.appendChild(card);
            }
        });
    };

    saveButton.addEventListener('click', () => {
        const message = messageField.value.trim();
        const date = dateField.value;
        if (!message || !date) return;
        const capsules = loadCapsules();
        capsules.push({ msg: message, date });
        localStorage.setItem('timeCapsules', JSON.stringify(capsules));
        messageField.value = '';
        dateField.value = '';
    });

    openButton.addEventListener('click', renderCapsules);
};

const initTelehelp = () => {
    const button = byId('telehelpButton');
    if (!button) return;
    button.addEventListener('click', () => {
        byId('telehelpResult').textContent = 'Запрос SOS отправлен! Дождитесь помощи.';
    });
};

const initStory = ({ queryGPT, formatGptError }) => {
    const button = byId('storyButton');
    if (!button) return;
    const promptField = byId('storyPrompt');
    const output = byId('storyOutput');
    const status = byId('storyStatus');
    const offlineTemplates = [
        'Однажды {prompt}, и это привело к удивительному приключению, полному неожиданных поворотов.',
        'История о {prompt} началась в туманное утро, когда мир перевернулся с ног на голову.',
        '{prompt} — герой, который доказал, что даже самые смелые мечты могут стать реальностью.',
        'В далёком королевстве жил {prompt}, и однажды он нашёл секрет, изменивший всё.'
    ];

    const setStatus = (message, isError = false) => {
        if (!status) return;
        status.textContent = message || '';
        status.style.color = isError ? '#ff8fb7' : '#d4c7ff';
    };

    button.addEventListener('click', async () => {
        const prompt = promptField?.value.trim();
        if (!prompt) return;
        setStatus('Обращаемся к GPT...');
        button.disabled = true;

        try {
            const story = await queryGPT([
                { role: 'system', content: 'Ты — автор вдохновляющих коротких историй на русском языке.' },
                { role: 'user', content: `Напиши цельный вдохновляющий рассказ объёмом 120–180 слов по теме: "${prompt}". Сделай финал позитивным.` }
            ], { temperature: 0.8 });
            if (output) output.textContent = story;
            setStatus('Готово.');
        } catch (error) {
            const message = formatGptError(error);
            setStatus(`${message} Показан офлайн-шаблон.`, true);
            const template = offlineTemplates[Math.floor(Math.random() * offlineTemplates.length)];
            if (output) output.textContent = template.replace('{prompt}', prompt);
        } finally {
            button.disabled = false;
        }
    });
};

export const initAppWidgets = (deps) => {
    initMoodMirror();
    initMindMirror();
    initMindLink();
    initHealthScan();
    initMentor();
    initFamily();
    initAura();
    initLove();
    initMoodRadio();
    initShopping();
    initStylist();
    initEco();
    initDreamJournal();
    initCompanion();
    initDressUp();
    initGlobalId();
    initLifeScan();
    initTimeCapsule();
    initTelehelp();
    initStory(deps);
};
