class YouTubeEducationalFilter {
    constructor() {
        this.isEnabled = true;
        this.educationalKeywords = [/* see options.js for full default list */];
        this.entertainmentKeywords = [/* see options.js for full default list */];
        this.useAI = false;
        this.geminiApiKey = "";
        this.blockedCount = 0;
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.addCustomStyles();
        this.startObserving();
        console.log('YouTube Educational Filter: Initialized (AI:', this.useAI, ')');
    }

    loadSettings() {
        return new Promise(resolve => {
            chrome.storage.sync.get(
                [
                    'filterEnabled',
                    'educationalKeywords',
                    'entertainmentKeywords',
                    'useAI',
                    'geminiApiKey'
                ],
                data => {
                    this.isEnabled = data.filterEnabled !== false;
                    if (Array.isArray(data.educationalKeywords)) this.educationalKeywords = data.educationalKeywords;
                    if (Array.isArray(data.entertainmentKeywords)) this.entertainmentKeywords = data.entertainmentKeywords;
                    this.useAI = !!data.useAI;
                    this.geminiApiKey = data.geminiApiKey || "";
                    resolve();
                }
            );
        });
    }

    startObserving() {
        this.scanForContent();
        const observer = new MutationObserver(() => setTimeout(() => this.scanForContent(), 100));
        observer.observe(document.body, { childList: true, subtree: true });
    }

    async scanForContent() {
        await this.loadSettings();
        if (!this.isEnabled) return;
        const videoSelectors = [
            'ytd-rich-item-renderer',
            'ytd-video-renderer',
            'ytd-compact-video-renderer',
            'ytd-playlist-video-renderer',
            'ytd-grid-video-renderer',
            'ytd-reel-item-renderer'
        ];
        for (const selector of videoSelectors) {
            const videos = document.querySelectorAll(selector);
            for (const video of videos) {
                await this.processVideo(video);
            }
        }
        await this.processCurrentVideo();
    }

    async processVideo(videoElement) {
        if (videoElement.dataset.educationFiltered) return;
        videoElement.dataset.educationFiltered = 'true';
        const title = this.getVideoTitle(videoElement);
        const channelName = this.getChannelName(videoElement);
        if (!title) return;

        let isEducational = false;

        // AI mode overrides keyword check completely
        if (this.useAI && this.geminiApiKey) {
            try {
                isEducational = await this.classifyWithGemini(title, channelName);
            } catch (e) {
                console.warn("Gemini AI error (blocking video for safety):", e);
                isEducational = false;
            }
        } else {
            isEducational = this.isEducational(title, channelName);
        }

        if (!isEducational) {
            this.blockVideo(videoElement, title);
        }
    }

    async processCurrentVideo() {
        if (window.location.pathname === '/watch') {
            const title = document.title.replace(' - YouTube', '');
            const channelElement = document.querySelector('ytd-channel-name a, .ytd-channel-name a');
            const channelName = channelElement ? channelElement.textContent.trim() : '';
            if (!title) return;

            let isEducational = false;

            if (this.useAI && this.geminiApiKey) {
                try {
                    isEducational = await this.classifyWithGemini(title, channelName);
                } catch(e) {
                    console.warn("Gemini AI error (blocking video for safety):", e);
                    isEducational = false;
                }
            } else {
                isEducational = this.isEducational(title, channelName);
            }

            if (!isEducational) {
                this.blockCurrentVideo(title, channelName);
            }
        }
    }

    getVideoTitle(videoElement) {
        const titleSelectors = [
            '#video-title',
            '.ytd-video-renderer #video-title',
            '.ytd-rich-item-renderer #video-title',
            '.ytd-compact-video-renderer #video-title',
            'h3 a#video-title',
            'a#video-title',
            '.title-and-badge a'
        ];
        for (const selector of titleSelectors) {
            const titleElement = videoElement.querySelector(selector);
            if (titleElement) {
                return titleElement.textContent.trim();
            }
        }
        return null;
    }

    getChannelName(videoElement) {
        const channelSelectors = [
            '.ytd-channel-name a',
            '.ytd-video-owner-renderer a',
            '#text-container a',
            '.ytd-video-meta-block #text a'
        ];
        for (const selector of channelSelectors) {
            const channelElement = videoElement.querySelector(selector);
            if (channelElement) {
                return channelElement.textContent.trim();
            }
        }
        return '';
    }

