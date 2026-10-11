const carousel = document.querySelector<HTMLElement>('.hero-visual');

if (carousel) {
  const slides = Array.from(carousel.querySelectorAll<HTMLElement>('.hero-slide'));
  const dots = Array.from(carousel.querySelectorAll<HTMLButtonElement>('.carousel-dot'));
  const current = carousel.querySelector<HTMLElement>('.hero-current');
  const previous = carousel.querySelector<HTMLButtonElement>('.carousel-previous');
  const next = carousel.querySelector<HTMLButtonElement>('.carousel-next');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeIndex = 0;
  let timer: number | undefined;

  const showSlide = (index: number): void => {
    activeIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeIndex;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
      slide.inert = !isActive;
    });

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeIndex;
      dot.classList.toggle('is-active', isActive);
      if (isActive) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });

    if (current) current.textContent = String(activeIndex + 1).padStart(2, '0');
  };

  const stopAutoplay = (): void => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  };

  const startAutoplay = (): void => {
    if (reducedMotion || document.hidden || timer !== undefined) return;
    timer = window.setInterval(() => showSlide(activeIndex + 1), 6000);
  };

  previous?.addEventListener('click', () => showSlide(activeIndex - 1));
  next?.addEventListener('click', () => showSlide(activeIndex + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));

  carousel.addEventListener('pointerenter', stopAutoplay);
  carousel.addEventListener('pointerleave', startAutoplay);
  carousel.addEventListener('focusin', stopAutoplay);
  carousel.addEventListener('focusout', (event) => {
    if (!carousel.contains(event.relatedTarget as Node | null)) startAutoplay();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  showSlide(0);
  startAutoplay();
}
