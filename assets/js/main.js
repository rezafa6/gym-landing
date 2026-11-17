(() => {
  'use strict';

  const root = document.documentElement;
  const themeKey = 'form-gym-theme';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let explicitTheme = false;
  let pauseMotion = false;
  let storedTheme = null;

  try {
    storedTheme = localStorage.getItem(themeKey);
  } catch {
    storedTheme = null;
  }

  explicitTheme = storedTheme === 'dark' || storedTheme === 'light';
  root.dataset.theme = explicitTheme ? storedTheme : systemTheme.matches ? 'dark' : 'light';

  const motionAllowed = () => !reducedMotion.matches && !pauseMotion;
  const numberFormat = new Intl.NumberFormat('fa-IR');

  document.addEventListener('DOMContentLoaded', () => {
    const select = (selector, context = document) => context.querySelector(selector);
    const selectAll = (selector, context = document) => [...context.querySelectorAll(selector)];
    const themeButton = select('.theme-toggle');
    const themeMeta = select('meta[name="theme-color"]');
    const motionButton = select('#motion-toggle');
    const header = select('#site-header');
    const progressBar = select('.reading-progress');
    const backToTop = select('.back-to-top');
    const menuButton = select('.menu-toggle');
    const mobileMenu = select('#mobile-menu');
    const tourDialog = select('#tour-dialog');
    const form = select('#consultation-form');
    const formFields = select('#form-fields');
    const nameInput = select('#full-name');
    const mobileInput = select('#mobile');
    const goalSelect = select('#fitness-goal');
    const submitButton = select('.submit-button');
    const submitLabel = select('.button-label', submitButton);
    const feedback = select('#form-feedback');
    const coachBanner = select('#selected-coach');
    const toast = select('.toast');
    let toastTimer = 0;
    let submitting = false;
    let galleryIndex = 0;
    let lastScrollFrame = 0;
    const restoreFocus = new WeakMap();
    const navLinks = selectAll('.desktop-nav a, #mobile-menu nav a');
    const sections = selectAll('main > section[id]');
    const parallaxImage = select('.hero-photo > img');

    function applyTheme(theme, save = false) {
      root.dataset.theme = theme;
      const isDark = theme === 'dark';
      const label = isDark ? 'فعال‌سازی پوستهٔ روشن' : 'فعال‌سازی پوستهٔ تیره';
      themeButton.setAttribute('aria-pressed', String(isDark));
      themeButton.setAttribute('aria-label', label);
      themeButton.title = label;
      themeMeta.content = getComputedStyle(root).getPropertyValue('--color-background').trim();
      if (save) {
        explicitTheme = true;
        try {
          localStorage.setItem(themeKey, theme);
        } catch {
          showToast('پوسته تغییر کرد؛ ذخیرهٔ تنظیمات در این مرورگر در دسترس نیست.');
        }
      }
    }

    function showToast(message) {
      window.clearTimeout(toastTimer);
      toast.textContent = message;
      toast.hidden = false;
      toastTimer = window.setTimeout(() => {
        toast.hidden = true;
      }, 4200);
    }

    applyTheme(root.dataset.theme);
    themeButton.addEventListener('click', () => {
      applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });
    systemTheme.addEventListener('change', (event) => {
      if (!explicitTheme) applyTheme(event.matches ? 'dark' : 'light');
    });
    window.addEventListener('storage', (event) => {
      if (event.key !== themeKey) return;
      explicitTheme = event.newValue === 'light' || event.newValue === 'dark';
      applyTheme(explicitTheme ? event.newValue : systemTheme.matches ? 'dark' : 'light');
    });

    function syncMotion() {
      const stopped = !motionAllowed();
      root.classList.toggle('motion-paused', stopped);
      motionButton.setAttribute('aria-pressed', String(stopped));
      select('span', motionButton).textContent = stopped ? 'فعال‌سازی حرکت‌های تزئینی' : 'توقف حرکت‌های تزئینی';
      if (reducedMotion.matches) {
        select('span', motionButton).textContent = 'حرکت‌ها طبق تنظیمات دستگاه خاموش‌اند';
        motionButton.setAttribute('aria-disabled', 'true');
      } else {
        motionButton.removeAttribute('aria-disabled');
      }
      if (stopped) {
        parallaxImage.style.removeProperty('--parallax-y');
        selectAll('.reveal').forEach((element) => element.classList.add('is-visible'));
      }
    }

    motionButton.addEventListener('click', () => {
      if (reducedMotion.matches) {
        showToast('برای فعال‌کردن حرکت‌ها، تنظیم کاهش حرکت در دستگاه را تغییر دهید.');
        return;
      }
      pauseMotion = !pauseMotion;
      syncMotion();
    });
    reducedMotion.addEventListener('change', syncMotion);
    syncMotion();

    function openDialog(dialog, trigger) {
      if (dialog.open) return;
      restoreFocus.set(dialog, trigger || document.activeElement);
      dialog.showModal();
      document.body.classList.add('dialog-open');
      if (dialog === mobileMenu) menuButton.setAttribute('aria-expanded', 'true');
    }

    function closeDialog(dialog, focusBack = true) {
      if (!focusBack) restoreFocus.delete(dialog);
      dialog.close();
    }

    selectAll('dialog').forEach((dialog) => {
      selectAll('[data-close-dialog]', dialog).forEach((button) => {
        button.addEventListener('click', () => closeDialog(dialog));
      });
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
        if (outside) closeDialog(dialog);
      });
      dialog.addEventListener('close', () => {
        if (!select('dialog[open]')) document.body.classList.remove('dialog-open');
        if (dialog === mobileMenu) menuButton.setAttribute('aria-expanded', 'false');
        const previous = restoreFocus.get(dialog);
        if (previous && previous.isConnected) previous.focus({ preventScroll: true });
        restoreFocus.delete(dialog);
      });
    });
    menuButton.addEventListener('click', () => openDialog(mobileMenu, menuButton));
    window.matchMedia('(min-width: 961px)').addEventListener('change', (event) => {
      if (event.matches && mobileMenu.open) closeDialog(mobileMenu, false);
    });

    function scrollToSection(id, focus = true) {
      const destination = document.getElementById(id);
      if (!destination) return;
      if (mobileMenu.open) closeDialog(mobileMenu, false);
      destination.scrollIntoView({ behavior: motionAllowed() ? 'smooth' : 'auto', block: 'start' });
      if (focus) {
        destination.setAttribute('tabindex', '-1');
        destination.focus({ preventScroll: true });
        destination.addEventListener('blur', () => destination.removeAttribute('tabindex'), { once: true });
      }
      try {
        if (window.location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
      } catch {
        return;
      }
    }

    selectAll('a[href^="#"]').forEach((link) => {
      const id = link.getAttribute('href').slice(1);
      if (!document.getElementById(id)) return;
      link.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (link.dataset.goal) {
          goalSelect.value = link.dataset.goal;
          feedback.hidden = true;
        }
        if (link.dataset.coach) {
          select('span', coachBanner).textContent = `مربی انتخاب‌شده: ${link.dataset.coach}`;
          coachBanner.hidden = false;
        } else if (link.dataset.goal) {
          clearCoach();
        }
        scrollToSection(id);
      });
    });

    function clearCoach() {
      coachBanner.hidden = true;
      select('span', coachBanner).textContent = '';
    }
    select('button', coachBanner).addEventListener('click', () => {
      clearCoach();
      nameInput.focus({ preventScroll: true });
    });

    function updateScroll() {
      lastScrollFrame = 0;
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 55);
      const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, y / total))})`;
      backToTop.hidden = y < 650;
      if (motionAllowed() && window.innerWidth > 720 && y < 900) {
        parallaxImage.style.setProperty('--parallax-y', `${Math.min(18, y * 0.035)}px`);
      }
      const marker = y + Math.min(220, window.innerHeight * 0.3);
      let activeId = 'home';
      sections.forEach((section) => {
        if (section.offsetTop <= marker) activeId = section.id;
      });
      if (window.innerHeight + y >= document.documentElement.scrollHeight - 30) activeId = 'consultation';
      navLinks.forEach((link) => {
        const active = link.getAttribute('href') === `#${activeId}`;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    function requestScrollUpdate() {
      if (!lastScrollFrame) lastScrollFrame = window.requestAnimationFrame(updateScroll);
    }
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', requestScrollUpdate, { passive: true });
    updateScroll();
    backToTop.addEventListener('click', () => scrollToSection('home'));

    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px 20px 0px' });
      selectAll('.reveal').forEach((element) => revealObserver.observe(element));
      if (motionAllowed()) root.classList.add('enhanced-motion');

      const countObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.8 });
      selectAll('[data-count]').forEach((element) => countObserver.observe(element));
    }

    function animateCounter(element) {
      const target = Number(element.dataset.count);
      if (!motionAllowed()) {
        element.textContent = numberFormat.format(target);
        return;
      }
      const start = performance.now();
      const duration = 1250;
      function frame(now) {
        if (!motionAllowed()) {
          element.textContent = numberFormat.format(target);
          return;
        }
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = numberFormat.format(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    selectAll('.spotlight').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        if (!motionAllowed() || event.pointerType === 'touch') return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
      }, { passive: true });
    });

    const tabs = selectAll('.journey-tabs [role="tab"]');
    function activateTab(index, focus = false) {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
      });
      if (focus) tabs[index].focus();
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activateTab(index));
      tab.addEventListener('keydown', (event) => {
        let next = index;
        if (event.key === 'ArrowLeft') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowRight') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        activateTab(next, true);
      });
    });

    const gallery = [
      { source: select('.about-photo img'), caption: 'فضای تمرین', alt: 'تصویر نمونهٔ فضای روشن باشگاه و تجهیزات تمرین' },
      { source: select('.service-image img'), caption: 'تمرین قدرتی', alt: 'تصویر نمونهٔ تمرین قدرتی با هالتر' }
    ];
    function showGalleryImage(index) {
      galleryIndex = (index + gallery.length) % gallery.length;
      const item = gallery[galleryIndex];
      const image = select('#tour-image');
      image.classList.remove('image-unavailable');
      image.src = item.source.currentSrc || item.source.src;
      image.alt = item.alt;
      select('#tour-caption').textContent = `${item.caption} · ${numberFormat.format(galleryIndex + 1)} از ${numberFormat.format(gallery.length)}`;
    }
    selectAll('[data-open-tour]').forEach((button) => {
      button.addEventListener('click', () => {
        showGalleryImage(0);
        openDialog(tourDialog, button);
      });
    });
    select('#tour-next').addEventListener('click', () => showGalleryImage(galleryIndex + 1));
    select('#tour-previous').addEventListener('click', () => showGalleryImage(galleryIndex - 1));
    tourDialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showGalleryImage(galleryIndex + 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        showGalleryImage(galleryIndex - 1);
      }
    });

    function normalizeMobile(value) {
      let cleaned = value.trim().replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632));
      cleaned = cleaned.replace(/[\u200c\u200d\u200e\u200f]/g, '');
      if (!/^[+\d\s()-]+$/.test(cleaned)) return '';
      cleaned = cleaned.replace(/[\s()-]/g, '');
      if (cleaned.startsWith('+98')) cleaned = `0${cleaned.slice(3)}`;
      else if (cleaned.startsWith('0098')) cleaned = `0${cleaned.slice(4)}`;
      else if (cleaned.startsWith('98')) cleaned = `0${cleaned.slice(2)}`;
      return /^09\d{9}$/.test(cleaned) ? cleaned : '';
    }

    function validateField(input) {
      let message = '';
      if (input === nameInput) {
        const value = input.value.trim().replace(/\s+/g, ' ');
        const letters = value.match(/\p{L}/gu) || [];
        if (!value) message = 'لطفاً نام و نام خانوادگی‌ات را وارد کن.';
        else if (letters.length < 3 || value.length > 80 || !/^[\p{L}\p{M}\s\u200c\u200d.'’\-]+$/u.test(value)) message = 'نام را با حداقل ۳ حرف و بدون عدد وارد کن.';
      } else if (input === mobileInput) {
        if (!input.value.trim()) message = 'لطفاً شمارهٔ موبایلت را وارد کن.';
        else if (!normalizeMobile(input.value)) message = 'شمارهٔ معتبر ایران وارد کن؛ مثل ۰۹۱۲۳۴۵۶۷۸۹ یا ‎+۹۸۹۱۲۳۴۵۶۷۸۹.';
      }
      const error = document.getElementById(input === nameInput ? 'name-error' : 'mobile-error');
      error.textContent = message;
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      return !message;
    }

    [nameInput, mobileInput].forEach((input) => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.hasAttribute('aria-invalid')) validateField(input);
        if (!submitting) feedback.hidden = true;
      });
    });

    function showFeedback(title, message, isError = false) {
      feedback.replaceChildren();
      const heading = document.createElement('strong');
      heading.textContent = title;
      const description = document.createElement('p');
      description.textContent = message;
      feedback.append(heading, description);
      feedback.classList.toggle('is-error', isError);
      feedback.hidden = false;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitting) return;
      const results = [nameInput, mobileInput].map((input) => ({ input, valid: validateField(input) }));
      const firstInvalid = results.find((result) => !result.valid);
      if (firstInvalid) {
        showFeedback('یک بار دیگه بررسی کن.', 'موارد مشخص‌شده را اصلاح کن تا نمایش آزمایشی ادامه پیدا کند.', true);
        firstInvalid.input.focus();
        return;
      }
      submitting = true;
      feedback.hidden = true;
      form.setAttribute('aria-busy', 'true');
      formFields.disabled = true;
      submitButton.disabled = true;
      submitLabel.textContent = 'در حال شبیه‌سازی درخواست…';
      try {
        await new Promise((resolve) => window.setTimeout(resolve, 950));
        form.reset();
        clearCoach();
        [nameInput, mobileInput].forEach((input) => input.removeAttribute('aria-invalid'));
        showFeedback('نمایش آزمایشی با موفقیت انجام شد.', 'هیچ اطلاعاتی ارسال یا ذخیره نشده است و تماسی برقرار نخواهد شد. در نسخهٔ واقعی، این بخش به سامانهٔ درخواست مشاوره متصل می‌شود.');
      } catch {
        showFeedback('نمایش آزمایشی کامل نشد.', 'دوباره تلاش کن. اطلاعاتی ارسال یا ذخیره نشده است.', true);
      } finally {
        submitting = false;
        form.removeAttribute('aria-busy');
        formFields.disabled = false;
        submitButton.disabled = false;
        submitLabel.textContent = 'درخواست مشاورهٔ رایگان';
        feedback.focus({ preventScroll: true });
      }
    });
    submitButton.disabled = false;

    selectAll('.media-frame > img').forEach((image) => {
      function handleFailure() {
        image.classList.add('image-unavailable');
        image.parentElement.classList.add('has-image-fallback');
      }
      image.addEventListener('error', handleFailure);
      image.addEventListener('load', () => {
        image.classList.remove('image-unavailable');
        image.parentElement.classList.remove('has-image-fallback');
      });
      if (image.complete && image.naturalWidth === 0) handleFailure();
    });

    try {
      select('#copyright-year').textContent = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date());
    } catch {
      select('#copyright-year').textContent = '۱۴۰۵';
    }
  });
})();
