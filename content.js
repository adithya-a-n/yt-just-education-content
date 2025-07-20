// YouTube Educational Content Filter - Content Script
// This script runs on all YouTube pages and blocks non-educational content

class YouTubeEducationalFilter {
    constructor() {
        this.isEnabled = true;
        this.educationalKeywords = [
            // Core subjects
            "tutorial", "lesson", "learn", "learning", "education", "educational", "study", "studying", 
            "teach", "teaching", "teacher", "instructor", "course", "lecture", "class", "training",
            "academic", "university", "college", "school", "student", "professor", "scholarship",
            
            // STEM subjects
            "math", "mathematics", "algebra", "calculus", "geometry", "statistics", "physics", 
            "chemistry", "biology", "science", "engineering", "computer science", "programming",
            "coding", "algorithm", "data science", "machine learning", "artificial intelligence",
            
            // Languages and humanities  
            "language", "grammar", "vocabulary", "literature", "writing", "essay", "history",
            "geography", "philosophy", "psychology", "sociology", "anthropology", "art history",
            
            // Skills and professional development
            "skill", "skills", "how to", "guide", "explained", "analysis", "research", "thesis",
            "dissertation", "academic writing", "citation", "reference", "bibliography",
            
            // Online learning platforms and formats
            "khan academy", "coursera", "edx", "udemy", "mooc", "online course", "webinar",
            "seminar", "workshop", "masterclass", "certification", "diploma", "degree",
            
            // Educational qualifiers
            "beginner", "intermediate", "advanced", "fundamentals", "basics", "introduction to",
            "overview of", "comprehensive", "complete guide", "step by step", "walkthrough"
        ];

        this.entertainmentKeywords = [
            // Entertainment
            "entertainment", "funny", "comedy", "humor", "meme", "viral", "trending", "challenge",
            "prank", "reaction", "react", "roast", "drama", "gossip", "celebrity", "influencer",
            
            // Gaming  
            "gaming", "gameplay", "let's play", "walkthrough game", "speedrun", "game review", "unboxing",
            "stream", "streaming", "twitch", "esports", "tournament", "montage", "highlight reel",
            
            // Music and Dance
            "music video", "song", "album", "artist", "concert", "performance", "dance", "choreography",
            "cover song", "remix", "beat", "instrumental", "karaoke", "singing", "musician",
            
            // Lifestyle and Vlog
            "vlog", "lifestyle", "daily routine", "morning routine", "get ready with me", "grwm",
            "haul", "try on", "outfit", "fashion", "beauty", "makeup", "skincare", "hair tutorial",
            
            // Sports highlights (non-educational)
            "highlights", "compilation", "best moments", "epic", "amazing", "incredible",
            "sports news", "transfer news", "match recap", "goals", "skills compilation"
        ];
        
        this.blockedCount = 0;
        this.init();
    }

    init() {
        this.loadSettings();
        this.startObserving();
        this.addCustomStyles();
        console.log('YouTube Educational Filter: Initialized');
    }

    loadSettings() {
        chrome.storage.sync.get(['filterEnabled'], (result) => {
            this.isEnabled = result.filterEnabled !== false; // default to true
        });
    }

    startObserving() {
        // Initial scan
        this.scanForContent();
        
        // Create observer for dynamic content
        const observer = new MutationObserver((mutations) => {
            let shouldScan = false;
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    shouldScan = true;
                }
            });
            
            if (shouldScan) {
                setTimeout(() => this.scanForContent(), 100);
            }
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    scanForContent() {
        if (!this.isEnabled) return;

        // Different selectors for different YouTube pages
        const videoSelectors = [
            // Homepage videos
            'ytd-rich-item-renderer',
            // Search results
            'ytd-video-renderer',
            // Sidebar suggestions
            'ytd-compact-video-renderer',
            // Playlist videos
            'ytd-playlist-video-renderer',
            // Channel videos
            'ytd-grid-video-renderer',
            // Shorts
            'ytd-reel-item-renderer'
        ];

        videoSelectors.forEach(selector => {
            const videos = document.querySelectorAll(selector);
            videos.forEach(video => this.processVideo(video));
        });

        // Handle individual video pages
        this.processCurrentVideo();
    }

    processVideo(videoElement) {
        // Skip if already processed
        if (videoElement.dataset.educationFiltered) return;
        videoElement.dataset.educationFiltered = 'true';

        const title = this.getVideoTitle(videoElement);
        const channelName = this.getChannelName(videoElement);
        
        if (title && !this.isEducational(title, channelName)) {
            this.blockVideo(videoElement, title);
        }
    }

