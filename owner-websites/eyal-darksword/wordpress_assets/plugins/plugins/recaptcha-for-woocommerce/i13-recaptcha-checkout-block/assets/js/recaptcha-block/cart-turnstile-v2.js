const SITE_KEY = RecaptchaSettings.siteKey;
const THEME = RecaptchaSettings.theme;
const SIZE = RecaptchaSettings.size;
const LANG = RecaptchaSettings.lang;
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
	const target = document.querySelector('.wc-block-cart__payment-options');
	if (!target || document.getElementById('recaptcha-overlay')) return;

	const overlay = document.createElement('div');
	overlay.id = 'recaptcha-overlay';
	overlay.style.position = 'absolute';
	overlay.style.top = '0';
	overlay.style.left = '0';
	overlay.style.width = '100%';
	overlay.style.height = '100%';
	overlay.style.background = 'rgba(255, 255, 255, 0.5)';
	overlay.style.zIndex = '9999';
	overlay.style.cursor = 'not-allowed';
	overlay.title = CAPTCHA_BLANK;

	target.style.position = 'relative';
	target.appendChild(overlay);
	overlayAdded = true;

}


function removeRecaptchaOverlay() {

	 const overlay = document.getElementById('recaptcha-overlay');
	if (overlay) {
		overlay.remove();
		overlayAdded = false;
		/*console.log('✅ Overlay removed');*/
	}
}




let _myRecaptchaTokenI13 = null;

Object.defineProperty(window, 'myRecaptchaTokenI13', {
	set(value) {
		_myRecaptchaTokenI13 = value;

		if (value == null || !value) {
			positionOverlay();
		} else {
			removeRecaptchaOverlay();
		}
	},
	get() {
		return _myRecaptchaTokenI13;
	}
});

myRecaptchaTokenI13 = null;




