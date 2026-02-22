const CONFIG = {
    storageKeys: {
        settings: "reader-settings",
        audioSettings: "reader-audio-settings",
        scrollPrefix: "reader-scroll-",
    },
    themes: {
        light: { bg: "#fdfdfd", text: "#333333" },
        sepia: { bg: "#f4ecd8", text: "#5b4636" },
        dark: { bg: "#222222", text: "#d1d1d1" },
        midnight: { bg: "#2b323b", text: "#c4cdd5" },
        forest: { bg: "#e8f5e9", text: "#2d3b2d" },
        amoled: { bg: "#000000", text: "#b3b3b3" },
    },
    selectors: {
        contentDiv: "#content",
        paragraphs: "#content p",
    },
};

const DOM = {
    root: document.documentElement,
    body: document.body,

    navBar: document.getElementById("topNav"),
    sentinel: document.getElementById("sentinel"),
    prevLinks: document.querySelectorAll(".nav-prev"),
    nextLinks: document.querySelectorAll(".nav-next"),
    fabContainer: document.querySelector(".fab-container"),
    progressBar: document.getElementById("progress-bar"),
    content: document.getElementById("content"),

    menu: document.getElementById("settingsMenu"),
    toggleBtn: document.getElementById("toggleSettings"),
    themeBtns: document.querySelectorAll(".theme-btn"),
    pagedIndicator: document.querySelector(".paged-indicator"),
    inputs: {
        fontSize: document.getElementById("input-fontsize"),
        lineHeight: document.getElementById("input-lineheight"),
        fontFamily: document.getElementById("input-font"),
        spacing: document.getElementById("input-spacing"),
        paraStyle: document.getElementById("input-para-style"),
        readMode: document.getElementById("input-read-mode"),
    },
    displays: {
        fontSize: document.getElementById("fs-val"),
        lineHeight: document.getElementById("lh-val"),
        spacing: document.getElementById("spacing-val"),
    },

    audioBtn: document.getElementById("toggleAudio"),
    audioMenu: document.getElementById("audioSettingsMenu"),
    audioSettingsBtn: document.getElementById("toggleAudioSettings"),
    voiceSelect: document.getElementById("input-voice"),
    rateInput: document.getElementById("input-rate"),
    pitchInput: document.getElementById("input-pitch"),
    rateValDisplay: document.getElementById("rate-val"),
    pitchValDisplay: document.getElementById("pitch-val"),
    audioStatusText: document.getElementById("audio-status-text"),
    iconPlay: document.getElementById("icon-play"),
    iconPause: document.getElementById("icon-pause"),
    audioWrapper: document.querySelector(".audio-toolbar-wrapper"),
};