    processCurrentVideo() {
        // Handle the main video page
        if (window.location.pathname === '/watch') {
            const title = document.title.replace(' - YouTube', '');
            const channelElement = document.querySelector('ytd-channel-name a, .ytd-channel-name a');
            const channelName = channelElement ? channelElement.textContent.trim() : '';
            
            if (title && !this.isEducational(title, channelName)) {
                this.blockCurrentVideo(title);
            }
        }
    }

    getVideoTitle(videoElement) {
        // Try multiple selectors for video title
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
        
        // Calculate educational score
        let educationalScore = 0;
        let entertainmentScore = 0;

        // Check educational keywords
        this.educationalKeywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
                educationalScore += keyword.length > 5 ? 2 : 1; // Longer keywords get more weight
            }
        });

        // Check entertainment keywords  
        this.entertainmentKeywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
                entertainmentScore += 1;
            }
        });

        // Educational channels get bonus points
        const educationalChannels = ['khan academy', 'crash course', 'ted-ed', 'mit opencourseware', 
                                   'stanford', 'harvard', 'coursera', 'edx', '3blue1brown', 
                                   'professor', 'university', 'academy', 'institute'];
        
        educationalChannels.forEach(channel => {
            if (channelName.toLowerCase().includes(channel)) {
                educationalScore += 3;
            }
        });

        // Threshold-based decision
        const threshold = 1;
        const isEd = educationalScore >= threshold && educationalScore > entertainmentScore;
        
        console.log(`YouTube Educational Filter: "${title}" - Educational: ${educationalScore}, Entertainment: ${entertainmentScore}, Result: ${isEd ? 'ALLOW' : 'BLOCK'}`);
        
        return isEd;
    }

    blockVideo(videoElement, title) {
        videoElement.style.opacity = '0.3';
        videoElement.style.pointerEvents = 'none';
        const thumbnail = videoElement.querySelector('img');
        if (thumbnail) {
            thumbnail.style.filter = 'blur(3px)';
        }
        
        // Add overlay message
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
            videoElement.appendChild(overlay);
        }
        
        this.blockedCount++;
        this.updateBadge();
    }

    blockCurrentVideo(title) {
        // Block the current video page
        const videoContainer = document.querySelector('#player-container, #movie_player');
        if (videoContainer) {
            const overlay = document.createElement('div');
            overlay.id = 'education-filter-page-overlay';
            overlay.innerHTML = `
                <div class="education-filter-page-message">
                    <h2>🚫 Content Blocked</h2>
                    <p>This video appears to be non-educational content.</p>
                    <p><strong>Title:</strong> ${title}</p>
                    <p>Only educational content is allowed by your filter settings.</p>
                    <button id="go-back-btn">← Go Back</button>
                    <button id="disable-filter-btn">Disable Filter</button>
                </div>
            `;
            document.body.appendChild(overlay);

            // Add event listeners
            document.getElementById('go-back-btn').addEventListener('click', () => {
                window.history.back();
            });

            document.getElementById('disable-filter-btn').addEventListener('click', () => {
                chrome.storage.sync.set({ filterEnabled: false });
                location.reload();
            });
        }
    }

    addCustomStyles() {
        const styles = `
            .education-filter-overlay {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.8) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 1000 !important;
                border-radius: 8px !important;
            }

            .education-filter-message {
                color: white !important;
                text-align: center !important;
                padding: 20px !important;
                font-family: Arial, sans-serif !important;
            }

            .education-filter-message span {
                display: block !important;
                font-size: 16px !important;
                font-weight: bold !important;
                margin-bottom: 8px !important;
            }

            .education-filter-message small {
                font-size: 12px !important;
                opacity: 0.8 !important;
            }

            #education-filter-page-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.95) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 10000 !important;
            }

            .education-filter-page-message {
                background: white !important;
                padding: 40px !important;
                border-radius: 12px !important;
                max-width: 500px !important;
                text-align: center !important;
                font-family: Arial, sans-serif !important;
            }

            .education-filter-page-message h2 {
                color: #d73027 !important;
                margin-bottom: 20px !important;
            }

            .education-filter-page-message button {
                margin: 10px !important;
                padding: 10px 20px !important;
                border: none !important;
                border-radius: 5px !important;
                cursor: pointer !important;
                font-size: 14px !important;
            }

            #go-back-btn {
                background: #4285f4 !important;
                color: white !important;
            }

            #disable-filter-btn {
                background: #ea4335 !important;
                color: white !important;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    updateBadge() {
        chrome.runtime.sendMessage({
            action: 'updateBadge',
            count: this.blockedCount
        });
    }
}

// Initialize the filter when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new YouTubeEducationalFilter();
    });
} else {
    new YouTubeEducationalFilter();
}