/*code for express checkout buttons*/

	const maxWaitTime = 3 * 60 * 1000;
	const startTime = Date.now();

	const intervalId = setInterval(() => {
	const expressBtn = document.querySelector('.wc-block-components-express-payment__event-buttons');

	if (expressBtn) {
		clearInterval(intervalId);

		if ((!window.myRecaptchaTokenI13 || window.myRecaptchaTokenI13 === null) && !document.getElementById('recaptcha-overlay')) {
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

				/* ------------------------------------------
				1) PayPal create-order reCAPTCHA
				-------------------------------------------*/
				const isPayPalOrder = url.includes("ppc-create-order");
				const isWooPayTracks = typeof url === "string" && url.includes("admin-ajax.php") && options && options.body instanceof FormData && options.body.get("tracksEventName") === "wcpay_proceed_to_checkout_button_click";

				if (isPayPalOrder) {


					if (!window.myRecaptchaTokenI13 || window.myRecaptchaTokenI13==null) {

						setTimeout(function(){

									alert(CAPTCHA_BLANK);


								}, 2000);
						return Promise.reject(CAPTCHA_BLANK);

					}


					try {

						let bodyObj = {};
						if (options.body && typeof options.body === "string") {
							bodyObj = JSON.parse(options.body);
						}

						bodyObj.recaptcha_token = window.myRecaptchaTokenI13;
						bodyObj.recaptcha_i13_nonce = NONCE_PPCP;
						bodyObj.cookiehash_i13 = COOKIEHASH_I13;
						bodyObj.recap_v = 'v2';

						options.body = JSON.stringify(bodyObj);

						const response = await originalFetch.apply(this, arguments);

						if (response.status === 400) {
							const errorData = await response.clone().json().catch(() => null);
							let message = '❌ Checkout failed. Please try again.';
							if (errorData &&   JSON.stringify(errorData).includes('cf-recaptcha_error_v2')) {
								if (
									errorData.data &&
									errorData.data.message
								) {
									message = stripHtml(errorData.data.message);
								} else if (errorData.message) {

									message = stripHtml(errorData.message);
								}


								setTimeout(function(){

									alert(message);


								}, 300);




							}

						}
						return response;


					} catch (e) {
						console.error("PayPal JSON parse error:", e);
					}

				}
				else if(isWooPayTracks){


					try{
					 /* Send token to server (store/verify/transient) — adapt params as needed*/
					await fetch((window.myRecaptchaVars || {}).AJAX_URL_I13 || '/wp-admin/admin-ajax.php', {
					  method: 'POST',
					  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					  body: new URLSearchParams({ action: 'save_recaptcha_tokenv2', 'cf-recaptcha-response-v2':window.myRecaptchaTokenI13,'nonce':NONCE })
					});

					} catch (err) {

						console.log(err);
				      }

				}


        try {
            /* Only apply to Store API checkout endpoint*/
            const isStoreCheckout =
                typeof input === 'string' &&
                input.includes('/store/v1/checkout') &&
                init &&
                typeof init.body === 'string';

            if (isStoreCheckout) {
                const clonedBody = JSON.parse(init.body);

				 const recaptchaToken = window.myRecaptchaTokenI13;
				if (!recaptchaToken) {
                    alert(CAPTCHA_BLANK);
                   /* console.warn('❌ reCAPTCHA token is missing. Request blocked.');*/
                    /* Prevent request*/
                    return Promise.reject(CAPTCHA_BLANK);




                }


                /*Avoid mutation if already added*/
                if (!clonedBody.extensions) {
                    clonedBody.extensions = {};
                }

                 if (!clonedBody.extensions['i13-recaptcha-checkout-block']) {
                    clonedBody.extensions['i13-recaptcha-checkout-block'] = {
                        'cf-recaptcha-response-v2': window.myRecaptchaTokenI13 || ''
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






function renderNormalRecaptchaWhenReady() {
	const maxAttempts = 20;
	let attempts = 0;

	const tryRender = () => {
		attempts++;
		if (
			typeof window.turnstile !== 'undefined' &&
			typeof window.turnstile.render === 'function'
		) {
			/*console.log('✅ turnstile.render is ready, rendering now');*/
			captchaWidget=window.turnstile.render('#recaptcha-block', {
				sitekey: SITE_KEY,
				callback: function (response) {
					window.myRecaptchaTokenI13 = response;
					removeRecaptchaOverlay();
				},
				'expired-callback': function (response) {

					window.myRecaptchaTokenI13=null;
				},
				'error-callback':function (response) {

					window.myRecaptchaTokenI13=null;
				}
			});
		} else if (attempts < maxAttempts) {
			/*console.log(`⏳ Waiting for grecaptcha.render... (${attempts})`);*/
			setTimeout(tryRender, 500);
		} else {
			console.error('❌ Failed to load grecaptcha.render after retries');
		}
	};

	tryRender();
}



window.onRecaptchaLoadCallback = function () {
	/*console.log('✅ reCAPTCHA script loaded');*/
	initCartCaptcha();
};

function i13_onRecaptchaVerified(token) {

	window.myRecaptchaTokenI13 = token;
	removeRecaptchaOverlay();
}

function initCartCaptcha() {
	const checkInterval = setInterval(() => {
		/*Look for Express Checkout block (adjust selector if needed)*/
		const expressContainer = document.querySelector('.wc-block-cart__payment-options');

		if (expressContainer && !document.getElementById('recaptcha-block')) {
			/*console.log('✅ Injecting reCAPTCHA above Express Checkout');*/



			const label = document.createElement('p');
			label.textContent = CAPTCHA_LABEL;
			label.style.fontWeight = 'bold';
			label.style.marginBottom = '8px';

			expressContainer.parentNode.insertBefore(label, expressContainer);

			const captchaDiv = document.createElement('div');
			captchaDiv.id = 'recaptcha-block';
			captchaDiv.style.marginBottom = '15px';
			captchaDiv.setAttribute("data-theme", THEME);
			captchaDiv.setAttribute("data-size", SIZE);
			captchaDiv.setAttribute("data-language", LANG);
			/*captchaDiv.setAttribute("data-callback", 'i13_onRecaptchaVerified');*/

			/* Insert before the express checkout buttons*/
			expressContainer.parentNode.insertBefore(captchaDiv, expressContainer);

			const captchaRef = document.createElement('a');
			captchaRef.id = 'ref-turnstile-v2-i13';
			captchaRef.href = 'javascript:void(0)';
			captchaRef.textContent = REFRESH_LABEL;

			expressContainer.parentNode.insertBefore(captchaRef, expressContainer);




				renderNormalRecaptchaWhenReady();

				document.getElementById('ref-turnstile-v2-i13').addEventListener('click', function () {
				window.turnstile.reset(captchaWidget);
				window.myRecaptchaTokenI13=null;
			});


			clearInterval(checkInterval);


		}


	}, 300);
}


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



		 if (window.myRecaptchaTokenI13=='' || window.myRecaptchaTokenI13==null) {
			alert(CAPTCHA_BLANK);
			  btn.disabled = false;
          btn.__wooPayProcessing = false;
          return;
		}

        /* Send token to server (store/verify/transient) — adapt params as needed*/
        await fetch((window.myRecaptchaVars || {}).AJAX_URL_I13 || '/wp-admin/admin-ajax.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ action: 'save_recaptcha_tokenv2', 'cf-recaptcha-response-v2':window.myRecaptchaTokenI13,'nonce':NONCE })
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

