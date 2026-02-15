const CAPTCHA_LABEL = RecaptchaSettings.captcha_lable;
const REFRESH_LABEL = RecaptchaSettings.refresh_lable;
const CAPTCHA_BLANK = RecaptchaSettings.recapcha_error_msg_captcha_blank;
const CAPTCHA_INVALID = RecaptchaSettings.recapcha_error_msg_captcha_invalid_v2;
const AJAX_URL_I13 = RecaptchaSettings.ajaxurl;
const NONCE = RecaptchaSettings.nonce;
const NONCE_PPCP = RecaptchaSettings.nonce_ppc;
const COOKIEHASH_I13 = RecaptchaSettings.cookiehash_i13;
let captchaResponse = '';
let captchaWidget = '';
let overlayAdded = false;


function stripHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
}

function positionOverlay() {
	const targets = document.querySelectorAll('.wcpay-express-checkout-wrapper, .ppc-button-wrapper,.wc_stripe_product_payment_methods');
	if (targets.length<=0 || document.querySelectorAll('.recaptcha-overlay').length>0) return;


	for (var i = 0, len = targets.length; i < len; i++) {

		 overlay = document.createElement('div');
		overlay.id = 'recaptcha-overlay-'+i;
		overlay.classList.add('recaptcha-overlay') ;
		overlay.style.position = 'absolute';
		overlay.style.top = '0';
		overlay.style.left = '0';
		overlay.style.width = '100%';
		overlay.style.height = '100%';
		overlay.style.background = 'rgba(255, 255, 255, 0.5)';
		overlay.style.zIndex = '9999';
		overlay.style.cursor = 'not-allowed';
		overlay.title = CAPTCHA_BLANK;

		targets[i].style.position = 'relative';
		targets[i].appendChild(overlay);

	}


	overlayAdded = true;

}


window.removeRecaptchaOverlay= function() {

	 const overlay = document.querySelectorAll('.recaptcha-overlay');
	if (overlay) {

		for (var i = 0, len = overlay.length; i < len; i++) {

			overlay[i].remove();
		}
		overlayAdded = false;
		/*console.log('✅ Overlay removed');*/
	}
}



let _recap_val = null; /* backing variable*/

Object.defineProperty(window, 'recap_val', {
	set(value) {
		_recap_val = value;

		if (value == null || !value) {
			positionOverlay();
		} else {
			removeRecaptchaOverlay();
		}
	},
	get() {
		return _recap_val;
	}
});

recap_val = null;



/*code for express checkout buttons*/

	const maxWaitTime = 3 * 60 * 1000;
	const startTime = Date.now();

	const intervalId = setInterval(() => {
	const expressBtn = document.querySelector('.wc-block-components-express-payment__event-buttons');

	const targets = document.querySelectorAll('.wcpay-express-checkout-wrapper, .ppc-button-wrapper,.wc_stripe_product_payment_methods');
	if (targets.length>0) {
		clearInterval(intervalId);

		if ((!window.recap_val || window.recap_val === null) && !document.getElementById('recaptcha-overlay')) {
			positionOverlay();
		}

		return;
	}


	if (Date.now() - startTime > maxWaitTime) {
		clearInterval(intervalId);

	}
	}, 200);




(() => {

    const originalFetch = window.fetch;

    window.fetch = async function(input, init) {


	let url = (typeof input === "string") ? input : (input?.url || "");
    let options = init || {};


        try {
            /* Only apply to Store API checkout endpoint */
            const isStoreCheckout =
                typeof input === 'string' &&
                input.includes('/store/v1/checkout') &&
                init &&
                typeof init.body === 'string';

            if (isStoreCheckout) {
                const clonedBody = JSON.parse(init.body);

				 const recaptchaToken = window.recap_val;
				if (!recaptchaToken) {
                    alert(CAPTCHA_BLANK);
                   /* console.warn('❌ reCAPTCHA token is missing. Request blocked.');*/
                    /* Prevent request*/
                    return Promise.reject(CAPTCHA_BLANK);




                }


                /* Avoid mutation if already added*/
                if (!clonedBody.extensions) {
                    clonedBody.extensions = {};
                }

                 if (!clonedBody.extensions['i13-recaptcha-checkout-block']) {
                    clonedBody.extensions['i13-recaptcha-checkout-block'] = {
                        'cf-recaptcha-response-v2': window.recap_val || ''
                    };
                }

                init.body = JSON.stringify(clonedBody);
                /*console.log('✅ Injected universal_data into checkout request');*/
            }
        } catch (err) {
            console.warn('⚠️ Failed to safely inject universal_data:', err);
        }

        return originalFetch.apply(this, arguments);
    };
})();


/*woo pay*/

(function() {


  function attachHandlerv2(btn) {
    if (btn.__wooPayHandlerAttached) return;
    btn.__wooPayHandlerAttached = true;

    const handler = async function(e) {
      /* If skip flag set, clear it and let the native flow run*/
      if (btn.__wooPaySkipOnce) {
        btn.__wooPaySkipOnce = false;
        return; /* do not preventDefault — let original handler run*/
      }

      /* Prevent the normal flow and run our logic*/
      e.preventDefault();
      e.stopImmediatePropagation();

      /* Simple debounce / disable to avoid multiple retries*/
      if (btn.__wooPayProcessing) return;
      btn.__wooPayProcessing = true;
      btn.disabled = true;

      try {
        /*console.log('Intercepted wooPay click — running reCAPTCHA');*/



		 if (window.recap_val=='' || window.recap_val==null) {
			alert(CAPTCHA_BLANK);
			  btn.disabled = false;
          btn.__wooPayProcessing = false;
          return;
		}

        /* Send token to server (store/verify/transient) — adapt params as needed*/
        await fetch((window.myRecaptchaVars || {}).AJAX_URL_I13 || '/wp-admin/admin-ajax.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ action: 'save_recaptcha_tokenv2', 'cf-recaptcha-response-v2':window.recap_val,'nonce':NONCE })
        });


        /* Set skip flag so our handler ignores the next synthetic click*/
        btn.__wooPaySkipOnce = true;

        /* Re-enable and trigger native click to continue WooPay flow*/
        btn.disabled = false;
        btn.__wooPayProcessing = false;

        /* Use small delay to let flags settle and let React internal handlers see a "fresh" activation*/
        setTimeout(() => btn.click(), 30);

      } catch (err) {
        /*console.error('Error during intercept flow', err);*/
        btn.disabled = false;
        btn.__wooPayProcessing = false;
        /* show fallback message to user*/
        alert(CAPTCHA_INVALID);
      }
    };

    /* store handler reference so it can be removed if desired*/
    btn.__wooPayHandlerRef = handler;
    btn.addEventListener('click', handler, true);
  }

  function findButtons() {
    document.querySelectorAll('.woopay-express-button').forEach(attachHandlerv2);
  }

  const mo = new MutationObserver(findButtons);
  mo.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', findButtons);
  findButtons();
})();