const NavigationManager = {
    prevUrl: PREV_CHAPTER_NUM
        ? `/myriadpaths/chapters/${PREV_CHAPTER_NUM}/`
        : "",
    nextUrl: NEXT_CHAPTER_NUM
        ? `/myriadpaths/chapters/${NEXT_CHAPTER_NUM}/`
        : "",

    init() {
        this.updateLinks();
        this.prefetch();
        this.bindEvents();
        this.syncNavigation();
    },

    updateLinks() {
        const setLinks = (nodes, url) => {
            nodes.forEach((link) => {
                if (url) {
                    link.href = url;
                    link.classList.remove("disabled");
                } else {
                    link.removeAttribute("href");
                    link.classList.add("disabled");
                }
            });
        };
        setLinks(DOM.prevLinks, this.prevUrl);
        setLinks(DOM.nextLinks, this.nextUrl);
    },

    async syncNavigation() {
        const currentId = CHAPTER_NUM;
        if (isNaN(currentId)) return;

        const idealPrevId = currentId - 1;
        const idealNextId = currentId + 1;

        const isPrevAligned =
            !this.prevUrl || this.prevUrl.includes(`/${idealPrevId}/`);
        const isNextAligned =
            this.nextUrl && this.nextUrl.includes(`/${idealNextId}/`);

        if (isPrevAligned && isNextAligned) {
            return;
        }

        try {
            const response = await fetch("{{ `chapters.json` | relURL }}");
            if (!response.ok) return;

            const chapters = await response.json();

            const currentIndex = chapters.findIndex((c) => c.id === currentId);
            if (currentIndex === -1) return;

            let updatesMade = false;

            if (currentIndex > 0) {
                const prevChapter = chapters[currentIndex - 1];
                if (prevChapter.url && this.prevUrl !== prevChapter.url) {
                    this.prevUrl = prevChapter.url;
                    updatesMade = true;
                }
            }

            if (currentIndex < chapters.length - 1) {
                const nextChapter = chapters[currentIndex + 1];
                if (nextChapter.url && this.nextUrl !== nextChapter.url) {
                    this.nextUrl = nextChapter.url;
                    updatesMade = true;
                }
            }

            if (updatesMade) {
                this.updateLinks();
                this.prefetch();
                console.log("Navigation healed:", {
                    prev: this.prevUrl,
                    next: this.nextUrl,
                });
            }
        } catch (e) {
            console.warn("Navigation sync failed:", e);
        }
    },

    prefetchUrl(url) {
        if (!url) return;
        if (document.head.querySelector(`link[rel="prefetch"][href="${url}"]`))
            return;

        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = url;
        document.head.appendChild(link);
    },

    prefetch() {
        this.prefetchUrl(this.prevUrl);
        this.prefetchUrl(this.nextUrl);
    },

    bindEvents() {
        document.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft" && this.prevUrl)
                window.location.href = this.prevUrl;
            if (e.key === "ArrowRight" && this.nextUrl)
                window.location.href = this.nextUrl;
        });
    },
};

