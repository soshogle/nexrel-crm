const SITE_KEY = RecaptchaSettings.siteKey;
const CAPTCHA_BLANK = RecaptchaSettings.recapcha_error_msg_captcha_blank;
const CAPTCHA_INVALID = RecaptchaSettings.recapcha_error_msg_captcha_invalid_v3;
const CAPTCHA_ACTION = RecaptchaSettings.i13_recapcha_checkout_action_v3;
const HYBRID_RECAPTCHA = RecaptchaSettings.use_v2_along_v3;
const COOKIEHASH_I13 = RecaptchaSettings.cookiehash_i13;
const IS_ENTERPRISE_CAPTCHA = RecaptchaSettings.i13_is_enterprise_captcha;
const AJAX_URL_I13 = RecaptchaSettings.ajaxurl;
const NONCE = RecaptchaSettings.nonce;
const NONCE_PPCP = RecaptchaSettings.nonce_ppc;

let captchaTokenV3 = null;
let captchaTokenPromise = null;
let overlayAdded = false;



/** Overlay to block buttons until token is ready **/
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

function removeOverlay() {
    const overlay = document.getElementById('recaptcha-overlay');
    if (overlay) {
        overlay.remove();
        overlayAdded = false;
    }
}



/** Generate token only once, with timeout expiry **/
async function executeCaptchaV3Once() {
    if (captchaTokenV3) return captchaTokenV3;

    if (!captchaTokenPromise) {

		if(IS_ENTERPRISE_CAPTCHA=='1'){


			captchaTokenPromise = grecaptcha.enterprise.execute(SITE_KEY, { action: CAPTCHA_ACTION })
					.then(token => {
						captchaTokenV3 = token;

						/*Expire after 100 seconds*/
						setTimeout(() => {
							captchaTokenV3 = null;
							captchaTokenPromise = null;
						}, 100000);

						return token;
					})
					.catch(err => {
						captchaTokenPromise = null;
						console.warn('❌ reCAPTCHA execution failed:', err);
						throw err;
					});

		}
		else{

				captchaTokenPromise = grecaptcha.execute(SITE_KEY, { action: CAPTCHA_ACTION })
					.then(token => {
						captchaTokenV3 = token;

						/*Expire after 100 seconds*/
						setTimeout(() => {
							captchaTokenV3 = null;
							captchaTokenPromise = null;
						}, 100000);

						return token;
					})
					.catch(err => {
						captchaTokenPromise = null;
						console.warn('❌ reCAPTCHA execution failed:', err);
						throw err;
					});

		}
    }

    return captchaTokenPromise;
}



/*code for express checkout buttons*/

	const maxWaitTime = 3 * 60 * 1000;
	const startTime = Date.now();

	const intervalId = setInterval(() => {
	const expressBtn = document.querySelector('.wc-block-components-express-payment__event-buttons');

	if (expressBtn) {
		clearInterval(intervalId);

		if ((!captchaTokenV3 || captchaTokenV3 === null) && !document.getElementById('recaptcha-overlay')) {
			positionOverlay();
		}
		else{

			removeOverlay();
		}

		return;
	}


	if (Date.now() - startTime > maxWaitTime) {
		clearInterval(intervalId);

	}
	}, 200);





function stripHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
}


const originalFetch = window.fetch;

