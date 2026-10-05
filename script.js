const scheduleData = [
    { id: 1, title: 'Пара 1', type: 'class', start: '14:00', end: '15:30', desc: 'Самые сложные задачи, требующие максимальной концентрации (пока голова свежая).' },
    { id: 2, title: 'Перемена', type: 'break', start: '15:30', end: '15:45', desc: 'Встать, размяться, выпить стакан воды, дать глазам отдохнуть от экрана.' },
    { id: 3, title: 'Пара 2', type: 'class', start: '15:45', end: '17:15', desc: 'Продолжение важной темы или изучение нового теоретического материала.' },
    { id: 4, title: 'Большой перерыв', type: 'break', start: '17:15', end: '17:45', desc: 'Время для полноценного отдыха. Можно перекусить, сделать легкую разминку или прогуляться на свежем воздухе.' },
    { id: 5, title: 'Пара 3', type: 'class', start: '17:45', end: '19:15', desc: 'Практические задания, закрепление материала, тесты или домашняя работа.' },
    { id: 6, title: 'Перемена', type: 'break', start: '19:15', end: '19:25', desc: 'Быстрый перерыв, чтобы настроиться на финальный рывок.' },
    { id: 7, title: 'Семинар / Итоги дня', type: 'class', start: '19:25', end: '20:00', desc: 'Повторение изученного за день, наведение порядка в заметках и планирование задач на следующий раз.' }
];

let audioCtx = null;
let isStarted = false;
let currentBlockId = null;
let ticker = null;

const startBtn = document.getElementById('startBtn');
const timelineEl = document.getElementById('timeline');
const currentStatusEl = document.getElementById('currentStatus');
const currentDescEl = document.getElementById('currentDesc');
const countdownEl = document.getElementById('countdown');
const currentTitleEl = currentStatusEl.querySelector('h2');

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playBell() {
    if (!audioCtx) return;
    
    const playChime = (startTime, freqOffset) => {
        const baseFreq = 440 * freqOffset;
        const freqs = [baseFreq, baseFreq * 2.01, baseFreq * 3.02];
        
        freqs.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3 / (i + 1), startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.5);
            
            osc.start(startTime);
            osc.stop(startTime + 3);
        });
    };
    
    const now = audioCtx.currentTime;
    playChime(now, 1);       
    playChime(now + 0.5, 1.25); 
    playChime(now + 1.0, 1.5);  
}

function parseTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
}

function renderTimeline() {
    timelineEl.innerHTML = '';
    scheduleData.forEach(item => {
        const div = document.createElement('div');
        div.className = `timeline-item type-${item.type}`;
        div.id = `block-${item.id}`;
        
        div.innerHTML = `
            <div class="timeline-header">
                <div class="item-title">
                    ${item.title}
                    <span class="status-badge" id="badge-${item.id}"></span>
                </div>
                <div class="item-time">${item.start} – ${item.end}</div>
            </div>
            <div class="item-desc">${item.desc}</div>
        `;
        timelineEl.appendChild(div);
    });
}

function formatTimeLeft(ms) {
    if (ms < 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateState() {
    if (!isStarted) return;
    
    const now = new Date();
    let activeBlock = null;
    let nextBlock = null;
    
    for (let i = 0; i < scheduleData.length; i++) {
        const item = scheduleData[i];
        const start = parseTime(item.start);
        const end = parseTime(item.end);
        
        if (now >= start && now < end) {
            activeBlock = item;
            nextBlock = scheduleData[i+1] || null;
            break;
        } else if (now < start) {
            nextBlock = item;
            break;
        }
    }
    
    if (activeBlock && currentBlockId !== activeBlock.id) {
        if (currentBlockId !== null) {
            playBell(); 
        } else {
            const start = parseTime(activeBlock.start);
            if (now - start < 5000) { 
                playBell();
            }
        }
        currentBlockId = activeBlock.id;
    }
    
    const lastItemEnd = parseTime(scheduleData[scheduleData.length - 1].end);
    if (now >= lastItemEnd) {
        if (currentBlockId !== -1) {
            playBell();
            currentBlockId = -1; 
        }
        activeBlock = null;
    }
    
    if (activeBlock) {
        currentTitleEl.textContent = activeBlock.title;
        currentDescEl.textContent = activeBlock.desc;
        currentStatusEl.className = `current-status ${activeBlock.type}`;
        
        const endTime = parseTime(activeBlock.end);
        countdownEl.textContent = formatTimeLeft(endTime - now);
    } else if (now < parseTime(scheduleData[0].start)) {
        currentTitleEl.textContent = "До начала учебного дня...";
        const startTime = parseTime(scheduleData[0].start);
        countdownEl.textContent = formatTimeLeft(startTime - now);
        currentStatusEl.className = 'current-status';
        currentDescEl.textContent = "Подготовьте рабочее место. Скоро начинаем!";
    } else {
        currentTitleEl.textContent = "Учебный день завершен!";
        countdownEl.textContent = "00:00:00";
        currentStatusEl.className = 'current-status';
        currentDescEl.textContent = "Отличная работа! Можете отдыхать.";
    }
    
    scheduleData.forEach(item => {
        const itemEnd = parseTime(item.end);
        const el = document.getElementById(`block-${item.id}`);
        const badge = document.getElementById(`badge-${item.id}`);
        
        if (activeBlock && item.id === activeBlock.id) {
            el.classList.add('active');
            badge.textContent = 'Идет сейчас';
            badge.className = 'status-badge active-badge';
        } else {
            el.classList.remove('active');
            if (now >= itemEnd) {
                badge.textContent = 'Завершено';
                badge.className = 'status-badge past-badge';
            } else {
                badge.textContent = '';
                badge.className = 'status-badge';
            }
        }
    });
}

startBtn.addEventListener('click', () => {
    initAudio();
    isStarted = true;
    startBtn.textContent = "Система активна (Звук включен)";
    startBtn.classList.add('started');
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.value = 0.1;
    osc.frequency.value = 880;
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
    
    updateState();
    ticker = setInterval(updateState, 1000);
});

renderTimeline();
