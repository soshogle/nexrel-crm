/* global wc_nuvei_params */

jQuery( function( $ ) {
	'use strict';


	/**
	 * Object to handle Nuvei payment forms.
	 */
	var wc_nuvei_form = {

		/**
		 * Initialize event handlers and UI state.
		 */
		init: function() {
			this.token = '';

			// checkout page
			if ( $( 'form.woocommerce-checkout' ).length ) {
				this.form = $( 'form.woocommerce-checkout' );
			}

			$( 'form.woocommerce-checkout' )
				.on(
					'checkout_place_order_nuvei',
					this.onSubmit
				);

			// pay order page
			if ( $( 'form#order_review' ).length ) {
				this.form = $( 'form#order_review' );
			}

			$( 'form#order_review' )
				.on(
					'submit',
					this.onSubmit
				);

			// add payment method page
			if ( $( 'form#add_payment_method' ).length ) {
				this.form = $( 'form#add_payment_method' );
			}

			$( 'form#add_payment_method' )
				.on(
					'submit',
					this.onSubmit
				);

            if($('#nuvei-card-name').val() === '') {
            	if($('#billing_first_name').val() !== undefined && $('#billing_last_name').val() !== undefined)
            		$('#nuvei-card-name').val($('#billing_first_name').val() + ' ' + $('#billing_last_name').val());
            }

            // Show ApplePay button if available and bind the submit events
			if(window.ApplePaySession && ApplePaySession.canMakePayments()) {
            	$("#nuvei-apple-pay-button", this.form).css("display", "inline-block");

                $( this.form )
                    .on( 'click', '#nuvei-apple-pay-button', this.onApplePaySubmit );
			}

			$( document )
				.on(
					'change',
					'#wc-nuvei-cc-form :input',
					this.onCCFormChange
				)
				.on(
					'nuveiError',
					this.onError
				)
				.on(
					'checkout_error',
					this.clearToken
				);


            $( this.form )
            // We need to bind directly to the click (and not checkout_place_order_nuvei) to avoid popup blockers
            // especially on mobile devices (like on Chrome for iOS) from blocking NuveiCheckout.open from opening a tab
                .on( 'click', '#place_order', this.onSubmit )

                // WooCommerce lets us return a false on checkout_place_order_{gateway} to keep the form from submitting
                .on( 'submit checkout_place_order_nuvei' );
		},

		isNuveiChosen: function() {
			return $( '#payment_method_nuvei' ).is( ':checked' ) && ( ! $( 'input[name="wc-nuvei-payment-token"]:checked' ).length || 'new' === $( 'input[name="wc-nuvei-payment-token"]:checked' ).val() );
		},

		hasToken: function() {
			return wc_nuvei_form.token.length;
		},

		block: function() {
			wc_nuvei_form.form.block({
				message: null,
				overlayCSS: {
					background: '#fff',
					opacity: 0.6
				}
			});
		},

		unblock: function() {
			wc_nuvei_form.form.unblock();
		},

		onError: function( e, responseObject ) {
			var message = responseObject.response.error.message;

			// Customers do not need to know the specifics of the below type of errors
			// therefore return a generic localizable error message.
			if ( 
				'invalid_request_error' === responseObject.response.error.type ||
				'api_connection_error'  === responseObject.response.error.type ||
				'api_error'             === responseObject.response.error.type ||
				'authentication_error'  === responseObject.response.error.type ||
				'rate_limit_error'      === responseObject.response.error.type
			) {
				message = wc_nuvei_params.invalid_request_error;
			}

			if ( 'card_error' === responseObject.response.error.type && wc_nuvei_params.hasOwnProperty( responseObject.response.error.code ) ) {
				message = wc_nuvei_params[ responseObject.response.error.code ];
			}

			$( '.wc-nuvei-error, .nuvei_token' ).remove();
			$( '#nuvei-card-number' ).closest( 'p' ).before( '<ul class="woocommerce_error woocommerce-error wc-nuvei-error"><li>' + message + '</li></ul>' );
			wc_nuvei_form.unblock();
		},

		onSubmit: function( e ) {
			if ( wc_nuvei_form.isNuveiChosen() && ! wc_nuvei_form.hasToken() ) {
				e.preventDefault();
				wc_nuvei_form.block();

				var $form = wc_nuvei_form.form,
					$data = $('#nuvei-payment-data');

                //token generation
                var token = '';
                var charset = "abcdefghijklmnopqrstuvwxyz0123456789";
                for( var i=0; i < 64; i++ )
                    token += charset.charAt(Math.floor(Math.random() * charset.length));

                var cardType = $( '#nuvei-card-type' ).val();
                if(cardType === "APPLEPAY") {
                    $('[name="card-type"]').detach();
                    $('[name="card-number"]').detach();
                    $('[name="csrf-token"]').detach();

                    $form.append('<input type="" name="card-type" value="' + $('#nuvei-card-type').val() + '"/>');
                    $form.append('<input type="" name="card-number" value="' + $('#nuvei-applepayload').val() + '"/>');
                    $form.append('<input type="hidden" name="csrf-token" value="' + $('#nuvei-csrf-token').val() + '"/>');

                    wc_nuvei_form.token = token;
                    $form.submit();
                } else {
                    var expires    = $( '#nuvei-card-expiry' ).payment( 'cardExpiryVal' );
                    var exp_month  = (parseInt( expires.month, 10 )<10?'0':'')+parseInt( expires.month, 10 );
                    var exp_year = parseInt( expires.year, 10 )%100;
                    var expCheck = new Date();
                    expCheck = parseInt(String(expCheck.getFullYear()%100)+String(expCheck.getMonth()+1));
                    var ccExp = parseInt(String(exp_year)+String(exp_month));

                    $('[name="card-name"]').detach();
                    $('[name="card-number"]').detach();
                    $('[name="card-expiry"]').detach();
                    $('[name="cvc"]').detach();
                    $('[name="csrf-token"]').detach();

                    $form.append('<input type="hidden" name="card-name" value="' + $('#nuvei-card-name').val() + '"/>');
                    $form.append('<input type="hidden" name="card-number" value="' + $('#nuvei-card-number').val() + '"/>');
                    $form.append('<input type="hidden" name="card-expiry" value="' + exp_month+exp_year + '"/>');
                    $form.append('<input type="hidden" name="cvc" value="' + $('#nuvei-card-cvc').val() + '"/>');
                    $form.append('<input type="hidden" name="csrf-token" value="' + $('#nuvei-csrf-token').val() + '"/>');

                    var ccValid = false;
                    $('#nuvei-card-number').validateCreditCard(function(result) {
                        ccValid = result.valid;
                    });

                    if($('#nuvei-card-name').val() && ccValid && ($('#nuvei-card-cvc').val().length>=3 && $('#nuvei-card-cvc').val().length<=4) && (exp_month && exp_year && ccExp>=expCheck)) {
                        wc_nuvei_form.token = token;
                        $form.submit();
                    }
                    else {
                        wc_nuvei_form.unblock();

                        if(!$('#nuvei-card-name').val()) {
                            $('#nuvei-card-name').attr('style', 'border-color: red');
                            $('#nuvei-card-name').addClass('input-invalid');
                        }
                        else {
                            $('#nuvei-card-name').attr('style', 'border-color: rgb(234, 234, 234)');
                            $('#nuvei-card-name').removeClass('input-invalid');
                        }

                        if(!ccValid) {
                            $('#nuvei-card-number').attr('style', 'border-color: red');
                            $('#nuvei-card-number').addClass('input-invalid');
                        }
                        else {
                            $('#nuvei-card-number').attr('style', 'border-color: rgb(234, 234, 234)');
                            $('#nuvei-card-number').removeClass('input-invalid');
                        }

                        if($('#nuvei-card-cvc').val().length<3 || $('#nuvei-card-cvc').val().length>4) {
                            $('#nuvei-card-cvc').attr('style', 'border-color: red');
                            $('#nuvei-card-cvc').addClass('input-invalid');
                        }
                        else {
                            $('#nuvei-card-cvc').attr('style', 'border-color: rgb(234, 234, 234)');
                            $('#nuvei-card-cvc').removeClass('input-invalid');
                        }

                        if((!exp_month || !exp_year || ccExp<expCheck)) {
                            $('#nuvei-card-expiry').attr('style', 'border-color: red');
                            $('#nuvei-card-expiry').addClass('input-invalid');
                        }
                        else {
                            $('#nuvei-card-expiry').attr('style', 'border-color: rgb(234, 234, 234)');
                            $('#nuvei-card-expiry').removeClass('input-invalid');
                        }
                    }
				}

				return false;
			}
		},

    	onApplePaySubmit: function( e ) {
            function convertToHex(str) {
                var hex = '';
                for(var i=0;i<str.length;i++) {
                    hex += ''+str.charCodeAt(i).toString(16);
                }
                return hex;
            }

            /**
             * Sample payment data
             */
            function paymentRequestData() {
                return {
                    countryCode: $('#nuvei-applepay-countryCode').val(),
                    currencyCode: $('#nuvei-applepay-currencyCode').val(),
                    total: {
                        label: 'with Nuvei Payment Gateway',
                        amount:  parseFloat($('#nuvei-applepay-totalAmount').val()).toFixed(2)
                    },
                    supportedNetworks: supportedNetworks,
                    merchantCapabilities: ['supports3DS']
                };
            };

            if($("#wc-nuvei-payment-token-new").length) {
                document.querySelectorAll('#wc-nuvei-payment-token-new')[0].click();
            }
            var supportedNetworks = $('#nuvei-applepay-supportedNetworks').val().split(',');
            var paymentRequest = paymentRequestData();

            var session = new ApplePaySession(4, paymentRequest);
            var applePaySessionControllerUrl = $('#nuvei-applepay-controller').val();
            var $ccType = $('#nuvei-card-type'),
                $xApplePayLoad = $('#nuvei-applepayload');

            /**
             * Makes an AJAX request to your application server with URL provided by Apple
             */
            function getSession(url) {
                return new Promise(function(resolve, reject) {
                    var xhr = new XMLHttpRequest;
                    var requestUrl = applePaySessionControllerUrl;

                    xhr.open('GET', requestUrl);

                    xhr.onload = function() {
                        if (this.status >= 200 && this.status < 300) {
                            return resolve(JSON.parse(xhr.response));
                        } else {
                            return reject({
                                status: this.status,
                                statusText: xhr.statusText
                            });
                        }
                    };

                    xhr.onerror = function() {
                        return reject({
                            status: this.status,
                            statusText: xhr.statusText
                        });
                    };

                    xhr.setRequestHeader('Content-Type', 'application/json');

                    return xhr.send(JSON.stringify({
                        validationURL: url
                    }));
                });
            };

            /**
             * Merchant Validation
             * We call our merchant session endpoint, passing the URL to use
             */
            session.onvalidatemerchant = (event) => {
                const validationURL = event.validationURL;
                var promise = getSession(event.validationURL);
                promise.then(function(response) {
                    if(typeof response !== "object")
                        response = JSON.parse(response);

                    session.completeMerchantValidation(response);
                });
            };

            /**
             * This is called when user dismisses the payment modal
             */
            session.oncancel = (event) => {
                // Re-enable Apple Pay button
            };

            /**
             * Payment Authorization
             * Here you receive the encrypted payment data. You would then send it
             * on to your payment provider for processing, and return an appropriate
             * status in session.completePayment()
             */
            session.onpaymentauthorized = (event) => {
                const payment = event.payment;
                // You can see a sample `payment` object in an image below.
                // Use the token returned in `payment` object to create the charge on your payment gateway.
                var applepayload =  convertToHex(JSON.stringify(payment));

                $ccType.val('APPLEPAY');
                $xApplePayLoad.val(applepayload);

                $("#nuvei-card-name").closest( "p.form-row" ).remove();
                $("#nuvei-card-number").closest( "p.form-row" ).remove();
                $("#nuvei-card-expiry").closest( "p.form-row" ).remove();
                $("#nuvei-card-cvc").closest( "p.form-row" ).remove();

                session.completePayment(ApplePaySession.STATUS_SUCCESS);

                $('#place_order').trigger("click");
            };

            /**
             * This will show up the modal for payments through Apple Pay
             */
            session.begin();
        },

		onCCFormChange: function() {
            wc_nuvei_form.token = '';
			$( '.wc-nuvei-error, .nuvei_token' ).remove();
		},

		clearToken: function() {
			$( '.nuvei_token' ).remove();
		}
	};

	wc_nuvei_form.init();
} );
