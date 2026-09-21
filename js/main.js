/**
 * РТК АРТА — vanilla JS для интерактива, который не переживёт переноса на WordPress иначе:
 * мобильное меню, аккордеон FAQ (частично нативный через <details>), калькулятор,
 * условные поля формы заказа, простая клиентская валидация с фокус-менеджментом.
 * Без сборщиков и фреймворков — можно вставлять как есть в футер WP-темы.
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * 1. Мобильное меню
   * ------------------------------------------------------------------- */
  function initMobileNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.querySelector('[data-mobile-nav]');
    if (!toggle || !nav) return;

    function closeNav() {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');
    }
    function openNav() {
      toggle.setAttribute('aria-expanded', 'true');
      nav.classList.add('is-open');
      document.body.classList.add('nav-open');
    }

    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      if (expanded) { closeNav(); } else { openNav(); }
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        closeNav();
        toggle.focus();
      }
    });
  }

  /* ---------------------------------------------------------------------
   * 2. Общая утилита: условные поля (показать/скрыть по чекбоксу)
   * ------------------------------------------------------------------- */
  function initConditionalFields() {
    document.querySelectorAll('[data-toggle-source]').forEach(function (source) {
      var targetSelector = source.getAttribute('data-toggle-source');
      var target = document.querySelector(targetSelector);
      if (!target) return;

      function sync() {
        var show = source.type === 'checkbox' ? source.checked : !!source.value;
        target.classList.toggle('is-visible', show);
        target.querySelectorAll('[data-required-when-visible]').forEach(function (field) {
          if (show) {
            field.setAttribute('required', 'required');
          } else {
            field.removeAttribute('required');
            field.value = '';
            clearFieldError(field);
          }
        });
      }
      source.addEventListener('change', sync);
      sync();
    });
  }

  /* ---------------------------------------------------------------------
   * 3. Валидация форм: инлайн-ошибки + сводка ошибок с фокус-менеджментом
   * ------------------------------------------------------------------- */
  function fieldWrap(field) {
    return field.closest('.form-field');
  }

  function setFieldError(field, message) {
    var wrap = fieldWrap(field);
    if (!wrap) return;
    wrap.classList.add('has-error');
    var errorEl = wrap.querySelector('.form-field__error');
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  function clearFieldError(field) {
    var wrap = fieldWrap(field);
    if (!wrap) return;
    wrap.classList.remove('has-error');
  }

  function isFieldVisible(field) {
    return !!(field.offsetWidth || field.offsetHeight || field.getClientRects().length);
  }

  function validateField(field) {
    if (!isFieldVisible(field) || field.disabled) return true;
    var value = field.value.trim();
    if (field.hasAttribute('required') && !value) {
      setFieldError(field, 'Заполните это поле');
      return false;
    }
    if (field.type === 'tel' && value) {
      var phoneOk = value.replace(/[^\d]/g, '').length >= 10;
      if (!phoneOk) {
        setFieldError(field, 'Проверьте номер телефона');
        return false;
      }
    }
    if (field.type === 'email' && value) {
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!emailOk) {
        setFieldError(field, 'Проверьте адрес email');
        return false;
      }
    }
    if (field.type === 'checkbox' && field.hasAttribute('required') && !field.checked) {
      setFieldError(field, 'Нужно подтвердить согласие');
      return false;
    }
    clearFieldError(field);
    return true;
  }

  function initFormValidation(form) {
    if (!form) return;
    var errorSummary = form.querySelector('[data-error-summary]');
    var successBlock = form.querySelector('[data-form-success]');
    var fieldsWrap = form.querySelector('[data-form-fields]') || form;

    var fields = Array.prototype.slice.call(
      form.querySelectorAll('input, select, textarea')
    );

    fields.forEach(function (field) {
      field.addEventListener('blur', function () { validateField(field); });
      field.addEventListener('input', function () {
        if (fieldWrap(field) && fieldWrap(field).classList.contains('has-error')) {
          validateField(field);
        }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var invalidFields = [];
      fields.forEach(function (field) {
        if (!validateField(field)) invalidFields.push(field);
      });

      if (invalidFields.length) {
        if (errorSummary) {
          var list = errorSummary.querySelector('ul');
          list.innerHTML = '';
          invalidFields.forEach(function (field) {
            var id = field.id;
            var labelEl = form.querySelector('label[for="' + id + '"]');
            var labelText;
            if (labelEl) {
              labelText = labelEl.textContent.replace('*', '').trim();
            } else {
              // Чекбоксы в паттерне .check-row (напр. #consent) не имеют
              // <label for>, только видимый заголовок в .check-row__title —
              // используем его, иначе в сводке ошибок остаётся заглушка.
              var checkRow = field.closest('.check-row');
              var titleEl = checkRow && checkRow.querySelector('.check-row__title');
              labelText = titleEl ? titleEl.textContent.replace('*', '').trim() : 'Поле формы';
            }
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = '#' + id;
            a.textContent = labelText;
            a.addEventListener('click', function (ev) {
              ev.preventDefault();
              field.focus();
            });
            li.appendChild(a);
            list.appendChild(li);
          });
          errorSummary.classList.add('is-visible');
          errorSummary.setAttribute('tabindex', '-1');
          errorSummary.focus();
        } else {
          invalidFields[0].focus();
        }
        return;
      }

      if (errorSummary) errorSummary.classList.remove('is-visible');

      // Реальная отправка не реализована — это визуально рабочий фронтенд.
      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.classList.add('is-loading');

      setTimeout(function () {
        if (submitBtn) submitBtn.classList.remove('is-loading');
        fieldsWrap.style.display = 'none';
        if (errorSummary) errorSummary.style.display = 'none';
        var actions = form.querySelector('[data-form-actions]');
        if (actions) actions.style.display = 'none';
        if (successBlock) {
          var orderNumber = 'RTK-' + Math.floor(100000 + Math.random() * 899999);
          var numberEl = successBlock.querySelector('[data-order-number]');
          if (numberEl) numberEl.textContent = orderNumber;
          successBlock.classList.add('is-visible');
          successBlock.setAttribute('tabindex', '-1');
          successBlock.focus();
        }
      }, 700);
    });
  }

  /* ---------------------------------------------------------------------
   * 4. Калькулятор ориентировочной стоимости (главная страница)
   * ------------------------------------------------------------------- */
  function initCalculator() {
    var calc = document.querySelector('[data-calculator]');
    if (!calc) return;

    var distanceInput = calc.querySelector('[data-calc-distance]');
    var urgencySelect = calc.querySelector('[data-calc-urgency]');
    var insuranceCheckbox = calc.querySelector('[data-calc-insurance]');
    var valueInput = calc.querySelector('[data-calc-value]');
    var resultDelivery = calc.querySelector('[data-calc-result-delivery]');
    var resultInsurance = calc.querySelector('[data-calc-result-insurance]');
    var resultTotal = calc.querySelector('[data-calc-result-total]');

    var RATE_PER_KM = 22; // ориентировочная ставка за км, ₽ — плейсхолдер до утверждения тарифа
    var BASE_MIN = 140;
    var BASE_MAX = 500;
    var INSURANCE_RATE = 0.007; // 0.7% — среднее из диапазона 0.5–1%, гипотеза

    var URGENCY_MULTIPLIER = {
      standard: 1,
      today: 1.15,
      urgent: 1.45
    };

    function formatRub(value) {
      return Math.round(value).toLocaleString('ru-RU') + ' ₽';
    }

    function recalc() {
      var distance = parseFloat(distanceInput.value) || 0;
      var urgency = urgencySelect.value;
      var multiplier = URGENCY_MULTIPLIER[urgency] || 1;

      var delivery = BASE_MIN + distance * RATE_PER_KM;
      delivery *= multiplier;
      delivery = Math.min(Math.max(delivery, BASE_MIN), BASE_MAX * multiplier);

      var insuranceFee = 0;
      var insuranceOn = insuranceCheckbox && insuranceCheckbox.checked;
      if (insuranceOn) {
        var declaredValue = parseFloat(valueInput.value) || 0;
        insuranceFee = declaredValue * INSURANCE_RATE;
      }

      if (resultDelivery) resultDelivery.textContent = formatRub(delivery);
      if (resultInsurance) resultInsurance.textContent = insuranceOn ? formatRub(insuranceFee) : '—';
      if (resultTotal) resultTotal.textContent = formatRub(delivery + insuranceFee);
    }

    [distanceInput, urgencySelect, insuranceCheckbox, valueInput].forEach(function (el) {
      if (el) el.addEventListener('input', recalc);
      if (el) el.addEventListener('change', recalc);
    });

    recalc();
  }

  /* ---------------------------------------------------------------------
   * Init
   * ------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initConditionalFields();
    initCalculator();
    document.querySelectorAll('[data-validate-form]').forEach(initFormValidation);
  });
})();
