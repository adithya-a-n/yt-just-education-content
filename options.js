const defaultEduKeywords = [
    "tutorial", "lesson", "learn", "learning", "education", "educational", "study", "studying",
    "teach", "teaching", "teacher", "instructor", "course", "lecture", "class", "training",
    "academic", "university", "college", "school", "student", "professor", "scholarship",
    "math", "mathematics", "algebra", "calculus", "geometry", "statistics", "physics", 
    "chemistry", "biology", "science", "engineering", "computer science", "programming",
    "coding", "algorithm", "data science", "machine learning", "artificial intelligence",
    "language", "grammar", "vocabulary", "literature", "writing", "essay", "history",
    "geography", "philosophy", "psychology", "sociology", "anthropology", "art history",
    "skill", "skills", "how to", "guide", "explained", "analysis", "research", "thesis",
    "dissertation", "academic writing", "citation", "reference", "bibliography",
    "khan academy", "coursera", "edx", "udemy", "mooc", "online course", "webinar",
    "seminar", "workshop", "masterclass", "certification", "diploma", "degree",
    "beginner", "intermediate", "advanced", "fundamentals", "basics", "introduction to",
    "overview of", "comprehensive", "complete guide", "step by step", "walkthrough"
];
const defaultEntKeywords = [
    "entertainment", "funny", "comedy", "humor", "meme", "viral", "trending", "challenge",
    "prank", "reaction", "react", "roast", "drama", "gossip", "celebrity", "influencer",
    "gaming", "gameplay", "let's play", "walkthrough game", "speedrun", "game review", "unboxing",
    "stream", "streaming", "twitch", "esports", "tournament", "montage", "highlight reel",
    "music video", "song", "album", "artist", "concert", "performance", "dance", "choreography",
    "cover song", "remix", "beat", "instrumental", "karaoke", "singing", "musician",
    "vlog", "lifestyle", "daily routine", "morning routine", "get ready with me", "grwm",
    "haul", "try on", "outfit", "fashion", "beauty", "makeup", "skincare", "hair tutorial",
    "highlights", "compilation", "best moments", "epic", "amazing", "incredible",
    "sports news", "transfer news", "match recap", "goals", "skills compilation"
];

let eduKeywords = [];
let entKeywords = [];

// ---------- Helper Functions ----------
function renderKeywords(id, arr, removeHandler) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    arr.forEach((word, i) => {
        const span = document.createElement('span');
        span.className = 'keyword-item';
        span.textContent = word;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '×';
        btn.title = 'Remove this keyword';
        btn.onclick = () => removeHandler(i);
        span.appendChild(btn);
        el.appendChild(span);
    });
}

function saveKeywords() {
    chrome.storage.sync.set({
        educationalKeywords: eduKeywords,
        entertainmentKeywords: entKeywords
    }, () => {
        const msg = document.getElementById('msg');
        msg.textContent = '✅ Changes saved!';
        msg.style.display = 'block';
        setTimeout(() => {msg.style.display='none'}, 1800);
    });
}

function loadKeywords() {
    chrome.storage.sync.get(['educationalKeywords', 'entertainmentKeywords'], (data) => {
        eduKeywords = data.educationalKeywords || defaultEduKeywords.slice();
        entKeywords = data.entertainmentKeywords || defaultEntKeywords.slice();
        renderKeywords('edu-keywords', eduKeywords, i=>{
            eduKeywords.splice(i,1);
            renderKeywords('edu-keywords', eduKeywords, arguments.callee);
        });
        renderKeywords('ent-keywords', entKeywords, i=>{
            entKeywords.splice(i,1);
            renderKeywords('ent-keywords', entKeywords, arguments.callee);
        });
    });
}

// ---------- Event Listeners ----------
document.getElementById('add-edu-form').onsubmit = function(e){
    e.preventDefault();
    const word = document.getElementById('new-edu').value.trim();
    if(word && !eduKeywords.includes(word.toLowerCase())){
        eduKeywords.push(word.toLowerCase());
        renderKeywords('edu-keywords', eduKeywords, i=>{
            eduKeywords.splice(i,1);
            renderKeywords('edu-keywords', eduKeywords, arguments.callee);
        });
        document.getElementById('new-edu').value = '';
    }
};
document.getElementById('add-ent-form').onsubmit = function(e){
    e.preventDefault();
    const word = document.getElementById('new-ent').value.trim();
    if(word && !entKeywords.includes(word.toLowerCase())){
        entKeywords.push(word.toLowerCase());
        renderKeywords('ent-keywords', entKeywords, i=>{
            entKeywords.splice(i,1);
            renderKeywords('ent-keywords', entKeywords, arguments.callee);
        });
        document.getElementById('new-ent').value = '';
    }
};
document.getElementById('save-btn').onclick = saveKeywords;

// ---------- Initialization ----------
loadKeywords();
