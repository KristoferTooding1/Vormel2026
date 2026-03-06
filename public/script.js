const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), 60 * i);
        }
    });
}, { threshold: 0.05 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