    isEducational(title, channelName = '') {
        const text = (title + ' ' + channelName).toLowerCase();
        let educationalScore = 0, entertainmentScore = 0;
        this.educationalKeywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) 
                educationalScore += keyword.length > 5 ? 2 : 1;
        });
        this.entertainmentKeywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase()))
                entertainmentScore += 1;
        });
        const educationalChannels = ['khan academy', 'crash course', 'ted-ed', 'mit opencourseware', 
                                   'stanford', 'harvard', 'coursera', 'edx', '3blue1brown', 
                                   'professor', 'university', 'academy', 'institute'];
        educationalChannels.forEach(channel => {
            if (channelName.toLowerCase().includes(channel)) educationalScore += 3;
        });
        return educationalScore >= 1 && educationalScore > entertainmentScore;
    }

    async classifyWithGemini(title, channel = "") {
        if (!this.geminiApiKey) return false;
        const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
        const prompt = `Classify the following YouTube video as "educational" or "not educational". Title: "${title}", Channel: "${channel}". Respond with only "educational" or "not educational".`;
        const body = { contents: [{ parts: [{ text: prompt }] }] };
        const response = await fetch(apiUrl + "?key=" + this.geminiApiKey, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error("Gemini API Error");
        const data = await response.json();
        const resText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase() || "";
        return resText.includes("educational") && !resText.includes("not educational");
    }

    blockVideo(videoElement, title) {
        ['img', 'ytd-thumbnail', 'ytd-playlist-thumbnail'].forEach(s => {
            const e = videoElement.querySelector(s);
            if (e) e.style.filter = "blur(5px) brightness(0.6)";
        });
        if (!videoElement.querySelector('.education-filter-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'education-filter-overlay';
            overlay.innerHTML = `
                <div class="education-filter-message">
                    <span>🚫 Non-Educational Content Blocked</span>
                    <small>This video was filtered for educational focus</small>
                </div>
            `;
            videoElement.style.position = 'relative';
            overlay.style.position = 'absolute';
            overlay.style.top = "0"; overlay.style.left = "0";
            overlay.style.width = "100%"; overlay.style.height = "100%";
            videoElement.appendChild(overlay);
        }
        videoElement.style.pointerEvents = 'none';
        this.blockedCount++;
        this.updateBadge();
    }

    blockCurrentVideo(title, channelName) {
        if (!this.isEnabled) return;
        const videoContainer = document.querySelector('#player-container, #movie_player');
        if (videoContainer && !document.getElementById('education-filter-page-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'education-filter-page-overlay';
            overlay.innerHTML = `
                <div class="education-filter-page-message">
                    <h2>🚫 Content Blocked</h2>
                    <p>This video appears to be non-educational content.</p>
                    <p><strong>Title:</strong> ${title}</p>
                    <p><strong>Channel:</strong> ${channelName}</p>
                    <p>Only educational content is allowed by your filter settings.</p>
                    <button id="go-back-btn">← Go Back</button>
                    <button id="disable-filter-btn">Disable Filter</button>
                </div>
            `;
            document.body.appendChild(overlay);

            document.getElementById('go-back-btn').onclick = ()=>window.history.back();
            document.getElementById('disable-filter-btn').onclick = ()=>{
                chrome.storage.sync.set({ filterEnabled: false }); location.reload();
            }
        }
    }

    addCustomStyles() {
        if (document.getElementById('edu-filter-style')) return;
        const styles = `
            .education-filter-overlay {
                position: absolute !important;
                top: 0 !important; left: 0 !important;
                right: 0 !important; bottom: 0 !important;
                background: rgba(0,0,0,0.7) !important;
                backdrop-filter: blur(3px) !important;
                display: flex !important; align-items: center !important; justify-content: center !important;
                z-index: 1000 !important; border-radius: 8px !important;
            }
            .education-filter-message { color:white;font-size:16px;text-align:center;padding:16px;}
            #education-filter-page-overlay {
                position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);
                display:flex;align-items:center;justify-content:center;z-index:10000;
            }
            .education-filter-page-message {
                background:white;padding:32px 24px;border-radius:12px;max-width:500px;text-align:center;
                font-family:Arial,sans-serif;
            }
            .education-filter-page-message h2 { color:#d73027;margin-bottom:20px;}
            .education-filter-page-message button{
                margin:10px 7px 0; padding:10px 20px; border:none; border-radius:5px;
                cursor:pointer; font-size:14px;
            }
            #go-back-btn {background:#4285f4;color:white;}
            #disable-filter-btn {background:#ea4335;color:white;}
        `;
        const styleSheet = document.createElement('style');
        styleSheet.id = 'edu-filter-style'
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    updateBadge() {
        chrome.runtime.sendMessage({ action: 'updateBadge', count: this.blockedCount });
    }
}

// MAIN entry point
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.filter = new YouTubeEducationalFilter(); });
} else {
    window.filter = new YouTubeEducationalFilter();
}

chrome.runtime?.onMessage?.addListener?.((msg) => {
    if (msg.action === "refreshFilter") {
        (async ()=>{ await window.filter?.loadSettings(); window.filter?.scanForContent(); })();
    }
});
