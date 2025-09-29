document.addEventListener("DOMContentLoaded", () => {
    // --- Configuration ---
    const config = {
        imagePath: 'assets/manhwa/',
        imagePrefix: 'slice_',
        imageExtension: '.webp',
        totalImages: 75,
        // Pads the number with leading zeros (e.g., 1 -> "001")
        padLength: 3 
    };

    const readerContainer = document.getElementById('reader-container');

    if (!readerContainer) {
        console.error("Reader container not found!");
        return;
    }

    // --- Create and configure the IntersectionObserver ---
    // This is the modern, efficient way to handle lazy loading.
    const observer = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach(entry => {
                // If the image placeholder is intersecting the viewport (or is close to it)
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const realSrc = img.dataset.src;

                    // Start loading the real image
                    img.src = realSrc;

                    // When the real image is loaded, update its class
                    img.onload = () => {
                        img.classList.remove('lazy');
                        img.classList.add('loaded');
                    };
                    
                    // Stop observing this image once we've started loading it.
                    // This is a crucial performance optimization.
                    observer.unobserve(img);
                }
            });
        }, 
        {
            // This is the "pre-loading" buffer.
            // It starts loading images when they are 500px away from the bottom of the viewport.
            // Adjust this value based on typical image height for smoother scrolling.
            rootMargin: '0px 0px 500px 0px'
        }
    );

    // --- Dynamically generate image placeholders ---
    for (let i = 1; i <= config.totalImages; i++) {
        const img = document.createElement('img');

        // Format the image number (e.g., 1 -> "001")
        const imageNumber = String(i).padStart(config.padLength, '0');
        const imageUrl = `${config.imagePath}${config.imagePrefix}${imageNumber}${config.imageExtension}`;

        // Set the real source in a data attribute. The 'src' will be set by the observer.
        img.dataset.src = imageUrl;
        
        // Add classes for styling and an alt tag for accessibility
        img.className = 'manhwa-image lazy';
        img.alt = `Page ${i}`;
        
        // Append the placeholder to the container
        readerContainer.appendChild(img);
        
        // Tell the observer to watch this new placeholder
        observer.observe(img);
    }

});
