const SITE_KEY = RecaptchaSettings.siteKey;
const CAPTCHA_BLANK = RecaptchaSettings.recapcha_error_msg_captcha_blank;
const CAPTCHA_INVALID = RecaptchaSettings.recapcha_error_msg_captcha_invalid_v3;
const CAPTCHA_ACTION = RecaptchaSettings.i13_recapcha_checkout_action_v3;
const HYBRID_RECAPTCHA = RecaptchaSettings.use_v2_along_v3;
const COOKIEHASH_I13 = RecaptchaSettings.cookiehash_i13;
const AJAX_URL_I13 = RecaptchaSettings.ajaxurl;
const NONCE = RecaptchaSettings.nonce;
const NONCE_PPCP = RecaptchaSettings.nonce_ppc;

let captchaTokenV3 = null;
let captchaTokenPromise = null;
let overlayAdded = false;
let el_i13_cart_captcha_widget=null;


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

					await fetch((window.myRecaptchaVars || {}).AJAX_URL_I13 || '/wp-admin/admin-ajax.php', {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({ action: 'save_recaptcha_token', 'i13_checkout_token_v3_turnstile':window.myRecaptchaTokenI13,'cookiehash_i13':COOKIEHASH_I13,'nonce':NONCE })
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


            const token = window.myRecaptchaTokenI13;
            if (!token) {
                alert(CAPTCHA_BLANK);
                return Promise.reject(CAPTCHA_BLANK);
            }
            const body = JSON.parse(init.body);
            if (!body.extensions) body.extensions = {};
            body.extensions['i13-recaptcha-checkout-block'] = {
                'i13_checkout_token_v3_turnstile': token,
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


 setInterval(function() {

		if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.reset) !== 'undefined' && el_i13_cart_captcha_widget!=null) {

							try{

								window.turnstile.reset(el_i13_cart_captcha_widget);
							}
							catch (error){

								console.log(error);
							}

				}
	}, 80 * 1000);
/** Execute token generation after grecaptcha is ready **/

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
			el_i13_cart_captcha_widget=window.turnstile.render('#recaptcha-block', {
				sitekey: SITE_KEY,
				size:'invisible',
				action:CAPTCHA_ACTION,
				callback: function (response) {
					window.myRecaptchaTokenI13 = response;
					removeOverlay();
				},
				'expired-callback': function (response) {

					window.myRecaptchaTokenI13=null;
				},
				'error-callback':function (response) {

					window.myRecaptchaTokenI13=null;
				}
			});
		} else if (attempts < maxAttempts) {
			/*console.log(`⏳ Waiting for turnstile.render... (${attempts})`);*/
			setTimeout(tryRender, 500);
		} else {
			console.error('❌ Failed to load turnstile.render after retries');
		}
	};

	tryRender();
}

window.onRecaptchaLoadCallbackV3 = function () {


	const checkInterval = setInterval(() => {
		/*Look for Express Checkout block (adjust selector if needed)*/
		const expressContainer = document.querySelector('.wc-block-cart__payment-options');

		if (expressContainer && !document.getElementById('recaptcha-block')) {
			/*console.log('✅ Injecting reCAPTCHA above Express Checkout');*/




			const captchaDiv = document.createElement('div');
			captchaDiv.id = 'recaptcha-block';
			captchaDiv.style.marginBottom = '15px';
			/*captchaDiv.setAttribute("data-callback", 'i13_onRecaptchaVerified');*/

			/* Insert before the express checkout buttons*/
			expressContainer.parentNode.insertBefore(captchaDiv, expressContainer);
			renderNormalRecaptchaWhenReady();
			clearInterval(checkInterval);


		}


	}, 300);

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
          body: new URLSearchParams({ action: 'save_recaptcha_token', 'i13_checkout_token_v3_turnstile':window.myRecaptchaTokenI13,'cookiehash_i13':COOKIEHASH_I13,'nonce':NONCE })
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
