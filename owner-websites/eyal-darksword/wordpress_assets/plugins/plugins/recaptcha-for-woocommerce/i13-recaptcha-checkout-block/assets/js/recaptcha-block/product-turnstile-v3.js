const CAPTCHA_BLANK = RecaptchaSettings.recapcha_error_msg_captcha_blank;
const CAPTCHA_INVALID = RecaptchaSettings.recapcha_error_msg_captcha_invalid_v3;
const HYBRID_RECAPTCHA = RecaptchaSettings.use_v2_along_v3;
const COOKIEHASH_I13 = RecaptchaSettings.cookiehash_i13;
const AJAX_URL_I13 = RecaptchaSettings.ajaxurl;
const NONCE = RecaptchaSettings.nonce;
const NONCE_PPCP = RecaptchaSettings.nonce_ppc;

let captchaTokenV3 = null;
let captchaTokenPromise = null;
let overlayAdded = false;




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





function setupRecaptchaTokenListener() {
    const hiddenInput = document.querySelector('[name="i13_recaptcha_checkout_token"]');

    if (!hiddenInput) {
        /*console.log('Waiting for i13_recaptcha_checkout_token element...');*/
        return false;
    }

    let _hiddenValue = hiddenInput.value;

    Object.defineProperty(hiddenInput, 'value', {
        get() {
            return _hiddenValue;
        },
        set(newValue) {
            _hiddenValue = newValue;

            if (!newValue) {
                positionOverlay();
            } else {
                window.removeRecaptchaOverlay();
            }
        }
    });

    /*console.log('Recaptcha token listener setup complete');*/
    return true;
}


let isSetup = setupRecaptchaTokenListener();


if (!isSetup) {
    const observer = new MutationObserver((mutations) => {
        if (setupRecaptchaTokenListener()) {
            observer.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });


    setTimeout(() => {
        observer.disconnect();
        /*console.warn('Timeout: i13_recaptcha_checkout_token element not found');*/
    }, 120000);
}



/*code for express checkout buttons*/

	const maxWaitTime = 3 * 60 * 1000;
	const startTime = Date.now();

	const intervalId = setInterval(() => {

	const targets = document.querySelectorAll('.wcpay-express-checkout-wrapper, .ppc-button-wrapper,.wc_stripe_product_payment_methods');
	var recaptchaResponse=document.querySelector('[name="i13_recaptcha_checkout_token"]');
	if (recaptchaResponse && targets.length>0) {
		clearInterval(intervalId);


		/*var recaptchaResponse = document.getElementById('i13_checkout_token');*/
		if (recaptchaResponse.value=='') {
			positionOverlay();
		}
		else{
			window.removeRecaptchaOverlay();
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



    try {
        const isStoreCheckout =
            typeof input === 'string' &&
            input.includes('/store/v1/checkout') &&
            init &&
            typeof init.body === 'string';

        if (isStoreCheckout) {


			var recaptchaResponse=document.querySelector('[name="i13_recaptcha_checkout_token"]');
			if(!recaptchaResponse){

				     alert(CAPTCHA_BLANK);
                return Promise.reject(CAPTCHA_BLANK);
			}


            if (recaptchaResponse.value=='' || recaptchaResponse.value==null) {
                alert(CAPTCHA_BLANK);
                return Promise.reject(CAPTCHA_BLANK);
            }
            const body = JSON.parse(init.body);
            if (!body.extensions) body.extensions = {};
            body.extensions['i13-recaptcha-checkout-block'] = {
                'i13_checkout_token_v3_turnstile': recaptchaResponse.value,
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



		var recaptchaResponse=document.querySelector('[name="i13_recaptcha_checkout_token"]');
		if(!recaptchaResponse){

			alert(CAPTCHA_BLANK);
			  btn.disabled = false;
          btn.__wooPayProcessing = false;
          return;
		}
		token=recaptchaResponse.value;

		 if (token=='') {
			alert(CAPTCHA_BLANK);
			  btn.disabled = false;
          btn.__wooPayProcessing = false;
          return;
		}

        /* Send token to server (store/verify/transient) — adapt params as needed*/
        await fetch((window.myRecaptchaVars || {}).AJAX_URL_I13 || '/wp-admin/admin-ajax.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ action: 'save_recaptcha_token', 'i13_checkout_token_v3_turnstile':token,'cookiehash_i13':COOKIEHASH_I13,'nonce':NONCE })
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