window.fetch = async function (input, init) {



	let url = (typeof input === "string") ? input : (input?.url || "");
    let options = init || {};

    /* ------------------------------------------
       1) PayPal create-order reCAPTCHA
    -------------------------------------------*/
    const isPayPalOrder = url.includes("ppc-create-order");
	const isWooPayTracks = typeof url === "string" && url.includes("admin-ajax.php") && options && options.body instanceof FormData && options.body.get("tracksEventName") === "wcpay_proceed_to_checkout_button_click";

    if (isPayPalOrder) {

			window.myRecaptchaTokenI13 = await executeCaptchaV3Once();
			if (! window.myRecaptchaTokenI13 ||  window.myRecaptchaTokenI13==null) {

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

				bodyObj.recaptcha_token_v3 =  window.myRecaptchaTokenI13;
				bodyObj.recaptcha_i13_nonce = NONCE_PPCP;
				bodyObj.cookiehash_i13 = COOKIEHASH_I13;
				bodyObj.recap_v = 'v3';

				options.body = JSON.stringify(bodyObj);

				const response = await originalFetch.apply(this, arguments);

				if (response.status === 400) {
					const errorData = await response.clone().json().catch(() => null);
					let message = '❌ Checkout failed. Please try again.';
					if (errorData &&   JSON.stringify(errorData).includes('g-recaptcha_error_v3')) {
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

							if(HYBRID_RECAPTCHA=='1'){

								const url = new URL(location.href);
								url.searchParams.set('rand_i13', (Math.random() + 1).toString(36).substring(7));

								location.assign(url.search);
							}

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
					 window.myRecaptchaTokenI13 = await executeCaptchaV3Once();
					await fetch((window.myRecaptchaVars || {}).AJAX_URL_I13 || '/wp-admin/admin-ajax.php', {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({ action: 'save_recaptcha_token', 'i13_checkout_token_':window.myRecaptchaTokenI13,'cookiehash_i13':COOKIEHASH_I13,'nonce':NONCE })
					});

				} catch (err) {

					console.log(err);
					}

			}


    try {
        const isStoreCheckout =
            typeof input === 'string' &&
            input.includes('/store/v1/checkout') &&
            init &&
            typeof init.body === 'string';

        if (isStoreCheckout) {
            /* Only execute token if not set already*/

			window.myRecaptchaTokenI13 = await executeCaptchaV3Once();

            const token = window.myRecaptchaTokenI13;
            if (!token) {
                alert(CAPTCHA_BLANK);
                return Promise.reject(CAPTCHA_BLANK);
            }
            const body = JSON.parse(init.body);
            if (!body.extensions) body.extensions = {};
            body.extensions['i13-recaptcha-checkout-block'] = {
                'i13_checkout_token_': token,
				'cookiehash_i13':COOKIEHASH_I13
            };
            init.body = JSON.stringify(body);
        }
        const response = await originalFetch.apply(this, arguments);

        if (isStoreCheckout && response.status === 400) {
			const errorData = await response.clone().json().catch(() => null);
			let message = '❌ Checkout failed. Please try again.';
			if (errorData &&   JSON.stringify(errorData).includes('g-recaptcha_error_v3')) {
				if (
					errorData.data &&
					errorData.data.details &&
					errorData.data.details.extensions &&
					errorData.data.details.extensions.message
				) {
					message = stripHtml(errorData.data.details.extensions.message);
				} else if (errorData.message) {

					message = stripHtml(errorData.message);
				}

				alert(message);

				if(HYBRID_RECAPTCHA=='1'){

					const url = new URL(location.href);
					url.searchParams.set('rand_i13', (Math.random() + 1).toString(36).substring(7));

					location.assign(url.search);
				}
			}

		}
        return response;
    } catch (err) {
        /*alert('⚠️ Checkout error: ' + (err?.message || CAPTCHA_BLANK));*/
        return Promise.reject(err);
    }
};

/** Execute token generation after grecaptcha is ready **/
function waitAndRunCaptcha() {
    const maxAttempts = 20;
    let attempts = 0;

    const tryExecute = () => {
        attempts++;

		if(IS_ENTERPRISE_CAPTCHA=='1'){

			if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.enterprise.execute === 'function') {
				executeCaptchaV3Once().then(() => {
					removeOverlay();
				}).catch(() => {

				});
			} else if (attempts < maxAttempts) {
				setTimeout(tryExecute, 500);
			} else {
				console.error('❌ Failed to run reCAPTCHA v3 after retries');
			}

		}
		else{
			if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.execute === 'function') {
				executeCaptchaV3Once().then(() => {
					removeOverlay();
				}).catch(() => {

				});
			} else if (attempts < maxAttempts) {
				setTimeout(tryExecute, 500);
			} else {
				console.error('❌ Failed to run reCAPTCHA v3 after retries');
			}
		}
    };

    tryExecute();
}

window.onRecaptchaLoadCallbackV3 = function () {
    /*console.log('✅ reCAPTCHA script loaded');*/
    waitAndRunCaptcha();
};


/*woo pay*/

(function() {


  function attachHandler(btn) {
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


		window.myRecaptchaTokenI13 = await executeCaptchaV3Once();


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
          body: new URLSearchParams({ action: 'save_recaptcha_token', 'i13_checkout_token_':window.myRecaptchaTokenI13,'cookiehash_i13':COOKIEHASH_I13,'nonce':NONCE })
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
    document.querySelectorAll('.woopay-express-button').forEach(attachHandler);
  }

  const mo = new MutationObserver(findButtons);
  mo.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', findButtons);
  findButtons();
})();
