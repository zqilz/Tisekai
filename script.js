document.addEventListener("DOMContentLoaded", () => {
    // --- Configuration ---
    // NEW: More explicit and flexible configuration
    const config = {
        imagePath: 'assets/manhwa/',
        imagePrefix: 'slice_',
        padLength: 3,
        // Define the formats you want to support, in order of preference.
        // The browser will pick the first one it supports.
        imageFormats: ['avif', 'webp'],
        // This is the format that is GUARANTEED to exist for your fallback `<img>` tag.
        fallbackFormat: 'webp',
        // The width of your main, non-suffixed image file (e.g., 'slice_001.webp').
        baseWidth: 1600,
        // An array of any smaller, suffixed widths you have generated (e.g., 'slice_001-800w.webp').
        // This can be an empty array [] if you only have the baseWidth images.
        smallerWidths: [800],
        preloadCount: 2, 
    };

    // --- Element Selection ---
    const readerContainer = document.getElementById('reader-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const goToTopBtn = document.getElementById('go-to-top');

    if (!readerContainer || !progressBar || !goToTopBtn) {
        console.error("A required UI element was not found in the DOM!");
        return;
    }

    async function fetchManifestAndInitialize() {
        try {
            const response = await fetch(`${config.imagePath}manifest.json`);
            if (!response.ok) throw new Error(`Manifest not found: ${response.statusText}`);
            const manifest = await response.json();
            initializeReader(manifest);
        } catch (error) {
            console.error("Failed to load chapter manifest:", error);
            readerContainer.innerHTML = `<p style="text-align: center; color: #aaa;">Failed to load chapter data.</p>`;
        }
    }

    function initializeReader(manifest) {
        const { totalImages, firstImageAspectRatio } = manifest;

        if (!totalImages || totalImages === 0) {
            readerContainer.innerHTML = `<p style="text-align: center; color: #aaa;">No images found in chapter.</p>`;
            return;
        }
        
        // --- CHANGED: More robust width handling ---
        // Combine all available widths, with the base width being the largest.
        const allWidths = [config.baseWidth, ...config.smallerWidths].sort((a, b) => b - a);
        const smallestWidth = Math.min(...allWidths);

        const firstImagePlaceholder = document.getElementById('page-container-1');
        if (firstImagePlaceholder) {
            const firstImage = firstImagePlaceholder.querySelector('.manhwa-image');
            firstImage.decode().then(() => firstImage.classList.add('loaded')).catch(console.error);
        }

        for (let i = 2; i <= totalImages; i++) {
            const imageNumber = String(i).padStart(config.padLength, '0');

            const placeholder = document.createElement('div');
            placeholder.className = 'image-placeholder lazy';
            placeholder.id = `page-container-${i}`;
            placeholder.style.setProperty('--aspect-ratio', firstImageAspectRatio);

            const picture = document.createElement('picture');
            
            // --- CHANGED: More robust <source> and srcset generation ---
            config.imageFormats.forEach(format => {
                const srcsetParts = allWidths.map(width => {
                    // The base width has no suffix, smaller widths do.
                    const suffix = (width === config.baseWidth) ? '' : `-${width}w`;
                    const url = `${config.imagePath}${config.imagePrefix}${imageNumber}${suffix}.${format}`;
                    return `${url} ${width}w`;
                });
                const source = document.createElement('source');
                source.type = `image/${format}`;
                source.dataset.srcset = srcsetParts.join(', ');
                picture.appendChild(source);
            });

            const img = document.createElement('img');
            img.className = 'manhwa-image';
            img.alt = `Page ${i}`;
            img.dataset.page = i;
            img.sizes = '(max-width: 800px) 100vw, 800px';
            
            // --- CHANGED: A more reliable fallback src ---
            // It uses the smallest available width of your guaranteed fallback format.
            const fallbackSuffix = (smallestWidth === config.baseWidth) ? '' : `-${smallestWidth}w`;
            img.dataset.src = `${config.imagePath}${config.imagePrefix}${imageNumber}${fallbackSuffix}.${config.fallbackFormat}`;

            picture.appendChild(img);
            placeholder.appendChild(picture);
            readerContainer.appendChild(placeholder);
            
            if (i <= config.preloadCount + 1) {
                loadImage(placeholder);
            } else {
                observer.observe(placeholder);
            }
        }
        
        handleScroll(totalImages);
        window.addEventListener('scroll', throttle(() => handleScroll(totalImages), 100));
    }
    
    // --- loadImage and observer are unchanged ---
    const loadImage = (placeholder) => {
        const sources = placeholder.querySelectorAll('source');
        const imgElement = placeholder.querySelector('img');

        sources.forEach(source => {
            source.srcset = source.dataset.srcset;
        });
        imgElement.src = imgElement.dataset.src;

        imgElement.decode()
            .then(() => {
                imgElement.classList.add('loaded');
                placeholder.classList.remove('lazy');
            })
            .catch((error) => {
                console.error(`Failed to decode image: ${imgElement.dataset.src}`, error);
                placeholder.classList.add('error');
                placeholder.textContent = `Error loading page ${imgElement.dataset.page}`;
            });
    };

    const observer = new IntersectionObserver(
        (entries, observerInstance) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const placeholder = entry.target;
                    loadImage(placeholder);
                    observerInstance.unobserve(placeholder);
                }
            });
        }, { rootMargin: '200%' }
    );

    // --- UI Event Handlers (Unchanged) ---
    const throttle = (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    };
    
    // --- FIX: Corrected scroll handling logic ---
    const handleScroll = (totalImages) => {
        if (totalImages === 0) return;
        const pagePlaceholders = document.querySelectorAll('.image-placeholder');
        const viewportHeight = window.innerHeight;
        let currentPage = 1;

        // Iterate backwards from the last image to the first.
        for (let i = pagePlaceholders.length - 1; i >= 0; i--) {
            const rect = pagePlaceholders[i].getBoundingClientRect();
            
            // Find the last image that has its top edge past the vertical
            // middle of the screen. This is our current page.
            if (rect.top < viewportHeight * 0.5) {
                currentPage = i + 1;
                break; // Found it, no need to check earlier pages.
            }
        }

        const progress = (currentPage / totalImages) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${currentPage} / ${totalImages}`;

        if (window.scrollY > viewportHeight) {
            goToTopBtn.classList.add('visible');
        } else {
            goToTopBtn.classList.remove('visible');
        }
    };
    
    goToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Main Execution Logic ---
    fetchManifestAndInitialize();
});