const ThemeManager = {
    init() {
        this.load();
        this.bindEvents();
    },

    bindEvents() {
        DOM.toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            DOM.menu.classList.toggle("active");
            DOM.audioMenu.classList.remove("active");
        });

        document.addEventListener("click", (e) => {
            if (
                DOM.menu.classList.contains("active") &&
                !DOM.menu.contains(e.target)
            ) {
                DOM.menu.classList.remove("active");
            }
        });
        DOM.menu.addEventListener("click", (e) => e.stopPropagation());

        DOM.themeBtns.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                this.applyTheme(e.target.dataset.theme);
                this.save();
            });
        });

        DOM.inputs.fontSize.addEventListener("input", (e) => {
            this.updateCSS("--text-size", e.target.value + "px");
            DOM.displays.fontSize.textContent = e.target.value + "px";
            this.save();
        });

        DOM.inputs.lineHeight.addEventListener("input", (e) => {
            this.updateCSS("--line-height", e.target.value);
            DOM.displays.lineHeight.textContent = e.target.value;
            this.save();
        });

        DOM.inputs.spacing.addEventListener("input", (e) => {
            this.updateCSS("--letter-spacing", e.target.value + "px");
            DOM.displays.spacing.textContent = e.target.value + "px";
            this.save();
        });

        DOM.inputs.fontFamily.addEventListener("change", (e) => {
            this.updateCSS("--font-family", e.target.value);
            this.save();
        });

        DOM.inputs.paraStyle.addEventListener("change", (e) => {
            this.applyParaStyle(e.target.value);
            this.save();
        });

        document.addEventListener("keydown", (e) => {
            if (["-", "_"].includes(e.key)) this.changeFontSize(-1);
            if (["=", "+"].includes(e.key)) this.changeFontSize(1);
        });
    },

    updateCSS(prop, value) {
        DOM.root.style.setProperty(prop, value);
    },

    applyTheme(themeName) {
        const theme = CONFIG.themes[themeName] || CONFIG.themes.light;
        this.updateCSS("--bg-color", theme.bg);
        this.updateCSS("--text-color", theme.text);
        DOM.root.setAttribute("data-theme", themeName);

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", theme.bg);

        DOM.themeBtns.forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.theme === themeName);
        });
    },

    applyParaStyle(style) {
        if (style === "indent") {
            this.updateCSS("--para-indent", "2em");
        } else {
            this.updateCSS("--para-indent", "0");
        }
    },

    changeFontSize(delta) {
        const current = parseInt(DOM.inputs.fontSize.value);
        const min = parseInt(DOM.inputs.fontSize.min);
        const max = parseInt(DOM.inputs.fontSize.max);
        const newVal = current + delta;

        if (newVal >= min && newVal <= max) {
            DOM.inputs.fontSize.value = newVal;
            DOM.inputs.fontSize.dispatchEvent(new Event("input"));
        }
    },

    save() {
        const activeBtn = document.querySelector(".theme-btn.active");
        const settings = {
            fontSize: DOM.inputs.fontSize.value,
            lineHeight: DOM.inputs.lineHeight.value,
            theme: activeBtn ? activeBtn.dataset.theme : "light",
            fontFamily: DOM.inputs.fontFamily.value,
            letterSpacing: DOM.inputs.spacing.value,
            paraStyle: DOM.inputs.paraStyle.value,
            readMode: DOM.inputs.readMode.value,
        };
        localStorage.setItem(
            CONFIG.storageKeys.settings,
            JSON.stringify(settings),
        );
    },

    load() {
        const saved = localStorage.getItem(CONFIG.storageKeys.settings);

        if (!saved) {
            this.applyTheme("light");
            return;
        }

        const s = JSON.parse(saved);

        const settingsMap = [
            {
                key: "fontSize",
                css: "--text-size",
                unit: "px",
                input: "fontSize",
                display: "fontSize",
            },
            {
                key: "lineHeight",
                css: "--line-height",
                unit: "",
                input: "lineHeight",
                display: "lineHeight",
            },
            {
                key: "fontFamily",
                css: "--font-family",
                unit: "",
                input: "fontFamily",
                display: null,
            },
            {
                key: "letterSpacing",
                css: "--letter-spacing",
                unit: "px",
                input: "spacing",
                display: "spacing",
            },
        ];

        settingsMap.forEach((config) => {
            const val = s[config.key];

            if (val) {
                const valWithUnit = val + config.unit;

                this.updateCSS(config.css, valWithUnit);

                if (DOM.inputs[config.input]) {
                    DOM.inputs[config.input].value = val;
                }

                if (config.display && DOM.displays[config.display]) {
                    DOM.displays[config.display].textContent = valWithUnit;
                }
            }
        });

        if (s.paraStyle) {
            this.applyParaStyle(s.paraStyle);
            if (DOM.inputs.paraStyle) DOM.inputs.paraStyle.value = s.paraStyle;
        }

        if (s.readMode) {
            PaginationManager.setMode(s.readMode);
        }

        this.applyTheme(s.theme || "light");
    },
};

const ScrollManager = {
    lastScrollTop: 0,
    scrollKey:
        CONFIG.storageKeys.scrollPrefix +
        window.location.pathname +
        window.location.search,

    init() {
        this.setupObserver();
        this.restorePosition();

        window.addEventListener(
            "scroll",
            () => {
                this.updateProgress();
                this.handleFab();
            },
            { passive: true },
        );

        window.addEventListener("resize", () => this.updateProgress());
    },

    restorePosition() {
        if (window.location.hash) return;

        const saved = localStorage.getItem(this.scrollKey);
        if (saved) {
            setTimeout(() => window.scrollTo(0, parseInt(saved)), 100);
        }
    },

    updateProgress() {
        const scrollTop = window.scrollY;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;

        DOM.progressBar.style.width = scrollPercent + "%";

        if (docHeight - scrollTop < 50) {
            localStorage.removeItem(this.scrollKey);
        } else {
            localStorage.setItem(this.scrollKey, scrollTop);
        }
    },

    handleFab() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (Math.abs(scrollTop - this.lastScrollTop) < 10) return;

        const isScrollingDown = scrollTop > this.lastScrollTop;
        const isMenuOpen = DOM.menu.classList.contains("active");

        if (isScrollingDown && scrollTop > 50 && !isMenuOpen) {
            DOM.fabContainer.classList.add("fab-hidden");
        } else if (!isScrollingDown) {
            DOM.fabContainer.classList.remove("fab-hidden");
        }

        this.lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    },

    setupObserver() {
        const navObserver = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting) DOM.navBar.classList.add("stuck");
            else DOM.navBar.classList.remove("stuck");
        });
        navObserver.observe(DOM.sentinel);
    },
};

const HistoryManager = {
    init() {
        const history = {
            id: CHAPTER_NUM,
            title: CHAPTER_TITLE,
            url: window.location.href,
            timestamp: Date.now(),
        };

        localStorage.setItem("myriad-paths-last-read", JSON.stringify(history));
    },
};

const PaginationManager = {
    init() {
        this.pageIndicator = DOM.pagedIndicator;

        this.isNavigating = false;
        this.isAnimating = false;
        this.scrollTimeout = null;

        this.bindEvents();
        this.setupResizeObserver();
    },

    bindEvents() {
        DOM.inputs.readMode.addEventListener(
            "change",
            this.handleModeChange.bind(this),
        );
        DOM.content.addEventListener(
            "click",
            this.handleContentClick.bind(this),
        );
        document.addEventListener("keydown", this.handleKeydown.bind(this), {
            capture: true,
        });

        document.addEventListener("click", this.handleAnchorClick.bind(this));

        DOM.content.addEventListener(
            "scroll",
            this.handleUnmanagedScroll.bind(this),
            { passive: true },
        );
    },

    /**
     *
     * @param {string} e
     * @returns {void}
     */
    handleModeChange(e) {
        this.setMode(e.target.value);
        ThemeManager.save();
    },

    /**
     * Handles clicks within the reader content.
     * @param {MouseEvent} e - The click event.
     * @returns {void}
     */
    handleContentClick(e) {
        if (!DOM.body.classList.contains("paged-mode")) return;

        if (e.target.closest("a") || e.target.closest("button")) return;

        const { clientX } = e;
        const { innerWidth } = window;
        const clickZone = innerWidth * 0.25;

        if (clientX < clickZone) {
            this.turnPage(-1);
        } else if (clientX > innerWidth - clickZone) {
            this.turnPage(1);
        } else {
            DOM.body.classList.toggle("reader-ui-hidden");
        }
    },

    /**
     * Intercepts anchor links to navigate cleanly within paged mode.
     * @param {MouseEvent} e
     * @returns {void}
     */
    handleAnchorClick(e) {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor || !DOM.body.classList.contains("paged-mode")) return;

        const targetId = anchor.getAttribute("href").substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            e.preventDefault();
            this.goToElement(targetElement);
        }
    },

    /**
     * Handles arrow key navigation when in paged mode.
     * @param {KeyboardEvent} e
     * @returns {void}
     */
    handleKeydown(e) {
        if (!DOM.body.classList.contains("paged-mode")) return;

        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            e.stopImmediatePropagation();

            const isLeft = e.key === "ArrowLeft";
            this.turnPage(isLeft ? -1 : 1);
        }
    },

    /**
     * Realigns the page if a native scroll happens outside of the pagination logic.
     * @returns {void}
     */
    handleUnmanagedScroll() {
        if (!DOM.body.classList.contains("paged-mode") || this.isAnimating)
            return;

        clearTimeout(this.scrollTimeout);

        this.scrollTimeout = setTimeout(() => {
            const { scrollStep } = this.getScrollMetrics();
            const { scrollLeft } = DOM.content;

            const nearestPageIndex = Math.round(scrollLeft / scrollStep);

            this.isAnimating = true;
            DOM.content.scrollTo({
                left: nearestPageIndex * scrollStep,
                behavior: "smooth",
            });

            this.updatePageIndicator(nearestPageIndex + 1);

            DOM.content.addEventListener(
                "scrollend",
                () => {
                    this.isAnimating = false;
                },
                { once: true },
            );
        }, 150);
    },

    /**
     * Sets the reader display mode and resets interface state for paged viewing.
     * @param {string} mode - The layout mode (e.g., "paged").
     * @returns {void}
     */
    setMode(mode) {
        const isPaged = mode === "paged";

        DOM.body.classList.toggle("paged-mode", isPaged);
        DOM.body.classList.toggle("reader-ui-hidden", isPaged);

        if (isPaged) {
            DOM.body.scrollTop = 0;
            DOM.body.scrollLeft = 0;
            this.updatePageIndicator(1);
        }

        DOM.inputs.readMode.value = mode;
    },

    turnPage(direction) {
        if (this.isNavigating || this.isAnimating) return false;

        const { scrollStep, exactWidth } = this.getScrollMetrics();
        const { scrollLeft, scrollWidth } = DOM.content;
        const maxScroll = scrollWidth - exactWidth;

        const currentPageIndex = Math.round(scrollLeft / scrollStep);
        const targetPageIndex = currentPageIndex + direction;

        if (targetPageIndex < 0) {
            if (NavigationManager.prevUrl) {
                this.isNavigating = true;
                window.location.href = NavigationManager.prevUrl;
            }
            return false;
        }

        if (targetPageIndex * scrollStep > maxScroll + 5) {
            if (NavigationManager.nextUrl) {
                this.isNavigating = true;
                window.location.href = NavigationManager.nextUrl;
            }
            return false;
        }

        this.isAnimating = true;
        DOM.body.classList.add("reader-ui-hidden");

        DOM.content.scrollTo({
            left: targetPageIndex * scrollStep,
            behavior: "smooth",
        });

        this.updatePageIndicator(targetPageIndex + 1);

        DOM.content.addEventListener(
            "scrollend",
            () => {
                this.isAnimating = false;
            },
            { once: true },
        );

        return true;
    },

    /**
     * Calculates the target page for an element and smoothly scrolls to it.
     * @param {HTMLElement} element
     * @returns {void}
     */
    goToElement(element) {
        if (this.isNavigating || this.isAnimating) return;

        const { scrollStep } = this.getScrollMetrics();
        const containerRect = DOM.content.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        const absoluteLeft =
            elementRect.left - containerRect.left + DOM.content.scrollLeft;
        const targetPageIndex = Math.floor(absoluteLeft / scrollStep);
        const targetScrollLeft = targetPageIndex * scrollStep;

        this.isAnimating = true;
        DOM.content.scrollTo({
            left: targetScrollLeft,
            behavior: "smooth",
        });

        this.updatePageIndicator(targetPageIndex + 1);

        DOM.content.addEventListener(
            "scrollend",
            () => {
                this.isAnimating = false;
            },
            { once: true },
        );
    },

    updatePageIndicator(predictivePage = null) {
        const { scrollStep } = this.getScrollMetrics();
        const { scrollLeft, scrollWidth } = DOM.content;

        if (scrollStep <= 0) return;

        const totalPages = Math.ceil(scrollWidth / scrollStep);

        const currentPage =
            predictivePage !== null
                ? predictivePage
                : Math.round(scrollLeft / scrollStep) + 1;

        if (totalPages > 0) {
            this.pageIndicator.textContent = `${currentPage} / ${totalPages}`;
        }
    },

    getScrollMetrics() {
        const exactWidth = DOM.content.getBoundingClientRect().width;
        const style = window.getComputedStyle(DOM.content);

        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingRight = parseFloat(style.paddingRight) || 0;
        let gapValue =
            style.columnGap !== "normal" ? style.columnGap : style.fontSize;
        const gap = parseFloat(gapValue) || parseFloat(style.gap) || 0;

        const contentWidth = exactWidth - paddingLeft - paddingRight;
        const scrollStep = contentWidth + gap;

        return { scrollStep, exactWidth };
    },

    /**
     * Watches for dimension changes
     * @returns {void}
     */
    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver(() => {
            if (DOM.body.classList.contains("paged-mode")) {
                this.updatePageIndicator(null);
            }
        });

        this.resizeObserver.observe(DOM.content);
    },
};

document.addEventListener("DOMContentLoaded", () => {
    NavigationManager.init();
    PaginationManager.init();
    ThemeManager.init();
    ScrollManager.init();
    HistoryManager.init();
});
