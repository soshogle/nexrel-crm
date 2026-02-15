<?php

defined( 'ABSPATH' ) || exit();

class I13_Woo_Turnstile_Recpatcha {

	public function __construct() {

				 $this->define_constants();
		// Add Javascript and CSS for admin screens
		add_action( 'init', array( $this, 'do_wp_init' ), 1 );
		add_action( 'wp_enqueue_scripts', array( $this, 'i13_woo_recaptcha_load_styles_and_js' ), 9999 );
		add_action( 'login_enqueue_scripts', array( $this, 'i13_woo_recaptcha_load_styles_and_js' ), 9999 );
		add_action( 'login_form', array( $this, 'i13woo_extra_wp_login_form' ) );
				add_action( 'plugins_loaded', array( $this, 'i13_woo_plugin_loaded' ) );
		add_action( 'register_form', array( $this, 'i13woo_extra_wp_register_form' ) );
		add_action( 'lostpassword_form', array( $this, 'i13woo_extra_wp_lostpassword_form' ) );
		add_action( 'woocommerce_register_form', array( $this, 'i13woo_extra_register_fields' ), 9999 );

		add_action( 'woocommerce_login_form', array( $this, 'i13woo_extra_login_fields' ), 9999 );
		add_action( 'woocommerce_lostpassword_form', array( $this, 'i13woo_extra_lostpassword_fields' ) );
		add_action( 'woocommerce_review_order_before_submit', array( $this, 'i13woo_extra_checkout_fields' ) );
		add_action( 'woocommerce_register_post', array( $this, 'i13_woocomm_validate_signup_captcha' ), 10, 3 );

		add_action( 'woocommerce_process_login_errors', array( $this, 'i13_woocomm_validate_login_captcha' ), 10, 3 );
		add_action( 'woocommerce_after_checkout_validation', array( $this, 'i13_woocomm_validate_checkout_captcha' ), 10, 2 );
		
		add_filter( 'wp_authenticate_user', array( $this, 'i13_woo_wp_verify_login_captcha' ), 10, 2 );
		add_filter( 'register_post', array( $this, 'i13_woo_verify_wp_register_captcha' ), 10, 3 );
		add_filter( 'lostpassword_post', array( $this, 'i13_woo_verify_wp_lostpassword_captcha' ), 10, 1 );
		add_filter( 'wpforms_frontend_recaptcha_noconflict', array( $this, 'i13_woo_remove_no_conflict' ) );
		add_action( 'woocommerce_pay_order_before_submit', array( $this, 'i13woo_extra_checkout_fields_pay_order' ) );
		add_action( 'woocommerce_before_pay_action', array( $this, 'i13woo_verify_pay_order_captcha' ) );
		add_action( 'woocommerce_payment_complete', array( $this, 'i13_woo_payment_complete' ) );
		add_filter( 'preprocess_comment', array( $this, 'i13_woo_check_review_captcha' ) );
		add_filter( 'preprocess_comment', array( $this, 'i13_woo_check_comment_captcha' ) );
		add_action('woocommerce_paypal_payments_create_order_request_started', array($this, 'i13_woocommerce_paypal_payments_create_order_request_started'), 10, 1);
		add_action( 'wp_footer', array( $this, 'i13_woo_ajax_form_executes' ) );

		// add_filter( 'option_active_plugins', array($this,'disable_recaptcha_plugin_if_rest_request') );
		add_action( 'the_post', array( $this, 'i13_woo_page_load_hook_method' ) );

		add_action( 'woocommerce_before_add_to_cart_form', array( $this, 'i13_woocommerce_payment_request_btn_captcha' ) );
		add_action( 'woocommerce_proceed_to_checkout', array( $this, 'i13_woocommerce_payment_request_btn_captcha' ) );
				
		

		add_action( 'wp_head', array( $this, 'i13_add_header_metadata' ) );
		add_action( 'login_head', array( $this, 'i13_add_header_metadata' ) );
		add_action( 'template_redirect', array( $this, 'i13_woocommerce_track_order' ), 10, 1 );
		add_action( 'woocommerce_init', array( $this, 'do_woocommerce_init' ), 10, 1 );
				add_filter( 'the_content', array( $this, 'i13_remove_extra_p_tags' ), 999 );
								add_filter( 'render_block', array( $this, 'i13_recaptcha_for_woo_render_block_defaults' ), 10, 2 );

		if ( $this->isIEBrowser() ) {

			add_filter( 'script_loader_tag', array( $this, 'i13_turnstile_recaptcha_defer_parsing_of_js' ), 10 );
		}

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$i13_recapcha_custom_wp_login_form_login = get_option( 'i13_recapcha_custom_wp_login_form_login' );

			if ( 'yes' == $i13_recapcha_custom_wp_login_form_login ) {
				add_filter( 'login_form_middle', array( $this, 'add_woo_recaptcha_to_custom_form' ), 10, 2 );
			}
		} else {

			$i13_recapcha__v3_custom_wp_login_form_login = get_option( 'i13_recapcha__v3_custom_wp_login_form_login' );

			if ( 'yes' == $i13_recapcha__v3_custom_wp_login_form_login ) {
				add_filter( 'login_form_middle', array( $this, 'add_woo_recaptcha_to_custom_form' ), 10, 2 );
			}
		}

		add_filter( 'jetpack_contact_form_html', array( $this, 'i13_jetpack_contact_form_html_captcha' ), 10, 1 );
		add_filter( 'jetpack_contact_form_is_spam', array( $this, 'i13_jetpack_contact_form_is_spam' ), 10, 2 );
				/*$i13_recapcha_block = sanitize_text_field(wp_unslash(get_option('i13_recapcha_block')));
				if('yes'==$i13_recapcha_block){
					add_action( 'woocommerce_store_api_checkout_order_processed', array($this,'i13_checkout_block_captcha' ),10,1);          
				}*/
				
				add_action('rest_api_init', array( $this,'i13_disable_wc_checkout_endpoint'));

			  $i13_recaptcha_block_unknown_orgin_orders='no';
			  $i13_recaptcha_block_unknown_orgin_orders = get_option( 'i13_recaptcha_block_unknown_orgin_orders' );
		if ('yes' == $i13_recaptcha_block_unknown_orgin_orders) {
				  
			$i13_recapcha_block = sanitize_text_field(wp_unslash(get_option('i13_recapcha_block')));
			if (''== $i13_recapcha_block) {
				$i13_recapcha_block='no';
			}
			add_action('woocommerce_checkout_process', array($this,'i13_block_order_for_unknown_origin_attribution'));
			if ('no' == $i13_recapcha_block) {
					  
				  add_action( 'woocommerce_store_api_checkout_update_order_from_request', array($this, 'i13_block_order_for_unknown_origin_store_api'), 10, 2 );  
			}
		}
				
		if ( is_plugin_active( 'woocommerce-gateway-moneris/woocommerce-gateway-moneris.php' ) ) {		
					add_action( 'woocommerce_receipt_moneris', array( $this, 'i13_trigger_woo_recaptcha_action_for_moneris' ), 50, 1 );
		}	  
	}
	
		
	private function define_constants() {
			 
			 
		$i13_recapcha_use_enterprise_recaptcha=get_option( 'i13_recapcha_use_enterprise_recaptcha' );
		if ( 'yes' == $i13_recapcha_use_enterprise_recaptcha) {
				
			if ( ! defined( 'I13_IS_ENTERPRISE_CAPTCHA' ) ) {
			 define('I13_IS_ENTERPRISE_CAPTCHA', true);
			}
			if ( ! defined( 'I13_USE_API' ) ) {
			 define('I13_USE_API', 'enterprise.js');
			}
			if ( ! defined( 'I13_GRECAPTCHA_INSTANCE' ) ) {
			 define('I13_GRECAPTCHA_INSTANCE', 'grecaptcha.enterprise');
			}
			if ( ! defined( 'I13_GRECAPTCHA_URL' ) ) {
			 define('I13_GRECAPTCHA_URL', 'https://recaptchaenterprise.googleapis.com/v1/projects/');
			}
					
		} else {
			
					
			if ( ! defined( 'I13_IS_ENTERPRISE_CAPTCHA' ) ) {
			 define('I13_IS_ENTERPRISE_CAPTCHA', false);
			}
			if ( ! defined( 'I13_USE_API' ) ) {
			 define('I13_USE_API', 'api.js');
			}
			if ( ! defined( 'I13_GRECAPTCHA_INSTANCE' ) ) {
			 define('I13_GRECAPTCHA_INSTANCE', 'grecaptcha');
			}
					
			
				
		}
				
			   
	}
		
	public function i13_woo_plugin_loaded() {
			
				$i13_recapcha_block = sanitize_text_field(wp_unslash(get_option('i13_recapcha_block')));
		if ('yes'==$i13_recapcha_block) {

			if ( class_exists( '\Automattic\WooCommerce\Blocks\Package' ) ) {
						
						require dirname( __FILE__ ) . '/i13-recaptcha-checkout-block/woocommerce-blocks-integration.php';
						add_action( 'woocommerce_blocks_loaded', array( $this, 'i13_load_blocks_type_package' ));
						add_action(
										
								'woocommerce_blocks_checkout_block_registration',
								function( $integration_registry ) {
										$integration_registry->register( new I13Recaptcha_Blocks_Integration() );
								},
								10,
								1
						);

							  
			}
		}
	}

	public function i13_block_order_for_unknown_origin_store_api($order,$request) {
			
		$i13_recapcha_error_msg_invalid_order_origin = get_option( 'i13_recapcha_error_msg_invalid_order_origin' );
		$source_types=array('utm','organic','referral','typein','mobile_app','admin');
		$_wc_order_attribution_source_type='';
		if ( $request->get_method() === 'POST' ) {
			$extensions = $request->get_param( 'extensions' );
			if (isset($extensions['woocommerce/order-attribution']) && isset($extensions['woocommerce/order-attribution']['source_type'])) {
					
				$_wc_order_attribution_source_type=$extensions['woocommerce/order-attribution']['source_type'];
			}                                
												
											
		}
			
		if ('' == $_wc_order_attribution_source_type) {
				
			if (''==$i13_recapcha_error_msg_invalid_order_origin) {

		   throw new \Exception(__('Order with an unknown origin is not allowed.', 'recaptcha-for-woocommerce') );

			} else {

			 throw new \Exception($i13_recapcha_error_msg_invalid_order_origin );

			}

		} else if (!in_array(strtolower($_wc_order_attribution_source_type), $source_types)) { 

			if (''==$i13_recapcha_error_msg_invalid_order_origin) {

				   throw new \Exception(__('Order with an unknown origin is not allowed.', 'recaptcha-for-woocommerce') );
			} else {

				throw new \Exception($i13_recapcha_error_msg_invalid_order_origin );
			}
		}
			 
			
	}
	public function i13_block_order_for_unknown_origin_attribution() {
			
		$i13_recapcha_error_msg_invalid_order_origin = get_option( 'i13_recapcha_error_msg_invalid_order_origin' );
		$source_types=array('utm','organic','referral','typein','mobile_app','admin');
		if (isset($_REQUEST['wc_order_attribution_source_type']) && empty($_REQUEST['wc_order_attribution_source_type'])) {
					
			if (''==$i13_recapcha_error_msg_invalid_order_origin) {
				wc_add_notice(esc_html__( 'Order with an unknown origin is not allowed.', 'recaptcha-for-woocommerce' ), 'error');
			} else {
						
				wc_add_notice($i13_recapcha_error_msg_invalid_order_origin, 'error');
			}
		} else if (!in_array(strtolower($_REQUEST['wc_order_attribution_source_type']), $source_types)) { 
				
			if (''==$i13_recapcha_error_msg_invalid_order_origin) {
					  wc_add_notice(esc_html__( 'Order with an unknown origin is not allowed.', 'recaptcha-for-woocommerce' ), 'error');
			} else {
						
				wc_add_notice($i13_recapcha_error_msg_invalid_order_origin, 'error');
			}
		}
			
	}
	public function i13_disable_wc_checkout_endpoint() {
			
			
		if (isset($_SERVER['REQUEST_URI']) && !empty($_SERVER['REQUEST_URI'])) {	
					
							$i13_recapcha_wc_block_checkout_api_old=get_option( 'i13_recapcha_wc_block_checkout_api_old' );
							$i13_recapcha_wc_block_checkout_api_v1=get_option( 'i13_recapcha_wc_block_checkout_api_v1' );
							$i13_block_rest_registrations=get_option( 'i13_block_rest_registrations' );
			if (''==$i13_recapcha_wc_block_checkout_api_old) {

					$i13_recapcha_wc_block_checkout_api_old='no';
					$i13_recapcha_wc_block_checkout_api_old=apply_filters( 'change_reset_api_checkout_disable_status_v0', $i13_recapcha_wc_block_checkout_api_old);
			}

			if (''==$i13_recapcha_wc_block_checkout_api_v1) {

					$i13_recapcha_wc_block_checkout_api_v1='no';
					$i13_recapcha_wc_block_checkout_api_v1=apply_filters( 'change_reset_api_checkout_disable_status_v1', $i13_recapcha_wc_block_checkout_api_v1);
			}


							$current_url = sanitize_text_field($_SERVER['REQUEST_URI']);
			if ('yes'==  $i13_recapcha_wc_block_checkout_api_v1 && stripos($current_url, '/wc/store/v1/checkout') !== false) {
					wp_redirect(home_url('/404.php'));
					exit;
			}

			if ('yes' == $i13_recapcha_wc_block_checkout_api_old && stripos($current_url, '/wc/store/checkout') !== false) {
					wp_redirect(home_url('/404.php'));
					exit;
			}
						
			if (is_array($i13_block_rest_registrations) && !empty($i13_block_rest_registrations)) {
							
				foreach ($i13_block_rest_registrations as $bapi) {
								
					if (stripos($current_url, '/wc/' . $bapi . '/customers') !== false) {
												wp_redirect(home_url('/404.php'));
												exit;
					}
								
				}
							
			}
		}
	}	

	public function i13_recaptcha_for_woo_render_block_defaults( $block_content, $block ) {

		$block_content = $this->i13_remove_extra_p_tags( $block_content );
		return $block_content;

	}




	public function do_wp_init() {
		if ( defined( 'SENSEI_LMS_VERSION' ) ) {

			add_action( 'sensei_login_form_inside_after_password_field', array( $this, 'i13woo_extra_wp_login_form' ) );
			$this->i13_woo_verify_wp_sensei_reg_captcha();
			$this->i13_woo_verify_wp_sensei_login_captcha();
		}
	}
	

	public function i13_jetpack_contact_form_is_spam( $flag, $akismet_values ) {

		$pid = 0;

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}


		$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_woo_jetpackform_token_v2'])) {

			$reCapcha_version='v2';
		}

		$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_woo_jetpack' );

			$captcha_lable = get_option( 'i13_recapcha_woo_jetpack_title' );
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

						$i13_recapcha_woo_jetpack_exclude = get_option( 'i13_recapcha_woo_jetpack_exclude' );
						$nonce_value = isset( $_REQUEST['woo-jetpack-nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['woo-jetpack-nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
						$varifyNone = wp_verify_nonce( $nonce_value, 'i13-jetpack-nonce' );
						$pid = isset( $_POST['contact-form-id'] ) ? intval( $_POST['contact-form-id'] ) : 0;
						$formhash = isset( $_POST['contact-form-hash'] ) ? sanitize_text_field( $_POST['contact-form-hash'] ) : '';
						$exlude_froms = array();
			if ( trim( $i13_recapcha_woo_jetpack_exclude ) != '' ) {

				$exlude_froms = explode( ',', $i13_recapcha_woo_jetpack_exclude );
			}

			if ( 'yes' == $is_enabled && ! in_array( $pid, $exlude_froms ) ) {

				if ( ! $varifyNone ) {

					 $_POST[ $formhash ] = __( 'Security check failure.', 'recaptcha-for-woocommerce' );
					 return new WP_Error( 'Security check failure', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Nonce verification failed.', 'recaptcha-for-woocommerce' ) );
				}

				if ( isset( $_POST['i13_recaptcha_woo_jetpackform_token_v2'] ) && ! empty( $_POST['i13_recaptcha_woo_jetpackform_token_v2'] ) ) {
					// Turnstile captcha API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_woo_jetpackform_token_v2'] );

												// Verify the reCAPTCHA response
												$verifyResponse = wp_remote_post(
												   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
												   array(
																   'method' => 'POST',
																   'timeout' => 60,
																   'body' => array(
																				   'secret' => $secret_key,
																				   'response' => $response,
																   ),
													   )
													);
					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

						// Decode json data
						$responseData = json_decode( $verifyResponse['body'] );

						// If reCAPTCHA response is valid
						if ( ! $responseData->success ) {

							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

								$_POST[ $formhash ] = __( 'Invalid captcha.', 'recaptcha-for-woocommerce' );
								return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
							} else {

								$_POST[ $formhash ] = $recapcha_error_msg_captcha_invalid;
								return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );
							}
						} else {
													
							delete_transient( 'i13_' . COOKIEHASH_I13 . '_jetpack');
						}
												
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

							$_POST[ $formhash ] = __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' );
							return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
						} else {

							$_POST[ $formhash ] = $recapcha_error_msg_captcha_no_response;
							return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_no_response );
						}
					}
										
					
										
				} else {

					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

												$_POST[ $formhash ] = __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' );
												 return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
					} else {

						$_POST[ $formhash ] = $recapcha_error_msg_captcha_blank;
						return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_blank );
					}
				}

								
			}
		} else {

			
			$i13_recapcha_action_v3 = get_option( 'i13_recapcha_woo_jetpack_method_action_v3' );
			if ( '' == $i13_recapcha_action_v3 ) {

				$i13_recapcha_action_v3 = 'contact_form';
			}
					 
						$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
						$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
						$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
						$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
						$is_enabled = get_option( 'i13_recapcha_enable_on_woo_jetpack' );
						$nonce_value = isset( $_REQUEST['woo-jetpack-nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['woo-jetpack-nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
						$pid = isset( $_POST['contact-form-id'] ) ? intval( $_POST['contact-form-id'] ) : 0;
												$formhash = isset( $_POST['contact-form-hash'] ) ? sanitize_text_field( $_POST['contact-form-hash'] ) : '';
						$i13_recapcha_woo_jetpack_exclude = get_option( 'i13_recapcha_woo_jetpack_exclude' );
						$varifyNone = wp_verify_nonce( $nonce_value, 'i13-jetpack-nonce' );
						$exlude_froms = array();
			if ( trim( $i13_recapcha_woo_jetpack_exclude ) != '' ) {

				$exlude_froms = explode( ',', $i13_recapcha_woo_jetpack_exclude );
			}

			if ( 'yes' == $is_enabled && ! in_array( $pid, $exlude_froms ) ) {

				if ( ! $varifyNone ) {

										$_POST[ $formhash ] = __( 'Security check failure.', 'recaptcha-for-woocommerce' );
										return new WP_Error( 'Security check failure', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Nonce verification failed.', 'recaptcha-for-woocommerce' ) );
				}


				if ( isset( $_POST['i13_recaptcha_jetpack_token'] ) && ! empty( $_POST['i13_recaptcha_jetpack_token'] ) ) {
					// Turnstile captcha API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_jetpack_token'] );

					
										   
						 // Verify the reCAPTCHA response
						 $verifyResponse = wp_remote_post(
												   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
												   array(
																   'method' => 'POST',
																   'timeout' => 60,
																   'body' => array(
																				   'secret' => $secret_key,
																				   'response' => $response,
																   ),
													   )
													);

					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

													 // Decode json data
													$responseData = json_decode( $verifyResponse['body'] );
													// If reCAPTCHA response is valid
						if ( ! $responseData->success ) {

							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

								$_POST[ $formhash ] = __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' );
								if ( 'yes' == $use_v2_along_v3 ) {
								 set_transient( 'i13_' . COOKIEHASH_I13 . '_jetpack', '1', $i13_recapcha_v2_timeout );
								}
								return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );

							} else {

								$_POST[ $formhash ] = $recapcha_error_msg_captcha_invalid;
								if ( 'yes' == $use_v2_along_v3 ) {
																		 set_transient( 'i13_' . COOKIEHASH_I13 . '_jetpack', '1', $i13_recapcha_v2_timeout );
								}
								return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );

							}
						} else {

							if ( $responseData->action != $i13_recapcha_action_v3 ) {

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																			$_POST[ $formhash ] = __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' );
									if ( 'yes' == $use_v2_along_v3 ) {
										set_transient( 'i13_' . COOKIEHASH_I13 . '_jetpack', '1', $i13_recapcha_v2_timeout );
									}
																			return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );

								} else {

									  $_POST[ $formhash ] = $recapcha_error_msg_captcha_invalid;
									if ( 'yes' == $use_v2_along_v3 ) {
																					set_transient( 'i13_' . COOKIEHASH_I13 . '_jetpack', '1', $i13_recapcha_v2_timeout );
									}
									  return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );

								}
							}
						}
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

							$_POST[ $formhash ] = __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' );
							if ( 'yes' == $use_v2_along_v3 ) {
																set_transient( 'i13_' . COOKIEHASH_I13 . '_jetpack', '1', $i13_recapcha_v2_timeout );
							}
															return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );

						} else {

								$_POST[ $formhash ] = $recapcha_error_msg_captcha_no_response;
							if ( 'yes' == $use_v2_along_v3 ) {
								 set_transient( 'i13_' . COOKIEHASH_I13 . '_jetpack', '1', $i13_recapcha_v2_timeout );
							}
								return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_no_response );

						}
					}
										
					
										
				} else {

					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						$_POST[ $formhash ] = __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' );
						if ( 'yes' == $use_v2_along_v3 ) {
							set_transient( 'i13_' . COOKIEHASH_I13 . '_jetpack', '1', $i13_recapcha_v2_timeout );
						}
						return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) );

					} else {

						$_POST[ $formhash ] = $recapcha_error_msg_captcha_blank;
						if ( 'yes' == $use_v2_along_v3 ) {
							set_transient( 'i13_' . COOKIEHASH_I13 . '_jetpack', '1', $i13_recapcha_v2_timeout );
						}
						return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_blank );

					}
				}
			}


		}

		return $flag;

	}
	public function i13_jetpack_contact_form_html_captcha( $r ) {

				$err_html = '';
				$pid = get_the_ID();
				ob_start();

				$contactFormHash = '0';

				$doc = new DOMDocument();
				libxml_use_internal_errors( true );
				$doc->loadHTML( $r );
				$xpath = new DOMXPath( $doc );

				$contactFormHashObj = $xpath->query( '//input[@name="contact-form-hash"]/@value' );
		if ( is_object( $contactFormHashObj ) && ! empty( $contactFormHashObj ) && $contactFormHashObj->length > 0 ) {

							$contactFormHash = esc_html( $contactFormHashObj->item( 0 )->nodeValue );

		}

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

		if ('v3'==strtolower($reCapcha_version)) {

			$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_jetpack')) {

					$reCapcha_version='v2';
				}
			}
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			// jetpack_contact_form_is_spam

			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );
						$is_enabled = get_option( 'i13_recapcha_enable_on_woo_jetpack' );
						$i13_recapcha_hide_label_woo_jetpack = get_option( 'i13_recapcha_hide_label_woo_jetpack' );
			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_woo_jetpack' );
			$captcha_lable = get_option( 'i13_recapcha_woo_jetpack_title' );
			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_woo_jetpack_theme' );
			$size = trim( get_option( 'i13_recapcha_woo_jetpack_size' ) );
			if ( '' == $captcha_lable ) {

				$captcha_lable = 'captcha';
			}
			$i13_recapcha_woo_jetpack_exclude = get_option( 'i13_recapcha_woo_jetpack_exclude' );
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
						$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
						
						$exlude_froms = array();
			if ( trim( $i13_recapcha_woo_jetpack_exclude ) != '' ) {

				$exlude_froms = explode( ',', $i13_recapcha_woo_jetpack_exclude );
			}

			if ( 'yes' == $is_enabled && ! in_array( $pid, $exlude_froms ) && '' != $contactFormHash ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

						global $wp_scripts;

						  $urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
													wp_dequeue_script( $handle );
													wp_deregister_script( $handle );
													break;
							}
						}
					}
				}

							wp_enqueue_script( 'jquery' );
							wp_enqueue_script( 'i13-woo-captcha' );

							$rand_char = substr( uniqid( '', true ), -5 );

				if ( isset( $_POST ) && is_array( $_POST ) && ! empty( $_POST ) && isset( $_POST[ $contactFormHash ] ) && isset( $_POST['woo-jetpack-nonce'] ) && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['woo-jetpack-nonce'] ) ), 'i13-jetpack-nonce' ) ) {

						$form_err = sanitize_text_field( wp_unslash( $_POST[ $contactFormHash ] ) );
					if ( '' != $form_err ) {
						$err_html .= "<div class='form-error'>\n<h3>" . __( 'Error!', 'jetpack' ) . "</h3>\n<ul class='form-errors'>\n";
										$err_html .= "\t<li class='form-error-message'>" . esc_html( $form_err ) . "</li>\n";
						$err_html .= "</ul>\n</div>\n\n";
					}
				}

				?><!-- do_not_format_javascript --><script type="text/javascript" id="<?php echo esc_html( $rand_char ); ?>">

									function intval_jetpack_froms_ready(f) {

									/in/.test(document.readyState) ? setTimeout('intval_jetpack_froms_ready(' + f + ')', 9) : f()
								 }

																 
																function callback_recpacha<?php echo esc_html($rand_char); ?>(){

																						if (typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.render) !== 'undefined' && myCaptcha_jetpack_form<?php echo esc_html($rand_char); ?> === null) {

																							   <?php if ('yes' == trim($disable_submit_btn)) : ?>
																									jQuery("[name=contact-form-hash][value=<?php echo esc_html($contactFormHash); ?>]").closest("form").find(':submit').prop( "disabled", true );
																								   <?php if ('' == $recapcha_error_msg_captcha_blank) : ?>
																									jQuery("[name=contact-form-hash][value=<?php echo esc_html($contactFormHash); ?>]").closest("form").find(':submit').attr("title", "<?php echo esc_html(__('Captcha is a required field.', 'recaptcha-for-woocommerce')); ?>");
																								   <?php else : ?>
																									jQuery("[name=contact-form-hash][value=<?php echo esc_html($contactFormHash); ?>]").closest("form").find(':submit').attr("title", "<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>");
																								   <?php endif; ?>
																							   <?php endif; ?>

																																															try{
																																																
																																																	myCaptcha_jetpack_form<?php echo esc_html($rand_char); ?>=window.turnstile.render('#cf-recaptcha-jetpack-method-<?php echo esc_html($rand_char); ?>', {
																																																		'sitekey': '<?php echo esc_html( $site_key ); ?>',
																																																		 'callback' : verifyCallback_jetpackform<?php echo esc_html($rand_char); ?>,
																																																		 'response-field':"false" ,
																																																		  'response-field-name':'i13_recaptcha_woo_jetpackform_token_v2',
																																																		  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																																																	  });
																																																  
																																															}catch(error){
																																															
																																																console.log(error);
																																															}

																					}

																			   } 
														   var verifyCallback_jetpackform<?php echo esc_html( $rand_char ); ?>='';
																													var myCaptcha_jetpack_form<?php echo esc_html( $rand_char ); ?> = null;
																													intval_jetpack_froms_ready(function () {


														   verifyCallback_jetpackform<?php echo esc_html( $rand_char ); ?> = function(response) {

																if(response.length!==0){
																		   <?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
																																							jQuery("[name=contact-form-hash][value=<?php echo esc_html( $contactFormHash ); ?>]").closest("form").find(':submit').removeAttr("title");
																																							jQuery("[name=contact-form-hash][value=<?php echo esc_html( $contactFormHash ); ?>]").closest("form").find(':submit').prop( "disabled", false );
																		   <?php endif; ?>

																				 if (typeof jetpack_recaptcha_verified === "function") {

																																									 jetpack_recaptcha_verified(response);
																				  }
																}

							  };

				 

					  var waitForEl = function(selector, callback) {

							if (jQuery("#"+selector).length) {
															
																	if ((typeof (window.turnstile) === 'undefined' || typeof (window.turnstile.render) === 'undefined') && myCaptcha_jetpack_form<?php echo esc_html( $rand_char ); ?> === null) {




																			jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=callback_recpacha<?php echo esc_html( $rand_char ); ?>", function() {
																	  });




															  }
															  else{    
																			callback_recpacha<?php echo esc_html( $rand_char ); ?>();
																	}
							} else {
							  setTimeout(function() {
								waitForEl(jQuery("#"+selector), callback);
							  }, 100);
							}
						  };

												 <?php if ( '' == trim( $captcha_lable ) ) : ?>
													jQuery("[name=contact-form-hash][value=<?php echo esc_html( $contactFormHash ); ?>]").closest("form").find('.grunion-field-wrap:last').after(`<div class="grunion-field-wrap grunion-field-i13-recaptcha">
													<?php
														if ( 'yes' != $i13_recapcha_hide_label_woo_jetpack ) :
															?>
															<label for="cf-recaptcha-jetpack-method"><?php echo esc_html( __( 'Captcha', 'recaptcha-for-woocommerce' ) ); ?>&nbsp;<span class="required">*</span></label>
															<?php
														endif;
														?>
										<input type="hidden" autocomplete="off" name="woo-jetpack-nonce" value="<?php echo esc_html( wp_create_nonce( 'i13-jetpack-nonce' ) ); ?>" />
															<div id="cf-recaptcha-jetpack-method" name="cf-recaptcha-jetpack-method"  data-callback="verifyCallback_jetpackform<?php echo esc_html( $rand_char ); ?>" data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_woo_jetpackform_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div></div>`).ready(function () {
							<?php else : ?>
								jQuery("[name=contact-form-hash][value=<?php echo esc_html( $contactFormHash ); ?>]").closest("form").find('.grunion-field-wrap:last').after(`<div class="grunion-field-wrap grunion-field-i13-recaptcha">
								<?php
								if ( 'yes' != $i13_recapcha_hide_label_woo_jetpack ) :
									?>
									 <label for="cf-recaptcha-jetpack-method-<?php echo esc_html( $rand_char ); ?>"><?php echo esc_html( $captcha_lable ); ?>&nbsp;<span class="required"></span></label>
									<?php
								endif;
								?>
								<input type="hidden" autocomplete="off" name="woo-jetpack-nonce" value="<?php echo esc_html( wp_create_nonce( 'i13-jetpack-nonce' ) ); ?>" />
								<div id="cf-recaptcha-jetpack-method-<?php echo esc_html( $rand_char ); ?>" name="cf-recaptcha-jetpack-method-<?php echo esc_html( $rand_char ); ?>"  data-callback="verifyCallback_jetpackform<?php echo esc_html( $rand_char ); ?>" data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>"  data-response-field="false" data-response-field-name="i13_recaptcha_woo_jetpackform_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div></div>`).ready(function () {
							<?php endif; ?>


								waitForEl('cf-recaptcha-jetpack-method-<?php echo esc_html( $rand_char ); ?>', function() {

																				<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
																						jQuery("#<?php echo esc_html( $contactFormHash ); ?>").closest("form").find(':submit').prop( "disabled", true );
																						<?php if ( '' == esc_html( $recapcha_error_msg_captcha_blank ) ) : ?>
																																													jQuery("#<?php echo esc_html( $contactFormHash ); ?>").closest("form").find(':submit').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
																						<?php else : ?>
																																													jQuery("#<?php echo esc_html( $contactFormHash ); ?>").closest("form").find(':submit').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
																						<?php endif; ?>
																				<?php endif; ?>

																				if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.render) !== 'undefined' && myCaptcha_jetpack_form<?php echo esc_html( $rand_char ); ?> === null) {

																										   try{
																													 myCaptcha_jetpack_form<?php echo esc_html($rand_char); ?>=window.turnstile.render('#cf-recaptcha-jetpack-method-<?php echo esc_html($rand_char); ?>', {
																																																																	'sitekey': '<?php echo esc_html( $site_key ); ?>',
																																																																	 'callback' : verifyCallback_jetpackform<?php echo esc_html($rand_char); ?>,
																																																																	 'response-field':"false" ,
																																																																	  'response-field-name':'i13_recaptcha_woo_jetpackform_token_v2',
																																																																	  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																																																																  });
																												}catch(error){
																																																									
																																																									console.log(error);
																																																								}
																								}
																				})

																})


							



				 });

			  </script>
			  <!-- end_do_not_format_javascript -->
				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_woo_jetpack' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
					  
						$i13_recapcha_woo_jetpack_exclude = get_option( 'i13_recapcha_woo_jetpack_exclude' );
						$exlude_froms = array();
			if ( trim( $i13_recapcha_woo_jetpack_exclude ) != '' ) {

				$exlude_froms = explode( ',', $i13_recapcha_woo_jetpack_exclude );
			}

			$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
			if (''== $i13_recapcha_msg_token_generation) {

				$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
			}

			if ( 'yes' == $is_enabled && ! in_array( $pid, $exlude_froms ) ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					  $urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha-v3' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_action_v3 = get_option( 'i13_recapcha_woo_jetpack_method_action_v3' );
				if ( '' == trim( $i13_recapcha_action_v3 ) ) {

					$i13_recapcha_action_v3 = 'contact_form';
				}
				
				if ( isset( $_POST ) && is_array( $_POST ) && ! empty( $_POST ) && isset( $_POST[ $_POST['contact-form-hash'] ] ) ) {

						$form_err = sanitize_text_field( wp_unslash( $_POST[ $contactFormHash ] ) );
					if ( '' != $form_err ) {
						$err_html .= "<div class='form-error'>\n<h3>" . __( 'Error!', 'jetpack' ) . "</h3>\n<ul class='form-errors'>\n";
										$err_html .= "\t<li class='form-error-message'>" . esc_html( $form_err ) . "</li>\n";
						$err_html .= "</ul>\n</div>\n\n";
					}
				}
				?>

				<!-- do_not_format_javascript --><script type="text/javascript">
																window.el_i13_jetpack_captcha=null;    
															 function intval_jetpack_froms_v3_ready(f) {
																			 /in/.test(document.readyState) ? setTimeout('intval_jetpack_froms_v3_ready(' + f + ')', 9) : f()
															  }

															 document.addEventListener('readystatechange', function () {
																	 if (document.readyState === 'interactive') {

																					 const el__ =  document.querySelector('[name="contact-form-hash"][value="<?php echo esc_html( $contactFormHash ); ?>"]');

																					 if (el__) {
																						form_i1j = el__.closest("form");
																							 if (form_i1j) {
																									 submitButtons_ = form_i1j.querySelectorAll('input[type="submit"], button[type="submit"]');
																									 submitButtons_.forEach(btn => {
																									   btn.disabled = true;
																									   btn.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
																									 });
																							   }
																					 }

																	 }
															 });    
								intval_jetpack_froms_v3_ready(function () {

																	jQuery("[name=contact-form-hash][value=<?php echo esc_html( $contactFormHash ); ?>]").after(`<input type="hidden" autocomplete="off" name="woo-jetpack-nonce" value="<?php echo esc_html( wp_create_nonce( 'i13-jetpack-nonce' ) ); ?>" /> <div id="turnstile-jetpack-i13" class="turnstile-jetpack-i13"></div>`);

																		 


																			if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined') {


																							   i13RenderJetpackCaptchaV3();

																			}
																			else{


																							jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&render=<?php echo esc_html( $site_key ); ?>&onload=i13RenderJetpackCaptchaV3", function() {



																							});
																			}



																			setInterval(function() {

																						 if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.reset) !== 'undefined' && el_i13_register_captcha!=null) {

																										try{

																											window.turnstile.reset(el_i13_jetpack_captcha);
																										}
																										catch (error){

																											console.log(error);
																										}

																						 }
																							 

																			  }, 80 * 1000);




								});

																
								function i13RenderJetpackCaptchaV3(){


																			try{
										
																					el_i13_jetpack_captcha = window.turnstile.render('#turnstile-jetpack-i13', {
																							sitekey: "<?php echo esc_html( $site_key ); ?>",
																							size: "invisible",     
																							action: "<?php echo esc_html( $i13_recapcha_action_v3 ); ?>" ,
																							'response-field':"false" ,
																							'response-field-name':'i13_recaptcha_jetpack_token',
																							callback: onSuccessJetpack      
																						  });


																							jQuery("[name=contact-form-hash][value=<?php echo esc_html( $contactFormHash ); ?>]").closest("form").find(':submit').removeAttr("title");
																						   jQuery("[name=contact-form-hash][value=<?php echo esc_html( $contactFormHash ); ?>]").closest("form").find(':submit').prop( "disabled", false );
																					
																			   }
																			   catch(error){
																				   
																				   console.log(error);
																					jQuery("[name=contact-form-hash][value=<?php echo esc_html( $contactFormHash ); ?>]").closest("form").find(':submit').removeAttr("title");
																					jQuery("[name=contact-form-hash][value=<?php echo esc_html( $contactFormHash ); ?>]").closest("form").find(':submit').prop( "disabled", false );
																					
																			   }
																			   

															   }
															   
															   function onSuccessJetpack(){
															   
																	   jQuery("[name=contact-form-hash][value=<?php echo esc_html( $contactFormHash ); ?>]").closest("form").find(':submit').removeAttr("title");
																	   jQuery("[name=contact-form-hash][value=<?php echo esc_html( $contactFormHash ); ?>]").closest("form").find(':submit').prop( "disabled", false );
																				   
															   
															   }


						  </script><!-- end_do_not_format_javascript -->
				<?php
			}
		}

			$output = ob_get_clean();
		return $err_html . $r . $output;
	}
	public function do_woocommerce_init() {

		$domain = parse_url(home_url(), PHP_URL_HOST);
		if (!defined('I13_DOMAIN_REFERER')) {
			 define('I13_DOMAIN_REFERER', $domain);
		}
						
		add_action( 'i13_woo_checkout_regform_action', array( $this, 'i13woo_extra_register_fields' ) );

		$version = 6.0;
		// woo 6.0 new password reset form
		if ( version_compare( WC_VERSION, $version, '>=' ) ) {

			add_action( 'woocommerce_resetpassword_form', array( $this, 'i13woo_extra_lostpassword_fields' ) );
			add_action( 'validate_password_reset', array( $this, 'i13_woocomm_validate_lostpassword_captcha' ), 10, 1 );
			add_action( 'lostpassword_post', array( $this, 'i13_woocomm_validate_lostpassword_captcha' ), 10, 1 );
		} else {

			add_action( 'lostpassword_post', array( $this, 'i13_woocomm_validate_lostpassword_captcha' ), 10, 1 );
		}

		$version_c = 4.3;
		if ( version_compare( WC_VERSION, $version_c, '>=' ) ) {

			add_filter( 'woocommerce_add_payment_method_form_is_valid', array( $this, 'i13_woo_verify_add_payment_method' ) );
		} else {

			$this->i13_woo_verify_add_payment_method();
		}

		$enabled_bp = get_option( 'i13_recapcha_using_buddy_press' );
				
		if ( 'yes' == $enabled_bp ) {
				   
			add_action( 'bp_before_registration_submit_buttons', array( $this, 'i13woo_extra_register_fields' ), 9999 );
			add_action( 'bp_signup_pre_validate', array( $this, 'i13_woocomm_validate_bb_press_signup_captcha' ), 999 );
		}
				
				
				$version_c = 6.5;
		if ( version_compare( WC_VERSION, $version_c, '>=' ) ) {

			add_filter( 'woocommerce_order_tracking_form', array( $this, 'i13_woo_order_tracking_form_captcha' ) );
		} else {

			add_action( 'wp_footer', array( $this, 'i13_woo_order_tracking_form_captcha' ) );
		}
				
				
		if (isset(WC()->session)) {
				   
			if (WC()->session->has_session()) {
						
				if (''==WC()->session->get( 'i13_req_id', '' )) {
							
			   $unique_id=uniqid('i13_');
			   WC()->session->set( 'i13_req_id', $unique_id);
					if (!defined('COOKIEHASH_I13')) {
							   define('COOKIEHASH_I13', $unique_id);
					}
							
				} else {
					if (!defined('COOKIEHASH_I13')) {
							 define('COOKIEHASH_I13', WC()->session->get( 'i13_req_id', COOKIEHASH));
					}
				}
			} else {
							
							
								$unique_req=COOKIEHASH . ip2long(i13_woo_get_user_ip_address()) . i13_woo_get_user_browser();   
								define('COOKIEHASH_I13', $unique_req);
							 
			}
		} else {
					
			 $unique_req=COOKIEHASH . ip2long(i13_woo_get_user_ip_address()) . i13_woo_get_user_browser();   
						 define('COOKIEHASH_I13', $unique_req);
		}
				
				
				
				
				
	}

	public function is_rest() {

		$prefix = rest_get_url_prefix();
		if ( defined( 'REST_REQUEST' ) && ( REST_REQUEST // (#1)
				|| isset( $_GET['rest_route'] ) ) // (#2)
				&& ( 0 === strpos( trim( sanitize_text_field( $_GET['rest_route'] ), '\\/' ), $prefix, 0 ) )
		) {
			return true;
		}
	}

	public function disable_recaptcha_plugin_if_rest_request( $plugins ) {

		if ( $this->is_rest() ) {
			$key = array_search( 'recaptcha-for-woocommerce/woo-recaptcha.php', $plugins );

			if ( false !== $key ) {
				unset( $plugins[ $key ] );
			}
		}

		return $plugins;
	}

	public function i13_trigger_woo_recaptcha_action_for_recaptcha() {

		do_action( 'woocommerce_pay_order_before_submit' );
	}
		
	public function i13_trigger_woo_recaptcha_action_for_moneris($order_id) {
		 
			  ob_start();
				echo '<div id="my-extra-field-wrapper">';
		 $this->i13woo_extra_checkout_fields_pay_order();
	 echo '</div>';
				echo "<!-- do_not_format_javascript --><script type='text/javascript'>
document.addEventListener('DOMContentLoaded', function() {

    let alreadyMoved = false;
    let observer = null; 

    function moveFieldInsideForm() {

        if (alreadyMoved) return;

        const field = document.getElementById('my-extra-field-wrapper');
        if (!field) return;

        const form = document.querySelector('form#order_review');
        if (!form) return;

        const submitBtn = form.querySelector('#place_order');
        if (!submitBtn) return;

        submitBtn.parentNode.insertBefore(field, submitBtn);

        alreadyMoved = true;

    
        if (observer) {
            observer.disconnect();
        }
    }

    
    moveFieldInsideForm();

    
    observer = new MutationObserver(function() {
        moveFieldInsideForm();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

});
</script><!-- end_do_not_format_javascript -->";
					
							 
	}

	public function get_recaptcha_domain() {

		$domain = 'google.com';
		$reCapcha_domain = get_option( 'i13_recapcha_domain' );

		if ( 'yes' == $reCapcha_domain ) {

			$domain = 'recaptcha.net';
		}

		return $domain;
	}

	public function add_woo_recaptcha_to_custom_form( $content, $args ) {
		ob_start();
		$this->i13woo_extra_login_fields();
		$output = ob_get_clean();
		return $output . $content;
	}

	public function i13_woocommerce_payment_request_btn_captcha() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );

		$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
					
		if ('v3'==strtolower($reCapcha_version)) {
					
			$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {
						
								
				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_woo_checkout')) {

					$reCapcha_version='v2';
										
				} else if (1 == get_transient('i13_' . COOKIEHASH_I13 . 'block_checkout')) {

					$reCapcha_version = 'v2';
										
				}
			}
		}
				
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			if ( is_page( 'cart' ) || is_cart() ) {

				$i13_recaptcha_login_recpacha_for_req_btn = get_option( 'i13_recaptcha_login_recpacha_for_req_btn_cart_page' );
				if ( '' == $i13_recaptcha_login_recpacha_for_req_btn ) {
					$i13_recaptcha_login_recpacha_for_req_btn = 'no';
				}
								
							  
			} else {

				$i13_recaptcha_login_recpacha_for_req_btn = get_option( 'i13_recaptcha_login_recpacha_for_req_btn' );
				if ( '' == $i13_recaptcha_login_recpacha_for_req_btn ) {
					$i13_recaptcha_login_recpacha_for_req_btn = 'no';
				}
								
							 
			}
						
			if ( 'yes' == $i13_recaptcha_login_recpacha_for_req_btn ) {

				$i13_recapcha_hide_label_checkout = get_option( 'i13_recapcha_hide_label_checkout' );
				$captcha_lable = get_option( 'i13_recapcha_guestcheckout_title' );
				$captcha_lable_ = get_option( 'i13_recapcha_guestcheckout_title' );
				$refresh_lable = get_option( 'i13_recapcha_guestcheckout_refresh' );
				if ( '' == esc_html( $refresh_lable ) ) {

					$refresh_lable = __( 'Refresh Captcha', 'recaptcha-for-woocommerce' );
				}
				$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
				$theme = get_option( 'i13_recapcha_guestcheckout_theme' );
				$size = get_option( 'i13_recapcha_guestcheckout_size' );
				$is_enabled = get_option( 'i13_recapcha_enable_on_guestcheckout' );
				$is_enabled_logincheckout = get_option( 'i13_recapcha_enable_on_logincheckout' );
				$i13_recapcha_guest_recpacha_refersh_on_error = get_option( 'i13_turnstile_guest_recpacha_refersh_on_error' );
				$i13_recapcha_login_recpacha_refersh_on_error = get_option( 'i13_turnstile_login_recpacha_refersh_on_error' );
				$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
				$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
				if ( '' == trim( $captcha_lable_ ) ) {

					$captcha_lable_ = 'captcha';
				}
				$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );

				if ( 'yes' == $is_enabled && ! is_user_logged_in() ) {

					if ( 'yes' == $i13_recapcha_no_conflict ) {

						global $wp_scripts;

						$urls = array( 'challenges.cloudflare.com' );

						foreach ( $wp_scripts->queue as $handle ) {

							foreach ( $urls as $url ) {
								if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) ) {
									wp_dequeue_script( $handle );

									break;
								}
							}
						}
					}
					wp_enqueue_script( 'jquery' );
					wp_enqueue_script( 'i13-woo-captcha' );
					?>
					<div class="guest-checkout-recaptcha woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
					<?php
					if ( 'yes' != $i13_recapcha_hide_label_checkout ) :
						?>
							<label for="cf-turnstile-checkout-i13"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;<span class="required">*</span></label>
						<?php
					endif;
					?>
											<div id="cf-turnstile-checkout-i13" name="cf-turnstile-checkout-i13" class="cf-turnstile-checkout-i13" data-callback="verifyCallback_add_guestcheckout"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_checkout_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
											<div id='refresh_captcha' style="width:100%;padding-top:5px"> 
													<a href="javascript:window.turnstile.reset(myCaptcha);" style="clear:both"><?php echo esc_html( $refresh_lable ); ?></a>
											</div>    

					</div>
					<!-- do_not_format_javascript --><script type="text/javascript">
						var myCaptcha = null;
						var capchaChecked = false;
						recap_val = null;
						function intval_payment_rq_guest_ready(f) {
							/in/.test(document.readyState) ? setTimeout('intval_payment_rq_guest_ready(' + f + ')', 9) : f()
						}



						function reRenderCaptcha() {

														if(myCaptcha===null){
																try {
																		   myCaptcha= window.turnstile.render('.cf-turnstile-checkout-i13', {
																									'sitekey': '<?php echo esc_html( $site_key ); ?>',
																									 'callback' : verifyCallback_add_guestcheckout,
																									 'response-field':'false' ,
																									  'response-field-name':'i13_recaptcha_checkout_token_v2',
																									  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>',
																									  'expired-callback': expireCallback_add_guestcheckout
																								  });


																} catch (error) {

																}

													  }
													  else{
																		 
																	try{

																		   window.turnstile.reset(window.myCaptcha);
																	   }
																	   catch (error){

																		   console.log(error);
																	   }
															}


						}

						intval_payment_rq_guest_ready(function () {

							
								if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined' && myCaptcha === null) {
																		
									reRenderCaptcha();

								 }
																else{

																			   jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=reRenderCaptcha", function() {



																				 });
															   }

								jQuery(document).ajaxSend(function (event, jqxhr, settings) {


									if(settings.url.indexOf('wc-ajax=checkout') !== -1 || settings.url.indexOf('wc-ajax=wcstripe_create_order') !== -1 || (settings.url.indexOf('wc-ajax=wc_stripe_frontend_request') !== -1 && settings.url.indexOf('path=/wc-stripe/v1/checkout') !== -1) || settings.url.indexOf('wc-ajax=wc_stripe_create_order') !== -1 || settings.url.indexOf('wc-ajax=wcpay_create_order') !== -1 || settings.url.indexOf('wc-ajax=wc_ajax_square_digital_wallet_process_checkout') !== -1){
																				   if(window.recap_val!==null && window.recap_val!='' && settings.data.indexOf('i13_recaptcha_checkout_token_v2' + '=') === -1 ){

																					settings.data = settings.data + '&i13_recaptcha_checkout_token_v2=' + window.recap_val;
																																																									}
																			}



								});

								jQuery(document.body).on('updated_cart_totals', function () {
									reRenderCaptcha();
								});


							
							
						 });


													   if (!window.i13_ppc_v2_interceptor_loaded) {
																	window.i13_ppc_v2_interceptor_loaded = true;

																		 (function() {
																									const originalFetch = window.fetch;
																									window.i13_ppc_alert_shown = false;     

																									function stripHtml(html) {
																											if (!html) return '';
																											const tmp = document.createElement('div');
																											tmp.innerHTML = html;
																											return tmp.textContent || tmp.innerText || '';
																									}

																									window.fetch = async function(input, init) {
																											const url = (typeof input === "string") ? input : (input?.url || "");

																											if (!url.includes("ppc-create-order")) {
																													return originalFetch.apply(this, arguments);
																											}

																											 if (url.includes("ppc-create-order")) {
																													window.i13_ppc_alert_shown = false;

																													if (window.__i13_ppc_last_call && Date.now() - window.__i13_ppc_last_call < 300) {
																															return originalFetch.call(this, input, init);
																													}

																													window.__i13_ppc_last_call = Date.now();
																											}
																											try {


																													if(window.recap_val==null || window.recap_val==''){
																															setTimeout(() => alert('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>'), 2000);
																															return Promise.reject('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>');
																													}

																													const options = { ...init };
																													if (options.body && typeof options.body === "string") {
																															const bodyObj = JSON.parse(options.body);
																															bodyObj.recaptcha_token = window.recap_val;
																															bodyObj.recaptcha_i13_nonce = '<?php echo esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block')); ?>';
																															bodyObj.cookiehash_i13 = '<?php echo esc_html(COOKIEHASH_I13); ?>';
																															bodyObj.js_context = 'inline';
																															bodyObj.recap_v = 'v2';
																															options.body = JSON.stringify(bodyObj);
																													}

																													const response = await originalFetch.call(this, input, options);

																													 if (response.status === 400) {
																															try {
																																	const errorData = await response.clone().json();
																																	if (errorData && JSON.stringify(errorData).includes('cf-recaptcha_error_v2')) {
																																			let message = '❌ Checkout failed. Please try again.';
																																			if (errorData.data?.message) {
																																					message = stripHtml(errorData.data.message);
																																			} else if (errorData.message) {
																																					message = stripHtml(errorData.message);
																																			}

																																			setTimeout(() => {
																																					if(window.i13_ppc_alert_shown==false){
																																							window.i13_ppc_alert_shown=true;
																																							alert(message);
																																					}

																																			}, 2000);
																																	}
																															} catch (parseError) {
																																	console.error('Error parsing error response:', parseError);
																															}
																													}

																													return response;

																											} catch (error) {
																													console.error('PayPal fetch interceptor error:', error);
																													throw error;
																											}
																									};
																							})(); 
																	   }

						var verifyCallback_add_guestcheckout = function (response) {
														
							if (response.length !== 0) {

								window.recap_val = response;
								if (typeof woo_guest_checkout_recaptcha_verified === "function") {

									woo_guest_checkout_recaptcha_verified(response);
																		
								}
								if (typeof removeRecaptchaOverlay === "function") {

									removeRecaptchaOverlay();
																		
								}
																

							}

						};
						var expireCallback_add_guestcheckout = function () {
														
							window.recap_val=null;

						};




					</script><!-- end_do_not_format_javascript -->
					<?php
				} else if ( 'yes' == $is_enabled_logincheckout && is_user_logged_in() ) {

					if ( 'yes' == $i13_recapcha_no_conflict ) {

						global $wp_scripts;

						$urls = array( 'challenges.cloudflare.com' );

						foreach ( $wp_scripts->queue as $handle ) {

							foreach ( $urls as $url ) {
								if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) ) {
									wp_dequeue_script( $handle );

									break;
								}
							}
						}
					}
					wp_enqueue_script( 'jquery' );
					wp_enqueue_script( 'i13-woo-captcha' );
					?>

					<div class="login-checkout-captcha woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
											<?php
											if ( 'yes' != $i13_recapcha_hide_label_checkout ) :
												?>
															<label for="cf-turnstile-checkout-i13"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;<span class="required">*</span></label>
													<?php
											endif;
											?>
											<div id="cf-turnstile-checkout-i13" name="cf-turnstile-checkout-i13" class="cf-turnstile-checkout-i13" data-callback="verifyCallback_add_logincheckout"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_checkout_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
											<div id='refresh_captcha' style="width:100%;padding-top:5px"> 
													<a href="javascript:window.turnstile.reset(myCaptcha);" style="clear:both"><?php echo esc_html( $refresh_lable ); ?></a>
											</div> 
										</div>
					<!-- do_not_format_javascript --><script type="text/javascript">
						var myCaptcha = null;
						recap_val = null;
						function intval_payment_rq_login_ready(f) {
							/in/.test(document.readyState) ? setTimeout('intval_payment_rq_login_ready(' + f + ')', 9) : f()
						}

				   
												function reRenderCaptcha() {

														try{
																		if(myCaptcha===null){
																			myCaptcha= window.turnstile.render('.cf-turnstile-checkout-i13', {
																					'sitekey': '<?php echo esc_html( $site_key ); ?>',
																					 'callback' : verifyCallback_add_logincheckout,
																					 'response-field':'false' ,
																					  'response-field-name':'i13_recaptcha_checkout_token_v2',
																					  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																				  });
																		 }
																		 else{
																		 
																				 try{

																						window.turnstile.reset(window.myCaptcha);
																					}
																					catch (error){

																						console.log(error);
																					}
																		 }

															 } catch (error){}





														}
											   
						intval_payment_rq_login_ready(function () {

						 
							
								
																
								if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.render) !== 'undefined' && myCaptcha === null) {
								
									reRenderCaptcha();
								}
																else{


																		jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=reRenderCaptcha", function() {



																				});
																}

								jQuery(document).ajaxSend(function (event, jqxhr, settings) {

									
									
																	if(settings.url.indexOf('wc-ajax=checkout') !== -1 || settings.url.indexOf('wc-ajax=wcstripe_create_order') !== -1 ||  (settings.url.indexOf('wc-ajax=wc_stripe_frontend_request') !== -1 && settings.url.indexOf('path=/wc-stripe/v1/checkout') !== -1) || settings.url.indexOf('wc-ajax=wc_stripe_create_order') !== -1 || settings.url.indexOf('wc-ajax=wcpay_create_order') !== -1 || settings.url.indexOf('wc-ajax=wc_ajax_square_digital_wallet_process_checkout') !== -1){
																		
																			if(window.recap_val!==null && window.recap_val!='' && settings.data.indexOf('i13_recaptcha_checkout_token_v2' + '=') === -1 ){
																				  settings.data = settings.data + '&i13_recaptcha_checkout_token_v2=' + window.recap_val;
																			}
																	}


								});


																
																
																
								jQuery(document.body).on('updated_cart_totals', function () {
									reRenderCaptcha();
								});

						 
						 });

												  if (!window.i13_ppc_v2_interceptor_loaded) {
													window.i13_ppc_v2_interceptor_loaded = true;
													
												   (function() {
																	const originalFetch = window.fetch;
																	window.i13_ppc_alert_shown = false;
																	
																	function stripHtml(html) {
																		if (!html) return '';
																		const tmp = document.createElement('div');
																		tmp.innerHTML = html;
																		return tmp.textContent || tmp.innerText || '';
																	}

																	window.fetch = async function(input, init) {
																		const url = (typeof input === "string") ? input : (input?.url || "");

																		if (!url.includes("ppc-create-order")) {
																			return originalFetch.apply(this, arguments);
																		}
																		if (url.includes("ppc-create-order")) {
																			window.i13_ppc_alert_shown = false;

																			if (window.__i13_ppc_last_call && Date.now() - window.__i13_ppc_last_call < 300) {
																				return originalFetch.call(this, input, init);
																			}

																			window.__i13_ppc_last_call = Date.now();
																		}

																		try {
																			
																			
																			if(window.recap_val==null || window.recap_val==''){
																				setTimeout(() => alert('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>'), 2000);
																				return Promise.reject('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>');
																			}

																			const options = { ...init };
																			if (options.body && typeof options.body === "string") {
																				const bodyObj = JSON.parse(options.body);
																				bodyObj.recaptcha_token = window.recap_val;
																				bodyObj.recaptcha_i13_nonce = '<?php echo esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block')); ?>';
																				bodyObj.cookiehash_i13 = '<?php echo esc_html(COOKIEHASH_I13); ?>';
																				bodyObj.js_context = 'inline';  
																				bodyObj.recap_v = 'v2';
																				options.body = JSON.stringify(bodyObj);
																			}

																			const response = await originalFetch.call(this, input, options);

																			 if (response.status === 400) {
																				try {
																					const errorData = await response.clone().json();
																					if (errorData && JSON.stringify(errorData).includes('cf-recaptcha_error_v2')) {
																						let message = '❌ Checkout failed. Please try again.';
																						if (errorData.data?.message) {
																							message = stripHtml(errorData.data.message);
																						} else if (errorData.message) {
																							message = stripHtml(errorData.message);
																						}

																						setTimeout(() => {
																							
																							if(window.i13_ppc_alert_shown==false){
																								window.i13_ppc_alert_shown=true;
																								alert(message);
																							}
																						
																						}, 2000);
																					}
																				} catch (parseError) {
																					console.error('Error parsing error response:', parseError);
																				}
																			}

																			return response;

																		} catch (error) {
																			console.error('PayPal fetch interceptor error:', error);
																			throw error;
																		}
																	};
																})();
														  }

						var verifyCallback_add_logincheckout = function (response) {

							if (response.length !== 0) {

								window.recap_val = response;
								if (typeof woo_login_checkout_recaptcha_verified === "function") {

									woo_login_checkout_recaptcha_verified(response);
								}
																
								  if (typeof removeRecaptchaOverlay === "function") {

									removeRecaptchaOverlay();
																		
								}
																
							}



						};

						var expireCallback_add_guestcheckout = function () {
														
							window.recap_val=null;

						};

					</script><!-- end_do_not_format_javascript -->
					<?php
				}
			}
		} else {
					
			if ( is_page( 'cart' ) || is_cart() ) {

				$i13_recaptcha_v3_login_recpacha_for_req_btn = get_option( 'i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page' );
				if ( '' == $i13_recaptcha_v3_login_recpacha_for_req_btn ) {
					$i13_recaptcha_v3_login_recpacha_for_req_btn = 'no';
				}
			} else {
				$i13_recaptcha_v3_login_recpacha_for_req_btn = get_option( 'i13_recaptcha_v3_login_recpacha_for_req_btn' );
				if ( '' == $i13_recaptcha_v3_login_recpacha_for_req_btn ) {
					$i13_recaptcha_v3_login_recpacha_for_req_btn = 'no';
				}
			}
						
						$captcha_lable_ = get_option( 'i13_recapcha_guestcheckout_title' );
						$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );


			if ( 'yes' == $i13_recaptcha_v3_login_recpacha_for_req_btn ) {

				$is_enabled = get_option( 'i13_recapcha_enable_on_guestcheckout' );
				$is_enabled_logincheckout = get_option( 'i13_recapcha_enable_on_logincheckout' );

				if ( ( 'yes' == $is_enabled && ! is_user_logged_in() ) || ( 'yes' == $is_enabled_logincheckout && is_user_logged_in() ) ) {

					if ( 'yes' == $i13_recapcha_no_conflict ) {

						global $wp_scripts;

						$urls = array( 'challenges.cloudflare.com' );

						foreach ( $wp_scripts->queue as $handle ) {

							foreach ( $urls as $url ) {
								if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) ) {
									wp_dequeue_script( $handle );

									break;
								}
							}
						}
					}
					wp_enqueue_script( 'jquery' );
					wp_enqueue_script( 'i13-woo-captcha-v3' );

					$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
					$i13_recapcha_checkout_action_v3 = get_option( 'i13_recapcha_checkout_action_v3' );
					if ( '' == $i13_recapcha_checkout_action_v3 ) {

						$i13_recapcha_checkout_action_v3 = 'checkout';
					}
					?>
										<div id="turnstile-woo-checkout-i13" class="turnstile-woo-checkout-i13" ></div>
								<div id="turnstile-woo-checkout-fallback-i13" class="turnstile-woo-checkout-fallback-i13" ></div>
			   
					<!-- do_not_format_javascript --><script type="text/javascript">

											  
												 window.turnstile_woo_checkout_i13=null;
												 window.turnstile_woo_checkout_fallback_i13=null;                                                   
						 function intval_payment_rq_guest_v3_ready(f) {
							/in/.test(document.readyState) ? setTimeout('intval_payment_rq_guest_v3_ready(' + f + ')', 9) : f()
						}

				   
												function i13_isJsonString_req_btn(str) {
																try {
																	  JSON.parse(str);
																} catch (e) {
																		return false;
																}
																return true;
												  }
						intval_payment_rq_guest_v3_ready(function () {

				 
								 
															if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined') {


																			i13RenderPayReqCaptchaV3();

															}
															else{


																							jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&onload=i13RenderPayReqCaptchaV3", function() {



																							});
															}

								


													jQuery(document).ajaxComplete(function () {

														 setTimeout(function() { 

															 if (jQuery(".woocommerce-error").is(":visible") || jQuery(".woocommerce_error").is(":visible")) {

																																				<?php if ('yes' == $use_v2_along_v3) : ?>



																																						if(jQuery("#cf-recaptcha_error_v3").length){

																																										if (typeof jQuery("#cf-recaptcha_error_v3").data('reload') !== 'undefined'){
																																														if(jQuery("#cf-recaptcha_error_v3").data('reload')=='1'){
																																																		location.reload();
																																														}
																																										}
																																						 }



																																				<?php endif; ?>       

																																 
																																								 try{

																																											window.turnstile.reset(window.turnstile_woo_checkout_i13);
																																										}
																																										catch (error){

																																											console.log(error);
																																										}
																				 }

																 }, 3000);

														});                                                                         
								
																



								setInterval(function () {

																		if (typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.reset) !== 'undefined') {
									
																				try{

																					   window.turnstile.reset(window.turnstile_woo_checkout_i13);
																				   }
																				   catch (error){

																					   console.log(error);
																				   }



																	   }

								}, 80 * 1000);


																setInterval(function() {

																	 try{

																																					window.turnstile.reset(window.turnstile_woo_checkout_fallback_i13);
																																				}
																																				catch (error){

																																					console.log(error);
																																				}
																	   }, 100 * 1000);


																	   
															 if (!window.i13_ppc_v3_interceptor_loaded) {
																																					   window.i13_ppc_v3_interceptor_loaded = true;

																																							   (function() {
																																									   const originalFetch = window.fetch;
																																									   window.i13_ppc_alert_shown = false;    

																																									   function stripHtml(html) {
																																											   if (!html) return '';
																																											   const tmp = document.createElement('div');
																																											   tmp.innerHTML = html;
																																											   return tmp.textContent || tmp.innerText || '';
																																									   }

																																									   window.fetch = async function(input, init) {
																																											   const url = (typeof input === "string") ? input : (input?.url || "");

																																											   if (!url.includes("ppc-create-order")) {
																																													   return originalFetch.apply(this, arguments);
																																											   }

																																											   if (url.includes("ppc-create-order")) {
																																													   window.i13_ppc_alert_shown = false;

																																													   if (window.__i13_ppc_last_call && Date.now() - window.__i13_ppc_last_call < 300) {
																																															   return originalFetch.call(this, input, init);
																																													   }

																																													   window.__i13_ppc_last_call = Date.now();
																																											   }

																																											   try {
																																													   console.log("PayPal create order intercepted:", url, performance.now());
																																													   
																																													   let tokenValX = turnstile.getResponse(window.turnstile_woo_checkout_i13);
																																													 
																																													   if(tokenValX==null || tokenValX==''){

																																																tokenValX = turnstile.getResponse(window.turnstile_woo_checkout_fallback_i13);

																																													   }
																																													   
																																													   if(!tokenValX || tokenValX==null || tokenValX==''){
																																															   setTimeout(() => alert('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>'), 2000);
																																															   return Promise.reject('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>');
																																													   }

																																													   const options = { ...init };
																																													   if (options.body && typeof options.body === "string") {
																																															   const bodyObj = JSON.parse(options.body);
																																															   bodyObj.recaptcha_token_v3 = tokenValX;
																																															   bodyObj.recaptcha_i13_nonce = '<?php echo esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block')); ?>';
																																															   bodyObj.cookiehash_i13 = '<?php echo esc_html(COOKIEHASH_I13); ?>';
																																															   bodyObj.js_context = 'inline';
																																															   bodyObj.recap_v = 'v3';
																																															   options.body = JSON.stringify(bodyObj);
																																													   }

																																													   const response = await originalFetch.call(this, input, options);

																																														if (response.status === 400) {
																																															   try {
																																																	   const errorData = await response.clone().json();
																																																	   if (errorData && JSON.stringify(errorData).includes('cf-recaptcha_error_v3')) {
																																																			   let message = '❌ Checkout failed. Please try again.';
																																																			   if (errorData.data?.message) {
																																																					   message = stripHtml(errorData.data.message);
																																																			   } else if (errorData.message) {
																																																					   message = stripHtml(errorData.message);
																																																			   }

																																																			   setTimeout(() => {
																																																					   if(window.i13_ppc_alert_shown==false){
																																																							   window.i13_ppc_alert_shown=true;
																																																							   alert(message);
																																																					   }
																																																					<?php if ('yes' == $use_v2_along_v3) : ?>
																																																								   const url = new URL(location.href);
																																																								   url.searchParams.set('rand_i13', (Math.random() + 1).toString(36).substring(7));
																																																								   location.assign(url.search);
																																																					<?php endif; ?>
																																																			   }, 2000);
																																																	   }
																																															   } catch (parseError) {
																																																	   console.error('Error parsing error response:', parseError);
																																															   }
																																													   }

																																													   return response;

																																											   } catch (error) {
																																													   console.error('PayPal fetch interceptor error:', error);
																																													   throw error;
																																											   }
																																									   };
																																							   })(); 
																																					   }

															   
	   
																																			jQuery(document).ajaxSend(function(event, jqXHR, settings) {


																																				if(settings.url.indexOf('wc-ajax=checkout') !== -1 || settings.url.indexOf('wc-ajax=wcstripe_create_order') !== -1 ||  (settings.url.indexOf('wc-ajax=wc_stripe_frontend_request') !== -1 && settings.url.indexOf('path=/wc-stripe/v1/checkout') !== -1) || settings.url.indexOf('wc-ajax=wc_stripe_create_order') !== -1 || settings.url.indexOf('wc-ajax=wcpay_create_order') !== -1 || settings.url.indexOf('wc-ajax=wc_ajax_square_digital_wallet_process_checkout') !== -1){

																																						try{

																																							if(settings.data.indexOf('i13_recaptcha_checkout_token' + '=') === -1 ){
																																								let tokenVal__ = turnstile.getResponse(window.turnstile_woo_checkout_i13);

																																								if(tokenVal__!=null && tokenVal__!=''){
																																										settings.data += '&i13_recaptcha_checkout_token='+tokenVal__;                                             


																																								}
																																							}

																																							if(settings.data.indexOf('i13_recaptcha_checkout_token_fallback' + '=') === -1 ){
																																								 tokenVal__ = turnstile.getResponse(window.turnstile_woo_checkout_fallback_i13);
																																								if(tokenVal__!=null && tokenVal__!=''){
																																										settings.data += '&i13_recaptcha_checkout_token_fallback='+tokenVal__;                                             


																																								}
																																							}

																																						}
																																						catch(error){


																																						}

																																				}


																																		});
																
																

																																		jQuery(document.body).on('updated_cart_totals', function () {

																																				if (typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.reset) !== 'undefined') {
									
																																						try{

																																							   window.turnstile.reset(window.turnstile_woo_checkout_i13);
																																						   }
																																						   catch (error){

																																							   console.log(error);
																																						   }



																																			   }
																																		});

							

					   });

										   
												function i13RenderPayReqCaptchaV3(){


																try{
																										
																															if(window.turnstile_woo_checkout_i13===null){


																																			window.turnstile_woo_checkout_i13= window.turnstile.render('.turnstile-woo-checkout-i13', {
																																				sitekey: "<?php echo esc_html( $site_key ); ?>",
																																				size: "invisible",
																																				action: "<?php echo esc_html( $i13_recapcha_checkout_action_v3 ); ?>" ,
																																				'response-field':"false" ,
																																				'response-field-name':'i13_recaptcha_checkout_token'
																																				
																																			  });

																															  }

																															if(window.turnstile_woo_checkout_fallback_i13===null ){  


																																		window.turnstile_woo_checkout_fallback_i13 = window.turnstile.render('.turnstile-woo-checkout-fallback-i13', {
																																		  sitekey: "<?php echo esc_html( $site_key ); ?>",
																																		  size: "invisible",
																																		  action: "<?php echo esc_html( $i13_recapcha_checkout_action_v3 ); ?>" ,
																																		  'response-field':"false" ,
																																		  'response-field-name':'i13_recaptcha_checkout_token_fallback'
																																		  
																																		});

																															  }
																														}
																														catch (error){

																																console.error('turnstile:', error);
																														}


												}



					</script><!-- end_do_not_format_javascript -->
					<?php
				}
			}
		}
	}

	public function i13_woo_check_comment_captcha( $comment_data ) {

		if ( is_admin() ) {

			return $comment_data;
		}
		$is_enabled = get_option( 'i13_recapcha_enable_on_woo_comment' );
		if ( 'yes' == $is_enabled ) {

			$reCapcha_version = get_option( 'i13_turnstile_version' );
			if ( '' == $reCapcha_version ) {
				$reCapcha_version = 'v2';
			}

			$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_woo_comment_token_v2'])) {

				$reCapcha_version='v2';
			}
						
			$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
			if (''==$i13_recapcha_v2_timeout) {
				$i13_recapcha_v2_timeout=600;
			} else {

				$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
			}
						
			if ( 'v2' == strtolower( $reCapcha_version ) ) {

				$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
				$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
				$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
				$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );

				$captcha_lable = get_option( 'i13_recapcha_woo_comment_title' );
				if ( '' == trim( $captcha_lable ) ) {

					$captcha_lable = 'captcha';
				}

				$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
				$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
				$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

				$nonce_value = isset( $_REQUEST['comment_nonce_val'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['comment_nonce_val'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification

				if ( 'review' !== $comment_data['comment_type'] && ! wp_verify_nonce( $nonce_value, 'wp-cm-nonce' ) ) {

						wp_die( esc_html__( 'Nonce verification failed.', 'recaptcha-for-woocommerce' ) );
						exit;

				}
				if ( ! is_admin() && isset( $_POST['comment_post_ID'], $comment_data['comment_type'] ) && 'product' !== get_post_type( absint( $_POST['comment_post_ID'] ) ) && 'review' !== $comment_data['comment_type'] ) { // WPCS: input var ok, CSRF ok.

					if ( isset( $_POST['i13_recaptcha_woo_comment_token_v2'] ) && ! empty( $_POST['i13_recaptcha_woo_comment_token_v2'] ) ) {

						// Turnstile captcha API secret key
						$response = sanitize_text_field( $_POST['i13_recaptcha_woo_comment_token_v2'] );
												
						

														// Verify the reCAPTCHA response
														$verifyResponse = wp_remote_post(
														   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
														   array(
																		   'method' => 'POST',
																		   'timeout' => 60,
																		   'body' => array(
																						   'secret' => $secret_key,
																						   'response' => $response,
																		   ),
															   )
															);

						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

															// Decode json data
															$responseData = json_decode( $verifyResponse['body'] );

															// If reCAPTCHA response is valid
							if ( ! $responseData->success ) {

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																			wp_die( esc_html__( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
																			exit;
								} else {

																			wp_die( esc_html( $recapcha_error_msg_captcha_invalid ) );
																			exit;
								}
							} else {

									delete_transient( 'i13_' . COOKIEHASH_I13 . '_wp_comments');
							}
						} else {

							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																		wp_die( esc_html__( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																		exit;
							} else {

										wp_die( esc_html( $recapcha_error_msg_captcha_no_response ) );
										exit;
							}
						}
												
						
											
											
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							wp_die( esc_html__( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
							exit;
						} else {

							wp_die( esc_html( $recapcha_error_msg_captcha_blank ) );
							exit;
						}
					}
				}
			} else {

				
				$i13_recapcha_woo_comment_method_action_v3 = get_option( 'i13_recapcha_woo_comment_method_action_v3' );
				if ( '' == $i13_recapcha_woo_comment_method_action_v3 ) {

					$i13_recapcha_woo_comment_method_action_v3 = 'comment';
				}

				$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
				$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
				$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
				$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );

				$nonce_value = isset( $_REQUEST['comment_nonce_val'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['comment_nonce_val'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
				if ( 'review' !== $comment_data['comment_type'] && ! wp_verify_nonce( $nonce_value, 'wp-cm-nonce' ) ) {

						wp_die( esc_html__( 'Nonce verification failed.', 'recaptcha-for-woocommerce' ) );
						exit;

				}
				if ( ! is_admin() && isset( $_POST['comment_post_ID'], $comment_data['comment_type'] ) && 'product' !== get_post_type( absint( $_POST['comment_post_ID'] ) ) && 'review' !== $comment_data['comment_type'] ) { // WPCS: input var ok, CSRF ok.

					if ( isset( $_POST['i13_recaptcha_comment_token'] ) && ! empty( $_POST['i13_recaptcha_comment_token'] ) ) {
													// Turnstile captcha API secret key
													$response = sanitize_text_field( $_POST['i13_recaptcha_comment_token'] );

						
													
														// Verify the reCAPTCHA response
														 $verifyResponse = wp_remote_post(
														'https://challenges.cloudflare.com/turnstile/v0/siteverify',
														array(
																		'method' => 'POST',
																		'timeout' => 60,
																		'body' => array(
																						'secret' => $secret_key,
																						'response' => $response,
																		),
															)
														 );

						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

							// Decode json data
							$responseData = json_decode( $verifyResponse['body'] );
							// If reCAPTCHA response is valid

							if ( ! $responseData->success ) {

								if ( 'yes' == $use_v2_along_v3 ) {
																			
									set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_comments', '1', $i13_recapcha_v2_timeout );
								}
								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																			wp_die( esc_html__( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
																			exit;
								} else {

																			wp_die( esc_html( $recapcha_error_msg_captcha_invalid ) );
																			exit;
								}
							} else {

								if ( $responseData->action != $i13_recapcha_woo_comment_method_action_v3 ) {

									if ( 'yes' == $use_v2_along_v3 ) {
																					set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_comments', '1', $i13_recapcha_v2_timeout );
									}
									if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																					wp_die( esc_html__( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
																					exit;
									} else {

																					wp_die( esc_html( $recapcha_error_msg_captcha_invalid ) );
																					exit;
									}
								}
							}
						} else {

							if ( 'yes' == $use_v2_along_v3 ) {
																	
																set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_comments', '1', $i13_recapcha_v2_timeout );
							}
							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																	wp_die( esc_html__( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																	exit;
							} else {

								wp_die( esc_html( $recapcha_error_msg_captcha_no_response ) );
								exit;
							}
						}
														
						
												
												
					} else {

						if ( 'yes' == $use_v2_along_v3 ) {
							set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_comments', '1', $i13_recapcha_v2_timeout );
						}
						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							wp_die( esc_html__( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) );
							exit;
						} else {

							wp_die( esc_html( $recapcha_error_msg_captcha_blank ) );
							exit;
						}
					}
				}
			}
		}

		return $comment_data;
	}

	public function i13_woo_check_review_captcha( $comment_data ) {

		if ( is_admin() ) {

			return $comment_data;
		}

		$is_enabled = get_option( 'i13_recapcha_enable_on_woo_review' );
		if ( 'yes' == $is_enabled ) {

			$reCapcha_version = get_option( 'i13_turnstile_version' );
			if ( '' == $reCapcha_version ) {
				$reCapcha_version = 'v2';
			}

			$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_woo_review_token_v2'])) {

				$reCapcha_version='v2';
			}
						
			$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
			if (''==$i13_recapcha_v2_timeout) {
				$i13_recapcha_v2_timeout=600;
			} else {

				$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
			}
						
						
			if ( 'v2' == strtolower( $reCapcha_version ) ) {

				$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
				$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
				$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
				$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );

				$captcha_lable = get_option( 'i13_recapcha_woo_review_title' );
				if ( '' == trim( $captcha_lable ) ) {

					$captcha_lable = 'captcha';
				}

				$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
				$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
				$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

				$nonce_value = isset( $_REQUEST['_review_nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_review_nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification

				if ( 'review' === $comment_data['comment_type'] && ! wp_verify_nonce( $nonce_value, 'wp-review-nonce' ) ) {

					wp_die( esc_html__( 'Nonce verification failed.', 'recaptcha-for-woocommerce' ) );
					exit;

				}
				if ( ! is_admin() && isset( $_POST['comment_post_ID'], $comment_data['comment_type'] ) && 'product' === get_post_type( absint( $_POST['comment_post_ID'] ) ) && 'review' === $comment_data['comment_type'] && wc_reviews_enabled() ) { // WPCS: input var ok, CSRF ok.

					if ( isset( $_POST['i13_recaptcha_woo_review_token_v2'] ) && ! empty( $_POST['i13_recaptcha_woo_review_token_v2'] ) ) {

						// Turnstile captcha API secret key
						$response = sanitize_text_field( $_POST['i13_recaptcha_woo_review_token_v2'] );

						

							// Verify the reCAPTCHA response
													 $verifyResponse = wp_remote_post(
																'https://challenges.cloudflare.com/turnstile/v0/siteverify',
																array(
																				'method' => 'POST',
																				'timeout' => 60,
																				'body' => array(
																								'secret' => $secret_key,
																								'response' => $response,
																				),
																	)
																 );


						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

															// Decode json data
															$responseData = json_decode( $verifyResponse['body'] );

								// If reCAPTCHA response is valid
							if ( ! $responseData->success ) {

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																		wp_die( esc_html__( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
																		exit;
																			
								} else {

																			wp_die( esc_html( $recapcha_error_msg_captcha_invalid ) );
																			exit;
								}
							} else {

								delete_transient( 'i13_' . COOKIEHASH_I13 . '_woo_product_review');
							}
						} else {

							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																	wp_die( esc_html__( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																	exit;
																	
							} else {

																	wp_die( esc_html( $recapcha_error_msg_captcha_no_response ) );
																	exit;
							}
						}
												
						
												
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							wp_die( esc_html__( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
							exit;
						} else {

							wp_die( esc_html( $recapcha_error_msg_captcha_blank ) );
							exit;
						}
					}
				}
			} else {

				

				$i13_recapcha_woo_review_method_action_v3 = get_option( 'i13_recapcha_woo_review_method_action_v3' );
				if ( '' == $i13_recapcha_woo_review_method_action_v3 ) {

					$i13_recapcha_woo_review_method_action_v3 = 'review';
				}

				$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
				$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
				$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
				$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );

				$nonce_value = isset( $_REQUEST['_review_nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_review_nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
				if ( 'review' === $comment_data['comment_type'] && ! wp_verify_nonce( $nonce_value, 'wp-review-nonce' ) ) {

						wp_die( esc_html__( 'Nonce verification failed.', 'recaptcha-for-woocommerce' ) );
						exit;

				}
				if ( ! is_admin() && isset( $_POST['comment_post_ID'], $comment_data['comment_type'] ) && 'product' === get_post_type( absint( $_POST['comment_post_ID'] ) ) && 'review' === $comment_data['comment_type'] && wc_reviews_enabled() ) { // WPCS: input var ok, CSRF ok.

					if ( isset( $_POST['i13_recaptcha_review_token'] ) && ! empty( $_POST['i13_recaptcha_review_token'] ) ) {
													
													// Turnstile captcha API secret key
													$response = sanitize_text_field( $_POST['i13_recaptcha_review_token'] );

													
												
														// Verify the reCAPTCHA response
														 $verifyResponse = wp_remote_post(
																'https://challenges.cloudflare.com/turnstile/v0/siteverify',
																array(
																				'method' => 'POST',
																				'timeout' => 60,
																				'body' => array(
																								'secret' => $secret_key,
																								'response' => $response,
																				),
																	)
																 );

						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

						   // Decode json data
						   $responseData = json_decode( $verifyResponse['body'] );
						   // If reCAPTCHA response is valid

							if ( ! $responseData->success ) {

								if ( 'yes' == $use_v2_along_v3 ) {
								   set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_product_review', '1', $i13_recapcha_v2_timeout );
								}
								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																			wp_die( esc_html__( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
																			exit;
								} else {

																			wp_die( esc_html( $recapcha_error_msg_captcha_invalid ) );
																			exit;
								}
							} else {

								if (  $responseData->action != $i13_recapcha_woo_review_method_action_v3 ) {

									if ( 'yes' == $use_v2_along_v3 ) {
																				 set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_product_review', '1', $i13_recapcha_v2_timeout );
									}
									if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																				wp_die( esc_html__( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
																				exit;
																					
									} else {

																				wp_die( esc_html( $recapcha_error_msg_captcha_invalid ) );
																				exit;
									}
								}
							}
						} else {

							if ( 'yes' == $use_v2_along_v3 ) {
																	
																 set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_product_review', '1', $i13_recapcha_v2_timeout );
							}
							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																	wp_die( esc_html__( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																	exit;
																 
							} else {

																	wp_die( esc_html( $recapcha_error_msg_captcha_no_response ) );
																	exit;
							}
						}
												
						
											
					} else {

						if ( 'yes' == $use_v2_along_v3 ) {
						   set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_product_review', '1', $i13_recapcha_v2_timeout );
						}
						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							wp_die( esc_html__( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) );
							exit;
														
						} else {

							wp_die( esc_html( $recapcha_error_msg_captcha_blank ) );
							exit;
														
						}
					}
				}
			}
		}

		return $comment_data;
	}

	public function i13_woo_add_comment_form_captcha() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
				
		if ('v3'==strtolower($reCapcha_version)) {

			   $use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_wp_comments')) {

				  $reCapcha_version='v2';
				}
			}
		}
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_woo_comment' );
			$i13_recapcha_hide_label_login = get_option( 'i13_recapcha_hide_label_woo_comment' );
			$captcha_lable = get_option( 'i13_recapcha_woo_comment_title' );
			$captcha_lable_ = $captcha_lable;

			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_woo_comment_theme' );
			$size = get_option( 'i13_recapcha_woo_comment_size' );
			$is_enabled = apply_filters( 'i13_recapcha_enable_in_comment_form', get_option( 'i13_recapcha_enable_on_woo_comment' ) );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );
			$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );

			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {

								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );

								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha' );
				?>
										
				<div class="woo-comment-captcha woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
								<input type="hidden" autocomplete="off" name="comment_nonce_val" value="<?php echo esc_html( wp_create_nonce( 'wp-cm-nonce' ) ); ?>" />        
				<?php
				if ( 'yes' != $i13_recapcha_hide_label_login ) :
					?>
						<label for="turnstile-recaptcha-woo-comment-i13"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;<span class="required">*</span></label>
					<?php
				endif;
				?>
					<style>  #turnstile-recaptcha-woo-comment-i13{
						margin-bottom: 10px;
					}</style>      
					 <div id="turnstile-recaptcha-woo-comment-i13" name="turnstile-recaptcha-woo-comment-i13" class="turnstile-recaptcha-woo-comment-i13" data-callback="verifyCallback_woo_comment"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>"  data-response-field="false" data-response-field-name="i13_recaptcha_woo_comment_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>


				</div>



				<!-- do_not_format_javascript --><script type="text/javascript">

						myCaptchacomment=null;
						function intval_comment_form_ready(f) {
							/in/.test(document.readyState) ? setTimeout('intval_comment_form_ready(' + f + ')', 9) : f()
						}

				   

						intval_comment_form_ready(function () {



							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
											jQuery('#commentform').find('#submit').attr("disabled", true);
								<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
												jQuery('#commentform').find('#submit').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
								<?php else : ?>
												jQuery('#commentform').find('#submit').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
								<?php endif; ?>

							<?php endif; ?>
															
															
															if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined' && myCaptchacomment === null) {

																			 i13renderCommentCaptchaV2();

																		  }
																		  else{

																						  jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=i13renderCommentCaptchaV2", function() {



																								  });
																		  }   
									
						});


					var verifyCallback_woo_comment = function (response) {

						if (response.length !== 0) {
							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
																jQuery('#commentform').find('#submit').removeAttr("title");
																jQuery('#commentform').find('#submit').attr("disabled", false);
							<?php endif; ?>


							if (typeof woo_comment_captcha_verified === "function") {

								woo_comment_captcha_verified(response);
							}

						}

					};

										
										function i13renderCommentCaptchaV2(){

												  
													 try{
														myCaptchacomment= window.turnstile.render('.turnstile-recaptcha-woo-comment-i13', {
														'sitekey': '<?php echo esc_html( $site_key ); ?>',
														 'callback' : verifyCallback_woo_comment,
														 'response-field':'false' ,
														  'response-field-name':'i13_recaptcha_woo_comment_token_v2',
														  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
													  });
												  } catch (error){}
												  
													 
											 }    


				</script><!-- end_do_not_format_javascript -->


				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_woo_comment' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
			
			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha-v3' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_comment_action_v3 = get_option( 'i13_recapcha_woo_comment_method_action_v3' );
				if ( '' == trim( $i13_recapcha_comment_action_v3 ) ) {

					$i13_recapcha_comment_action_v3 = 'comment';
				}

				
								
				$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
				if (''== $i13_recapcha_msg_token_generation) {

					$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
				}

				?>
				<div id="turnstile-comment-i13" class="turnstile-comment-i13"></div>
				<input type="hidden" autocomplete="off" name="comment_nonce_val" value="<?php echo esc_html( wp_create_nonce( 'wp-cm-nonce' ) ); ?>" />        
				<!-- do_not_format_javascript --><script type="text/javascript">

										el_i13_comment_captcha=null;
										document.addEventListener('readystatechange', function () {
										if (document.readyState === 'interactive') {

																var form_cm = document.querySelector('#commentform');
																var element_cm = form_cm?.querySelector('button[type="submit"], input[type="submit"]');
																if (typeof(element_cm) != 'undefined' && element_cm != null)
																{
																		element_cm.disabled = true;
																		element_cm.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
																}
												}
										});

					function intval_comment_form_v3_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_comment_form_v3_ready(' + f + ')', 9) : f()
					}

				   

						intval_comment_form_v3_ready(function () {


													   
														if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined' && el_i13_comment_captcha==null) {


																				   i13RenderCommentCaptchaV3();

																   }
																   else{


																					jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&onload=i13RenderCommentCaptchaV3", function() {



																					});
																   }


							


								setInterval(function () {

																	if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.reset) !== 'undefined') {

																		  try{

																				window.turnstile.reset(el_i13_comment_captcha);
																			}
																			catch (error){

																				console.log(error);
																			}
																	  }

								}, 80 * 1000);
							
														
																setTimeout(function(){

																				if(jQuery('#commentform').find(':submit').length>0){

																						jQuery('#commentform').find(':submit').attr('title', '');
																						jQuery('#commentform').find(':submit').prop('disabled', false);
																				}

																		}, 60000);
						
						 });

												function i13RenderCommentCaptchaV3(){


														   try{
															   el_i13_comment_captcha = window.turnstile.render('.turnstile-comment-i13', {
																 sitekey: "<?php echo esc_html( $site_key ); ?>",
																 size: "invisible",     
																 action: "<?php echo esc_html( $i13_recapcha_comment_action_v3 ); ?>" ,
																 'response-field':"false" ,
																 'response-field-name':'i13_recaptcha_comment_token',
																 callback: onSuccessComment      
															   });

														   }
														   catch(error){

																   console.error('Turnstile execution error:', error);

																   if(jQuery('#commentform').find(':submit').length>0){

																		   jQuery('#commentform').find(':submit').attr('title', '');
																		   jQuery('#commentform').find(':submit').prop('disabled', false);
																   }
														   }


												} 
												
												
										   function onSuccessComment(token) {
								
													 
													if(jQuery('#commentform').find(':submit').length>0){

															   jQuery('#commentform').find(':submit').attr('title', '');
															   jQuery('#commentform').find(':submit').prop('disabled', false);
													   }    
											 }
				</script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	/*
	 public function i13_woo_check_review_captcha( $comment_data ) {

	  // If posting a comment (not trackback etc) and not logged in.
	  if ( ! is_admin() && isset( $_POST['comment_post_ID'], $_POST['rating'], $comment_data['comment_type'] ) && 'product' === get_post_type( absint( $_POST['comment_post_ID'] ) ) && empty( $_POST['rating'] ) && self::is_default_comment_type( $comment_data['comment_type'] ) && wc_review_ratings_enabled() && wc_review_ratings_required() ) { // WPCS: input var ok, CSRF ok.
	  wp_die( esc_html__( 'Please rate the product.', 'woocommerce' ) );
	  exit;
	  }
	  return $comment_data;
	  } */

	public function i13_recapcha_for_review_form( $review_form ) {

		ob_start();

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
				
				
		if ('v3'==strtolower($reCapcha_version)) {

			 $use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_woo_product_review')) {

				$reCapcha_version='v2';
				}
			}
		}
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_woo_review' );
			$i13_recapcha_hide_label_login = get_option( 'i13_recapcha_hide_label_woo_review' );
			$captcha_lable = get_option( 'i13_recapcha_woo_review_title' );
			$captcha_lable_ = $captcha_lable;

			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_woo_review_theme' );
			$size = get_option( 'i13_recapcha_woo_review_size' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_woo_review' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );

			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );
			$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
						
			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {

								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );

								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha' );
				?>
				<div class="woo-login-captcha woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
				<?php
				if ( 'yes' != $i13_recapcha_hide_label_login ) :
					?>
						<label for="turnstile-recaptcha-woo-review-i13"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;<span class="required">*</span></label>
					<?php
				endif;
				?>
					<input type="hidden" autocomplete="off" name="_review_nonce" value="<?php echo esc_html( wp_create_nonce( 'wp-review-nonce' ) ); ?>" />        
					 <div id="turnstile-recaptcha-woo-review-i13" name="turnstile-recaptcha-woo-review-i13" class="turnstile-recaptcha-woo-review-i13" data-callback="verifyCallback_woo_review"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-callback="verifyCallback_woo_review" data-response-field="false" data-response-field-name="i13_recaptcha_woo_review_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
										

				</div>



				<!-- do_not_format_javascript --><script type="text/javascript">
										myCaptchareview=null;
					function intval_review_form_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_review_form_ready(' + f + ')', 9) : f()
					}

				   

					intval_review_form_ready(function () {
							
							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
											jQuery('#review_form').find('#submit').attr("disabled", true);
								<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
												jQuery('#review_form').find('#submit').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
								<?php else : ?>
												jQuery('#review_form').find('#submit').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
								<?php endif; ?>

							<?php endif; ?>
															
							
														if ((typeof (window.turnstile) == 'undefined' ||  typeof (window.turnstile.render) == 'undefined') && myCaptchareview == null){
														

																	jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=i13renderReviewCaptchaV2", function() {



																  });

														}
														else{

																 i13renderReviewCaptchaV2();
															  
														}
						
					});


					var verifyCallback_woo_review = function (response) {

						if (response.length !== 0) {
							
							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
								jQuery('#review_form').find('#submit').removeAttr("title");
								jQuery('#review_form').find('#submit').attr("disabled", false);
							<?php endif; ?>


							if (typeof woo_review_captcha_verified === "function") {

								woo_review_captcha_verified(response);
							}

						}

					};

										function i13renderReviewCaptchaV2(){


												try{
														myCaptchareview= window.turnstile.render('.turnstile-recaptcha-woo-review-i13', {
														'sitekey': '<?php echo esc_html( $site_key ); ?>',
														 'callback' : verifyCallback_woo_review,
														 'response-field':'false' ,
														  'response-field-name':'i13_recaptcha_woo_review_token_v2',
														  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
													  });
												  } catch (error){}
																			  
											 
									   }

				</script><!-- end_do_not_format_javascript -->


				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_woo_review' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
			
			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha-v3' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_review_action_v3 = get_option( 'i13_turnstile_woo_review_method_action_v3' );
				if ( '' == trim( $i13_recapcha_review_action_v3 ) ) {

					$i13_recapcha_review_action_v3 = 'review';
				}

			
								
				$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
				if (''== $i13_recapcha_msg_token_generation) {

					$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
				}
				?>
								 <div id="turnstile-review-i13" class="turnstile-review-i13"></div>
				<input type="hidden" autocomplete="off" name="_review_nonce" value="<?php echo esc_html( wp_create_nonce( 'wp-review-nonce' ) ); ?>" />
				<!-- do_not_format_javascript --><script type="text/javascript">


										el_i13_review_captcha=null;	
										document.addEventListener('readystatechange', function () {
										if (document.readyState === 'interactive') {

													var form_rw = document.querySelector('#review_form');
													var element_rw = form_rw?.querySelector('button[type="submit"], input[type="submit"]');
													if (typeof(element_rw) != 'undefined' && element_rw != null)
													{
															element_rw.disabled = true;
															element_rw.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
													}
												}
										});

					function intval_review_form_v3_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_review_form_v3_ready(' + f + ')', 9) : f()
					}

				   

					intval_review_form_v3_ready(function () {

											
											  


												if (typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.render) !== 'undefined') {


																	i13RenderReviewCaptchaV3();

													}
													else{


															jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&render=<?php echo esc_html( $site_key ); ?>&onload=i13RenderReviewCaptchaV3", function() {



															});
													}




													 setInterval(function() {

														if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.reset) !== 'undefined' && el_i13_review_captcha!=null) {

																			try{

																				window.turnstile.reset(el_i13_review_captcha);
																			}
																			catch (error){

																				console.log(error);
																			}

															 }
													}, 80 * 1000);

												   


													setTimeout(function(){

															if( jQuery('#review_form').find(':submit').length>0){
																	jQuery('#review_form').find(':submit').attr('title', '');
																	jQuery('#review_form').find(':submit').prop('disabled', false);
															}

													}, 60000);     
						

					});



										function i13RenderReviewCaptchaV3(){

											try{
												  el_i13_review_captcha = window.turnstile.render('.turnstile-review-i13', {
													sitekey: "<?php echo esc_html( $site_key ); ?>",
													size: "invisible",     
													action: "<?php echo esc_html( $i13_recapcha_review_action_v3 ); ?>" ,
													'response-field':"false" ,
													'response-field-name':'i13_recaptcha_review_token',
													callback: onSuccessReview      
												  });
												  
											  }
											  catch(error){
													
													  console.error('Turnstile execution error:', error);
											  
													   if( jQuery('#review_form').find(':submit').length>0){
															jQuery('#review_form').find(':submit').attr('title', '');
															jQuery('#review_form').find(':submit').prop('disabled', false);
													}
											  }

										}
										
										   function onSuccessReview(token) {
								
													 
												if( jQuery('#review_form').find(':submit').length>0){
															jQuery('#review_form').find(':submit').attr('title', '');
															jQuery('#review_form').find(':submit').prop('disabled', false);
													}
											 }

				</script><!-- end_do_not_format_javascript -->
				<?php
			}
		}

		$output = ob_get_clean();

		if ( '' != $output ) {

			if ( is_user_logged_in() ) {

				$review_form['comment_notes_after'] = $output;
			} else {

				$review_form['fields']['i13_recapcha'] = $output;
			}
		}

		return $review_form;
	}

	public function i13_add_header_metadata() {

		if ( $this->isIEBrowser() ) {
			echo '<meta http-equiv="X-UA-Compatible" content="IE=edge" />';
		}
		echo '<script>  var el_i13_login_captcha=null; var el_i13_register_captcha=null; </script>';
	}

	public function i13_turnstile_recaptcha_defer_parsing_of_js( $url ) {

		if ( strpos( $url, 'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha' ) !== false ) {
			return str_replace( ' src', ' defer src', $url );
		}

		return $url;
	}

	public function isIEBrowser() {

		if ( ! isset( $_SERVER['HTTP_USER_AGENT'] ) ) {

			return false;
		}

		$badBrowser = preg_match( '~MSIE|Internet Explorer~i', sanitize_text_field( $_SERVER['HTTP_USER_AGENT'] ) ) || preg_match( '~Trident/7.0(.*)?; rv:11.0~', sanitize_text_field( $_SERVER['HTTP_USER_AGENT'] ) );

		return $badBrowser;
	}

	public function i13_woo_payment_complete( $order_id ) {

		$nonece = isset( $_REQUEST['woocommerce-process-checkout-nonce'] ) ? wc_clean( wp_unslash( $_REQUEST['woocommerce-process-checkout-nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing

		if ( '' == trim( $nonece ) ) {

			$nonece = isset( $_REQUEST['_wpnonce'] ) ? wc_clean( wp_unslash( $_REQUEST['_wpnonce'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing
		}

		if ( wp_verify_nonce( $nonece, 'woocommerce-process_checkout' ) ) {
			if ( ! empty( $nonece ) ) {

				delete_transient( $nonece );
								delete_transient( 'i13_' . COOKIEHASH_I13 . '_woo_checkout');
			}
		}
	}

	public function i13_woo_remove_no_conflict() {

		return false;
	}

	
	public function i13_woocomm_validate_signup_captcha( $username, $email, $validation_errors ) {

		if ( is_admin() ) {

			return $validation_errors;
		}
		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

				$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_woo_register_token_v2'])) {

			$reCapcha_version='v2';
		}

				$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_signup' );
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );
			$captcha_lable = get_option( 'i13_recapcha_signup_title' );
			if ( '' == trim( $captcha_lable ) ) {

				$captcha_lable = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

			$nonce_value = isset( $_REQUEST['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_wpnonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
			$nonce_value = isset( $_REQUEST['woocommerce-register-nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['woocommerce-register-nonce'] ) ) : $nonce_value; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification

			if ( 'yes' == $is_enabled && ( isset($_POST['register']) ) && ( ( isset( $_REQUEST['woocommerce-register-nonce'] ) && ! empty( $_REQUEST['woocommerce-register-nonce'] ) ) || ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) ) ) {

				if ( wp_verify_nonce( $nonce_value, 'woocommerce-register' ) || wp_verify_nonce( $nonce_value, 'woocommerce-process_checkout' ) ) {

					if ( isset( $_POST['i13_recaptcha_woo_register_token_v2'] ) && ! empty( $_POST['i13_recaptcha_woo_register_token_v2'] ) ) {
						// Google reCAPTCHA API secret key
						$response = sanitize_text_field( $_POST['i13_recaptcha_woo_register_token_v2'] );

													// Verify the reCAPTCHA response

													 $verifyResponse = wp_remote_post(
													'https://challenges.cloudflare.com/turnstile/v0/siteverify',
													array(
																	'method' => 'POST',
																	'timeout' => 60,
																	'body' => array(
																					'secret' => $secret_key,
																					'response' => $response,
																	),
														)
													 );

						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

								// Decode json data
								$responseData = json_decode( $verifyResponse['body'] );

								// If reCAPTCHA response is valid
							if ( ! $responseData->success ) {

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

		   $validation_errors->add( 'cf_turnstile_error', __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
																	   
								} else {

					$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_invalid );
								}
							} else {

																  delete_transient( 'i13_' . COOKIEHASH_I13 . '_woo_register');
							}
						} else {

							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

														$validation_errors->add( 'cf_turnstile_error', __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																
							} else {
																
																$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_no_response );
							}
						}


						
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							$validation_errors->add( 'cf_turnstile_error', __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
						} else {
							$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_blank );
						}
					}
				} else {

					$validation_errors->add( 'cf_turnstile_error', __( 'Could not verify request.', 'recaptcha-for-woocommerce' ) );
				}
								
								
								
			}
		} else {

			if ( isset( $_POST['i13_recaptcha_login_token'] ) && '' != trim( sanitize_text_field( $_POST['i13_recaptcha_login_token'] ) ) ) {

				return $this->i13_woocomm_validate_login_captcha( $validation_errors, $username, $email );
			}

			
			$i13_recapcha_signup_action_v3 = get_option( 'i13_recapcha_signup_action_v3' );
			if ( '' == $i13_recapcha_signup_action_v3 ) {

				$i13_recapcha_signup_action_v3 = 'signup';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
			$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
			$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_signup' );
			$nonce_value = isset( $_REQUEST['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_wpnonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
			$nonce_value = isset( $_REQUEST['woocommerce-register-nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['woocommerce-register-nonce'] ) ) : $nonce_value; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification

						
			if ( ( 'yes' == $is_enabled ) && ( isset( $_POST['register']) ) && ( ( isset( $_REQUEST['woocommerce-register-nonce'] ) && ! empty( $_REQUEST['woocommerce-register-nonce'] ) ) || ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) )) {

				if ( isset( $_POST['i13_recaptcha_register_token'] ) && ! empty( $_POST['i13_recaptcha_register_token'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_register_token'] );

					
											 
					// Verify the reCAPTCHA response
						$verifyResponse = wp_remote_post(
										   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
										   array(
														   'method' => 'POST',
														   'timeout' => 60,
														   'body' => array(
																		   'secret' => $secret_key,
																		   'response' => $response,
														   ),
											   )
											);

											

					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

													// Decode json data
													$responseData = json_decode( $verifyResponse['body'] );

													// If reCAPTCHA response is valid
						if ( ! $responseData->success ) {
														
							if ( 'yes' == $use_v2_along_v3 ) {
							   set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_register', '1', $i13_recapcha_v2_timeout );
							}
							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

								$validation_errors->add( 'cf_turnstile_error', __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
							} else {
								$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_invalid );
							}
						} else {

							if ( $responseData->action != $i13_recapcha_signup_action_v3 ) {

																
								if ( 'yes' == $use_v2_along_v3 ) {
								   set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_register', '1', $i13_recapcha_v2_timeout );
								}
								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

									$validation_errors->add( 'cf_turnstile_error', __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
								} else {

									$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_invalid );
								}
							}
						}
					} else {

												
						if ( 'yes' == $use_v2_along_v3 ) {
															
														set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_register', '1', $i13_recapcha_v2_timeout );
						}
						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

														$validation_errors->add( 'cf_turnstile_error', __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
															
						} else {

														 $validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_no_response );
						}
					}
					
				} else {


					if ( 'yes' == $use_v2_along_v3 ) {
					   set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_register', '1', $i13_recapcha_v2_timeout );
					}
					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						$validation_errors->add( 'cf_turnstile_error', __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) );
					} else {

						$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_blank );
					}
				}
			}
		}
		return $validation_errors;
	}

	public function i13_woo_verify_wp_sensei_login_captcha() {

		 $reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

		$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_wp_login_token_v2'])) {

			$reCapcha_version='v2';
		}


		$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wplogin' );

			$captcha_lable = get_option( 'i13_recapcha_wplogin_title' );
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

			$nonce_value = isset( $_REQUEST['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_wpnonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
			if ( 'yes' == $is_enabled && isset( $_POST['form'] ) && 'sensei-login' == $_POST['form'] ) {

				if ( ! wp_verify_nonce( $nonce_value, 'sensei-login' ) ) {

					wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Nonce verification failed.', 'recaptcha-for-woocommerce' ) ) );

				}

				if ( isset( $_POST['i13_recaptcha_wp_login_token_v2'] ) && ! empty( $_POST['i13_recaptcha_wp_login_token_v2'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_wp_login_token_v2'] );

										 
							// Verify the reCAPTCHA response
													$verifyResponse = wp_remote_post(
																	'https://challenges.cloudflare.com/turnstile/v0/siteverify',
																	array(
																					'method' => 'POST',
																					'timeout' => 60,
																					'body' => array(
																									'secret' => $secret_key,
																									'response' => $response,
																					),
																	)
													);

					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

													// Decode json data
													$responseData = json_decode( $verifyResponse['body'] );

													// If reCAPTCHA response is valid
						if ( ! $responseData->success ) {

							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

								 wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) ) );
																		 
							} else {
								wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_invalid ) );
							}
						} else {

								delete_transient( 'i13_' . COOKIEHASH_I13 . '_wp_login');
						}
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

														wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) ) );
															
						} else {
														wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_no_response ) );
						}
					}
										
										
					
				} else {

					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ) );
					} else {
						wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_blank ) );
					}
				}
			}
		} else {

			
			$i13_recapcha_wp_login_action_v3 = get_option( 'i13_recapcha_wp_login_action_v3' );
			if ( '' == $i13_recapcha_wp_login_action_v3 ) {

				$i13_recapcha_wp_login_action_v3 = 'wp_login';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
			$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
			$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wplogin' );
			$nonce_value = isset( $_REQUEST['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_wpnonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
			if ( 'yes' == $is_enabled && isset( $_POST['form'] ) && 'sensei-login' == $_POST['form'] ) {

				if ( ! wp_verify_nonce( $nonce_value, 'sensei-login' ) ) {

					 wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Nonce verification failed.', 'recaptcha-for-woocommerce' ) ) );

				}
				if ( isset( $_POST['i13_recaptcha_wp_login_token'] ) && ! empty( $_POST['i13_recaptcha_wp_login_token'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_wp_login_token'] );
					
													// Verify the reCAPTCHA response
													$verifyResponse = wp_remote_post(
																	'https://challenges.cloudflare.com/turnstile/v0/siteverify',
																	array(
																					'method' => 'POST',
																					'timeout' => 60,
																					'body' => array(
																									'secret' => $secret_key,
																									'response' => $response,
																					),
																	)
													);

					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

						// Decode json data
						$responseData = json_decode( $verifyResponse['body'] );
						// If reCAPTCHA response is valid
						if ( ! $responseData->success ) {

							if ( 'yes' == $use_v2_along_v3 ) {
								set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_login', '1', $i13_recapcha_v2_timeout );
							}
							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

								wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) ) );
																		
							} else {
																	
								wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_invalid ) );
																		
							}
						} else {

							if (  $responseData->action != $i13_recapcha_wp_login_action_v3 ) {

								if ( 'yes' == $use_v2_along_v3 ) {
																		set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_login', '1', $i13_recapcha_v2_timeout );
								}
								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																			wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) ) );
								} else {
									wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_invalid ) );
								}
							}
						}
					} else {

						if ( 'yes' == $use_v2_along_v3 ) {
															
														set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_login', '1', $i13_recapcha_v2_timeout );
						}
						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

														wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) ) );
															
						} else {
														wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_no_response ) );
						}
					}
										
					
				} else {

					if ( 'yes' == $use_v2_along_v3 ) {
					   set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_login', '1', $i13_recapcha_v2_timeout );
					}
					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) ) );
					} else {
						wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_blank ) );
					}
				}
			}
		}
	}
	public function i13_woo_verify_wp_sensei_reg_captcha() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

				
		$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_wp_register_token_v2'])) {

			$reCapcha_version='v2';
		}


		$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}


		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wpregister' );

			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );

			$captcha_lable = trim( get_option( 'i13_recapcha_wpregister_title' ) );
			if ( '' == trim( $captcha_lable ) ) {

				$captcha_lable = 'captcha';
			}

			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

			$nonce_value = isset( $_REQUEST['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_wpnonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
			if ( 'yes' == $is_enabled && isset( $_POST['sensei_reg_email'] ) && isset( $_POST['sensei_reg_password'] ) ) {

				if ( ! wp_verify_nonce( $nonce_value, 'sensei-register' ) ) {

					wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Nonce verification failed', 'recaptcha-for-woocommerce' ) ) );

				}

				if ( isset( $_POST['i13_recaptcha_wp_register_token_v2'] ) && ! empty( $_POST['i13_recaptcha_wp_register_token_v2'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_wp_register_token_v2'] );

					

												// Verify the reCAPTCHA response
												$verifyResponse = wp_remote_post(
										  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
										  array(
												  'method' => 'POST',
												  'timeout' => 60,
												  'body' => array(
														  'secret' => $secret_key,
														  'response' => $response,
												  ),
										  )
								  );
					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

													// Decode json data
													$responseData = json_decode( $verifyResponse['body'] );

													// If reCAPTCHA response is valid
						if ( ! $responseData->success ) {
							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) ) );

							} else {

																wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_invalid ) );

							}
						} else {

								delete_transient( 'i13_' . COOKIEHASH_I13 . '_wp_register');
						}
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

															wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) ) );

						} else {
							
															wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_no_response ) );

						}
					}
										
					
									
				} else {

					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ) );

					} else {
						wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_blank ) );

					}
				}
			}
		} else {

			
			$i13_recapcha_wp_register_method_action_v3 = get_option( 'i13_recapcha_wp_register_method_action_v3' );
			if ( '' == $i13_recapcha_wp_register_method_action_v3 ) {

				$i13_recapcha_wp_register_method_action_v3 = 'wp_registration';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
			$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
			$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wpregister' );
			$nonce_value = isset( $_REQUEST['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_wpnonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification

			if ( 'yes' == $is_enabled && isset( $_POST['sensei_reg_email'] ) && isset( $_POST['sensei_reg_password'] ) ) {

				if ( ! wp_verify_nonce( $nonce_value, 'sensei-register' ) ) {

					wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Nonce verification failed', 'recaptcha-for-woocommerce' ) ) );

				}
				if ( isset( $_POST['i13_recaptcha_wp_register_token'] ) && ! empty( $_POST['i13_recaptcha_wp_register_token'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_wp_register_token'] );

												// Verify the reCAPTCHA response
												   $verifyResponse = wp_remote_post(
																		'https://challenges.cloudflare.com/turnstile/v0/siteverify',
																		array(
																						'method' => 'POST',
																						'timeout' => 60,
																						'body' => array(
																										'secret' => $secret_key,
																										'response' => $response,
																						),
																		)
														);

					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

						// Decode json data
						$responseData = json_decode( $verifyResponse['body'] );

						// If reCAPTCHA response is valid
						if ( ! $responseData->success ) {

							if ( 'yes' == $use_v2_along_v3 ) {
								set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_register', '1', $i13_recapcha_v2_timeout );
							}
							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

								wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) ) );
																		
							} else {
																	
								wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_invalid ) );
							}
						} else {

							if ( $responseData->action != $i13_recapcha_wp_register_method_action_v3 ) {

								if ( 'yes' == $use_v2_along_v3 ) {
																			
																		set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_register', '1', $i13_recapcha_v2_timeout );
								}
								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																			wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) ) );
								} else {

									wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_invalid ) );
								}
							}
						}
					} else {

						if ( 'yes' == $use_v2_along_v3 ) {
															set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_register', '1', $i13_recapcha_v2_timeout );
						}
						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

															wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) ) );
																
						} else {

															wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_no_response ) );
						}
					}
										
					
									
				} else {

					if ( 'yes' == $use_v2_along_v3 ) {
						set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_register', '1', $i13_recapcha_v2_timeout );
					}
					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) ) );
					} else {

						wp_die( '<strong>' . esc_html( __( 'ERROR:', 'recaptcha-for-woocommerce' ) ) . '</strong> ' . esc_html( $recapcha_error_msg_captcha_blank ) );
					}
				}
			}
		}

	}

	public function i13_woo_verify_wp_register_captcha( $username, $email, $validation_errors ) {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

				
				$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_wp_register_token_v2'])) {

			$reCapcha_version='v2';
		}
				
		$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wpregister' );

			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );

			$captcha_lable = trim( get_option( 'i13_recapcha_wpregister_title' ) );
			if ( '' == trim( $captcha_lable ) ) {

				$captcha_lable = 'captcha';
			}

			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

			$nonce_value = isset( $_REQUEST['wp-register-nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['wp-register-nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
			if ( 'yes' == $is_enabled && isset( $_POST['user_login'] ) && ! empty( $_POST['user_login'] ) ) {

				if ( ! wp_verify_nonce( $nonce_value, 'wp-register-nonce' ) ) {

					$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Nonce verification failed', 'recaptcha-for-woocommerce' ) );
					return $validation_errors;

				}
				if ( isset( $_POST['i13_recaptcha_wp_register_token_v2'] ) && ! empty( $_POST['i13_recaptcha_wp_register_token_v2'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_wp_register_token_v2'] );

							 // Verify the reCAPTCHA response
												  $verifyResponse = wp_remote_post(
										  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
										  array(
												  'method' => 'POST',
												  'timeout' => 60,
												  'body' => array(
														  'secret' => $secret_key,
														  'response' => $response,
												  ),
										  )
								  );

					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

													// Decode json data
													$responseData = json_decode( $verifyResponse['body'] );

													// If reCAPTCHA response is valid
						if ( ! $responseData->success ) {
							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

								$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
							} else {
								$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );
							}
						} else {

								delete_transient( 'i13_' . COOKIEHASH_I13 . '_wp_register');
						}

					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

															$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
						} else {
							$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_no_response );
						}
					}
										
										
					
									
				} else {

					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
					} else {
						$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_blank );
					}
				}
								
								
								
			}
		} else {

			
			$i13_recapcha_wp_register_method_action_v3 = get_option( 'i13_recapcha_wp_register_method_action_v3' );
			if ( '' == $i13_recapcha_wp_register_method_action_v3 ) {

				$i13_recapcha_wp_register_method_action_v3 = 'wp_registration';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
			$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
			$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wpregister' );
			$nonce_value = isset( $_REQUEST['wp-register-nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['wp-register-nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification

			if ( 'yes' == $is_enabled && isset( $_POST['user_login'] ) ) {

				if ( ! wp_verify_nonce( $nonce_value, 'wp-register-nonce' ) ) {

					$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Nonce verification failed', 'recaptcha-for-woocommerce' ) );
					return $validation_errors;

				}
				if ( isset( $_POST['i13_recaptcha_wp_register_token'] ) && ! empty( $_POST['i13_recaptcha_wp_register_token'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_wp_register_token'] );

					
										
							// Verify the reCAPTCHA response
							 $verifyResponse = wp_remote_post(
														'https://challenges.cloudflare.com/turnstile/v0/siteverify',
														array(
																		'method' => 'POST',
																		'timeout' => 60,
																		'body' => array(
																						'secret' => $secret_key,
																						'response' => $response,
																		),
															)
														 );

					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

						// Decode json data
						$responseData = json_decode( $verifyResponse['body'] );
														
						// If reCAPTCHA response is valid
						if ( ! $responseData->success ) {

							if ( 'yes' == $use_v2_along_v3 ) {
							   set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_register', '1', $i13_recapcha_v2_timeout );
							}
							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
																	
							} else {
																	
																$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );
							}
						} else {

							if (  $responseData->action != $i13_recapcha_wp_register_method_action_v3 ) {

								if ( 'yes' == $use_v2_along_v3 ) {
																		set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_register', '1', $i13_recapcha_v2_timeout );
								}

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																			$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
								} else {

									$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );
								}
							}
						}
					} else {

						if ( 'yes' == $use_v2_along_v3 ) {
														 set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_register', '1', $i13_recapcha_v2_timeout );
						}
						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

														$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
															
						} else {

														$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_no_response );
															
						}
					}
										
										
										
					
				} else {

					if ( 'yes' == $use_v2_along_v3 ) {
						set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_register', '1', $i13_recapcha_v2_timeout );
					}
					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) );
												
					} else {

						$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_blank );
												
					}
				}
			}
		}

		return $validation_errors;
	}

	public function i13_woo_verify_wp_lostpassword_captcha( $validation_errors ) {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
				
				$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_wp_lostpassword_token_v2'])) {

			$reCapcha_version='v2';
		}

				$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}
				
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wplostpassword' );

			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );
			$nonce_value = isset( $_REQUEST['wp-lostpassword-nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['wp-lostpassword-nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification

			$captcha_lable = get_option( 'i13_recapcha_wplostpassword_title' );
			if ( '' == trim( $captcha_lable ) ) {

				$captcha_lable = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[recaptcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[recaptcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

			if ( 'yes' == $is_enabled && isset( $_REQUEST['wp-lostpassword-nonce'] ) && ! empty( $_REQUEST['wp-lostpassword-nonce'] ) ) {

				if ( wp_verify_nonce( $nonce_value, 'wp-lostpassword-nonce' ) ) {
					if ( isset( $_POST['i13_recaptcha_wp_lostpassword_token_v2'] ) && ! empty( $_POST['i13_recaptcha_wp_lostpassword_token_v2'] ) ) {
						// Google reCAPTCHA API secret key
						$response = sanitize_text_field( $_POST['i13_recaptcha_wp_lostpassword_token_v2'] );

						
													
													// Verify the reCAPTCHA response
													$verifyResponse = wp_remote_post(
										  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
										  array(
												  'method' => 'POST',
												  'timeout' => 60,
												  'body' => array(
														  'secret' => $secret_key,
														  'response' => $response,
												  ),
										  )
								  );

						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

															// Decode json data
															$responseData = json_decode( $verifyResponse['body'] );

													// If reCAPTCHA response is valid
							if ( ! $responseData->success ) {

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {
																			
																		$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
																			
								} else {
																			
																		$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );
								}
							} else {

																delete_transient( 'i13_' . COOKIEHASH_I13 . '_wp_forgotpassword');  
							}
						} else {

							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																	
							} else {
																	
																$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_no_response );
							}
						}
												
												
						
											
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
						} else {
							$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_blank );
						}
					}
				} else {

					$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Could not verify request.', 'recaptcha-for-woocommerce' ) );
				}
								
							  
			}
		} else {

			
			$i13_recapcha_wp_lost_password_method_action_v3 = get_option( 'i13_recapcha_wp_lost_password_method_action_v3' );
			if ( '' == $i13_recapcha_wp_lost_password_method_action_v3 ) {

				$i13_recapcha_wp_lost_password_method_action_v3 = 'wp_forgot_password';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
			$recapcha_error_msg_captcha_no_response = get_option( 'i13_rturnstile_error_msg_captcha_no_response_v3' );
			$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wplostpassword' );
			$nonce_value = isset( $_REQUEST['wp-lostpassword-nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['wp-lostpassword-nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
			if ( 'yes' == $is_enabled && isset( $_REQUEST['wp-lostpassword-nonce'] ) && wp_verify_nonce( $nonce_value, 'wp-lostpassword-nonce' ) ) {

				if ( ! wp_verify_nonce( $nonce_value, 'wp-lostpassword-nonce' ) ) {

					if ( 'yes' == $use_v2_along_v3 ) {
					   set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_forgotpassword', '1', $i13_recapcha_v2_timeout );
					}


					$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Nonce verification failed', 'recaptcha-for-woocommerce' ) );
					return $validation_errors;

				}
				if ( isset( $_POST['i13_recaptcha_wp_lostpassword_token'] ) && ! empty( $_POST['i13_recaptcha_wp_lostpassword_token'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_wp_lostpassword_token'] );

					
											 
							 $verifyResponse = wp_remote_post(
														'https://challenges.cloudflare.com/turnstile/v0/siteverify',
														array(
																		'method' => 'POST',
																		'timeout' => 60,
																		'body' => array(
																						'secret' => $secret_key,
																						'response' => $response,
																		),
															)
														 );

					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

					 // Decode json data
					 $responseData = json_decode( $verifyResponse['body'] );

					 // If reCAPTCHA response is valid
						if ( ! $responseData->success ) {

							if ( 'yes' == $use_v2_along_v3 ) {
							  set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_forgotpassword', '1', $i13_recapcha_v2_timeout );
							}

							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

								 $validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
							} else {
								 $validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );
							}
						} else {

							if ( $responseData->action != $i13_recapcha_wp_lost_password_method_action_v3 ) {

								if ( 'yes' == $use_v2_along_v3 ) {
																			
																		set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_forgotpassword', '1', $i13_recapcha_v2_timeout );
								}
																		
								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

								  $validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
								} else {

																		$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );
								}
							}
						}
					} else {

						if ( 'yes' == $use_v2_along_v3 ) {
														set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_forgotpassword', '1', $i13_recapcha_v2_timeout );
						}

						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
						} else {

							   $validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_no_response );
						}
					}
										
										
					
				} else {

					if ( 'yes' == $use_v2_along_v3 ) {
						set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_forgotpassword', '1', $i13_recapcha_v2_timeout );
					}
					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) );
					} else {

						$validation_errors->add( 'cf_turnstile_error', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_blank );
					}
				}
			}
		}

		return $validation_errors;
	}

	public function get_gateway( ) {
			
				
		 $chosen_payment_method='';
		if (isset(WC()->session)) {
			if (WC()->session->has_session()) {
					
			   $chosen_payment_method = WC()->session->get('chosen_payment_method');
					
				
			}
		}

			return $chosen_payment_method;
	}
	public function i13_woocomm_validate_checkout_captcha( $fields, $validation_errors ) {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

		$nonce_value = '';
		if ( isset( $_REQUEST['woocommerce-process-checkout-nonce'] ) || isset( $_REQUEST['_wpnonce'] ) ) {

			if ( isset( $_REQUEST['woocommerce-process-checkout-nonce'] ) && ! empty( $_REQUEST['woocommerce-process-checkout-nonce'] ) ) {

				$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-process-checkout-nonce'] );
			} else if ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) {

				$nonce_value = sanitize_text_field( $_REQUEST['_wpnonce'] );
			}
		}
				$is_ppc_posted = false;
		if ( isset( $_REQUEST['wc-ajax'] ) && 'ppc-create-order' == sanitize_text_field( $_REQUEST['wc-ajax'] ) && '' == trim( $nonce_value ) ) {

			$json_params = file_get_contents( 'php://input' );
			if ( strlen( $json_params ) > 0 ) {

				$json_params = json_decode( $json_params, true );

				if ( json_last_error() === JSON_ERROR_NONE ) {

					if ( isset( $json_params['form'] ) && is_array( $json_params['form'] ) ) {

						 $posted_data_i13 = $json_params['form'];
												 $is_ppc_posted = true;
						if ( isset( $posted_data_i13['woocommerce-process-checkout-nonce'] ) && ! empty( $posted_data_i13['woocommerce-process-checkout-nonce'] ) ) {

									  $nonce_value = sanitize_text_field( $posted_data_i13['woocommerce-process-checkout-nonce'] );

						} else if ( isset( $posted_data_i13['_wpnonce'] ) && ! empty( $posted_data_i13['_wpnonce'] ) ) {

									$nonce_value = sanitize_text_field( $posted_data_i13['_wpnonce'] );
						}
					}
				}
			}
		}

				
				$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( ! $is_ppc_posted ) {
			if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_checkout_token_v2'])) {

				$reCapcha_version='v2';
			}
		} else {
					
			if ( 'yes' == $use_v2_along_v3 && isset($posted_data_i13) && isset($posted_data_i13['i13_recaptcha_checkout_token_v2'])) {

					  $reCapcha_version='v2';
			}
		}

				$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}
				
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$i13_recaptcha_v3_login_recpacha_for_req_btn = get_option( 'i13_recaptcha_v3_login_recpacha_for_req_btn' );
			$captcha_lable = get_option( 'i13_recapcha_guestcheckout_title' );
			if ( '' == trim( $captcha_lable ) ) {

				$captcha_lable = 'captcha';
			}
			if ( '' == $i13_recaptcha_v3_login_recpacha_for_req_btn ) {
				$i13_recaptcha_v3_login_recpacha_for_req_btn = 'no';
			}
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );
			$i13_recapcha_checkout_timeout = get_option( 'i13_turnstile_checkout_timeout' );
			if ( null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout ) {

				$i13_recapcha_checkout_timeout = 3;
			}
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_guestcheckout' );
			$is_enabled_logincheckout = get_option( 'i13_recapcha_enable_on_logincheckout' );

			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', '<strong>' . ucfirst( $captcha_lable ) . '</strong>', $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', '<strong>' . $captcha_lable . '</strong>', $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', '<strong>' . $captcha_lable . '</strong>', $recapcha_error_msg_captcha_invalid );

			if ( 'yes' == $is_enabled && '' != $nonce_value && ! is_user_logged_in() ) {

				if ( wp_verify_nonce( $nonce_value, 'woocommerce-process_checkout' ) ) {

					if ( ! $is_ppc_posted ) {

						$posted_data_i13 = isset( $_POST ) ? $_POST : array();
					}

					$i13_recaptcha_login_recpacha_for_req_btn = get_option( 'i13_recaptcha_login_recpacha_for_req_btn' );
					if ( '' == $i13_recaptcha_login_recpacha_for_req_btn ) {
						$i13_recaptcha_login_recpacha_for_req_btn = 'no';
					}
					if ( 'no' == $i13_recaptcha_login_recpacha_for_req_btn ) {

						$payment_method=wc_clean($this->get_gateway());
						if (  ! empty( $payment_method ) ) {

							if ( false !== stripos( $payment_method, 'apple_pay' ) || false !== stripos( $payment_method, 'applepay' ) || false !== stripos( $payment_method, 'googlepay' ) || false !== stripos( $payment_method, 'google_pay' ) || false !== stripos( $payment_method, 'payment_request_api' ) || false !== stripos( $payment_method, 'Apple Pay' ) ||  false !== stripos( $payment_method, 'Google Pay' ) || false !== stripos( $payment_method, 'Payment Request (Stripe)' ) ) {

								return $validation_errors;
							}
						}
					}

					if ( 'yes' == get_transient( $nonce_value ) ) {

						return $validation_errors;
					}

					if ( isset( $posted_data_i13['i13_recaptcha_checkout_token_v2'] ) && ! empty( $posted_data_i13['i13_recaptcha_checkout_token_v2'] ) ) {

						// Google reCAPTCHA API secret key
						$response = sanitize_text_field( $posted_data_i13['i13_recaptcha_checkout_token_v2'] );

						 
														 
							   // Verify the reCAPTCHA response
							   $verifyResponse = wp_remote_post(
															'https://challenges.cloudflare.com/turnstile/v0/siteverify',
															array(
																			'method' => 'POST',
																			'timeout' => 60,
																			'body' => array(
																							'secret' => $secret_key,
																							'response' => $response,
																			),
																)
															 );

						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

															// Decode json data
															$responseData = json_decode( $verifyResponse['body'] );

															// If reCAPTCHA response is valid
							if ( ! $responseData->success ) {

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

									$validation_errors->add( 'cf_turnstile_error', __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
								} else {
	$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_invalid );
								}
							} else {

																									delete_transient( 'i13_' . COOKIEHASH_I13 . '_woo_checkout');
								if ( 0 != $i13_recapcha_checkout_timeout ) {

																		 set_transient( $nonce_value, 'yes', ( $i13_recapcha_checkout_timeout * 60 ) );
								}
							}
						} else {

							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																$validation_errors->add( 'cf_turnstile_error', __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																	
							} else {
																	
																$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_no_response );
							}
						}
												
												
						
												
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							$validation_errors->add( 'cf_turnstile_error', __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
						} else {
							$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_blank );
						}
					}
				} else {
					$validation_errors->add( 'cf_turnstile_error', __( 'Could not verify request.', 'recaptcha-for-woocommerce' ) );
				}
								
								
								
			} else if ( 'yes' == $is_enabled_logincheckout && '' != $nonce_value && is_user_logged_in() ) {

				if ( wp_verify_nonce( $nonce_value, 'woocommerce-process_checkout' ) ) {

					if ( ! $is_ppc_posted ) {

						$posted_data_i13 = isset( $_POST ) ? $_POST : array();
					}
					$i13_recaptcha_login_recpacha_for_req_btn = get_option( 'i13_recaptcha_login_recpacha_for_req_btn' );
					if ( '' == $i13_recaptcha_login_recpacha_for_req_btn ) {
						$i13_recaptcha_login_recpacha_for_req_btn = 'no';
					}
					if ( 'no' == $i13_recaptcha_login_recpacha_for_req_btn ) {

						$payment_method=wc_clean($this->get_gateway());
						if (  ! empty( $payment_method ) ) {


							if ( false !== stripos( $payment_method, 'apple_pay' ) || false !== stripos( $payment_method, 'applepay' ) || false !== stripos( $payment_method, 'googlepay' ) || false !== stripos( $payment_method, 'google_pay' ) || false !== stripos( $payment_method, 'payment_request_api' ) || false !== stripos( $payment_method, 'Apple Pay' ) ||  false !== stripos( $payment_method, 'Google Pay' ) || false !== stripos( $payment_method, 'Payment Request (Stripe)' ) ) {

							return $validation_errors;
							}
						}
					}
					if ( 'yes' == get_transient( $nonce_value ) ) {

						return $validation_errors;
					}
					if ( isset( $posted_data_i13['i13_recaptcha_checkout_token_v2'] ) && ! empty( $posted_data_i13['i13_recaptcha_checkout_token_v2'] ) ) {

						// Google reCAPTCHA API secret key
						$response = sanitize_text_field( $posted_data_i13['i13_recaptcha_checkout_token_v2'] );

						
													
														 // Verify the reCAPTCHA response
							   $verifyResponse = wp_remote_post(
															'https://challenges.cloudflare.com/turnstile/v0/siteverify',
															array(
																			'method' => 'POST',
																			'timeout' => 60,
																			'body' => array(
																							'secret' => $secret_key,
																							'response' => $response,
																			),
																)
															 );

						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

															// Decode json data
															$responseData = json_decode( $verifyResponse['body'] );

							// If reCAPTCHA response is valid
							if ( ! $responseData->success ) {

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

									$validation_errors->add( 'cf_turnstile_error', __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
																				
								} else {
																			
									$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_invalid );
								}
							} else {

																									delete_transient( 'i13_' . COOKIEHASH_I13 . '_woo_checkout');
								if ( 0 != $i13_recapcha_checkout_timeout ) {

									set_transient( $nonce_value, 'yes', ( $i13_recapcha_checkout_timeout * 60 ) );
								}
							}
						} else {

							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																$validation_errors->add( 'cf_turnstile_error', __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																	
							} else {
																	
																$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_no_response );
							}
						}
												
												
						
												
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							$validation_errors->add( 'cf_turnstile_error', __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
						} else {
							$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_blank );
						}
					}
				} else {

					$validation_errors->add( 'cf_turnstile_error', __( 'Could not verify request.', 'recaptcha-for-woocommerce' ) );
				}
								
								
			}
		} else {

				$i13_recapcha_checkout_action_v3 = get_option( 'i13_recapcha_checkout_action_v3' );
			if ( '' == $i13_recapcha_checkout_action_v3 ) {

				$i13_recapcha_checkout_action_v3 = 'checkout';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
			$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
			$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_guestcheckout' );
			$i13_recapcha_enable_on_logincheckout = get_option( 'i13_recapcha_enable_on_logincheckout' );

			$i13_recapcha_checkout_timeout = get_option( 'i13_turnstile_checkout_timeout' );
			if ( null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout ) {

				$i13_recapcha_checkout_timeout = 3;
			}

			if ( ( 'yes' == $is_enabled && '' != $nonce_value && ! is_user_logged_in() ) || ( 'yes' == $i13_recapcha_enable_on_logincheckout && '' != $nonce_value && is_user_logged_in() ) ) {

				if ( wp_verify_nonce( $nonce_value, 'woocommerce-process_checkout' ) ) {

					if ( ! $is_ppc_posted ) {

						$posted_data_i13 = isset( $_POST ) ? $_POST : array();
					}
					if ( 'yes' == get_transient( $nonce_value ) ) {

						return $validation_errors;
					}

					$i13_recaptcha_v3_login_recpacha_for_req_btn = get_option( 'i13_recaptcha_v3_login_recpacha_for_req_btn' );
					if ( '' == $i13_recaptcha_v3_login_recpacha_for_req_btn ) {
							$i13_recaptcha_v3_login_recpacha_for_req_btn = 'no';
					}
					if ( 'no' == $i13_recaptcha_v3_login_recpacha_for_req_btn ) {

						$payment_method=wc_clean($this->get_gateway());
												
						if (  ! empty( $payment_method ) ) {


							if ( false !== stripos( $payment_method, 'apple_pay' ) || false !== stripos( $payment_method, 'applepay' ) || false !== stripos( $payment_method, 'googlepay' ) || false !== stripos( $payment_method, 'google_pay' ) || false !== stripos( $payment_method, 'payment_request_api' ) || false !== stripos( $payment_method, 'Apple Pay' ) ||  false !== stripos( $payment_method, 'Google Pay' ) || false !== stripos( $payment_method, 'Payment Request (Stripe)' ) ) {

															  return $validation_errors;
							}
						}
					}

					$i13_checkout_token = '';
					if ( isset( $_POST['i13_recaptcha_checkout_token'] ) || isset( $_POST['i13_recaptcha_checkout_token_fallback'] ) ) {

						if ( isset( $_POST['i13_recaptcha_checkout_token'] ) && ! empty( $_POST['i13_recaptcha_checkout_token'] ) ) {

													$i13_checkout_token = sanitize_text_field( $_POST['i13_recaptcha_checkout_token'] );

						} else if ( isset( $_POST['i13_recaptcha_checkout_token_fallback'] ) && ! empty( $_POST['i13_recaptcha_checkout_token_fallback'] ) ) {

													$i13_checkout_token = sanitize_text_field( $_POST['i13_recaptcha_checkout_token_fallback'] );
						}
					}

					if ( isset( $i13_checkout_token ) && ! empty( $i13_checkout_token ) ) {
											
						
											
							// Google reCAPTCHA API secret key

														   $verifyResponse = wp_remote_post(
													'https://challenges.cloudflare.com/turnstile/v0/siteverify',
													array(
																	'method' => 'POST',
																	'timeout' => 60,
																	'body' => array(
																					'secret' => $secret_key,
																					'response' => $i13_checkout_token,
																	),
														)
													 );

						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

															// Decode json data
															$responseData = json_decode( $verifyResponse['body'] );

															// If reCAPTCHA response is valid
							if ( ! $responseData->success ) {

								$reload=0;
								if ( 'yes' == $use_v2_along_v3 ) {
																			   $reload=1; 
									   set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_checkout', '1', $i13_recapcha_v2_timeout );
								}

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

									$validation_errors->add( 'cf_turnstile_error', '<span data-reload="' . $reload . '" id="cf-recaptcha_error_v3"></span>' . __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
								} else {
									$validation_errors->add( 'cf_turnstile_error', '<span data-reload="' . $reload . '" id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid );
								}
							} else {

								if ( $responseData->action != $i13_recapcha_checkout_action_v3 ) {

									$reload=0;
									if ( 'yes' == $use_v2_along_v3 ) {
																				$reload=1;
																				set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_checkout', '1', $i13_recapcha_v2_timeout );
									}
									if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

										$validation_errors->add( 'cf_turnstile_error', '<span data-reload="' . $reload . '"  id="cf-recaptcha_error_v3"></span>' . __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
									} else {

										$validation_errors->add( 'cf_turnstile_error', '<span  data-reload="' . $reload . '"  id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid );
									}
								} else {

																				
									if ( 'yes' == $use_v2_along_v3 ) {
									   set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_checkout', '1', $i13_recapcha_v2_timeout );
									}
									if ( 0 != $i13_recapcha_checkout_timeout ) {

										set_transient( $nonce_value, 'yes', ( $i13_recapcha_checkout_timeout * 60 ) );
									}
								}
							}
						} else {

							$reload=0;    
							if ( 'yes' == $use_v2_along_v3 ) {
																	
																set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_checkout', '1', $i13_recapcha_v2_timeout );
																$reload=1;
							}
							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

								$validation_errors->add( 'cf_turnstile_error', '<span data-reload="' . $reload . '"  id="cf-recaptcha_error_v3"></span>' . __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
							} else {

								$validation_errors->add( 'cf_turnstile_error', '<span data-reload="' . $reload . '"  id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_no_response );
							}
						}
												
												
						
												
					} else {

						$reload=0;
						if ( 'yes' == $use_v2_along_v3 ) {
							set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_checkout', '1', $i13_recapcha_v2_timeout );
							$reload=1;
						}
						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {
													
													$validation_errors->add( 'cf_turnstile_error', '<span data-reload="' . $reload . '"  id="cf-recaptcha_error_v3"></span>' . __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) );
													
						} else {

							$validation_errors->add( 'cf_turnstile_error', '<span  data-reload="' . $reload . '"  id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_blank );
						}
					}
				} else {

					$validation_errors->add( 'cf_turnstile_error', '<span id="cf-recaptcha_error_v3"></span>' . __('Could not verify request.', 'recaptcha-for-woocommerce' ) );
				}
			}
		}

		return $validation_errors;
	}

	public function i13_woocomm_validate_lostpassword_captcha( $validation_errors ) {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

		$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_woo_lp_token_v2'])) {

			$reCapcha_version='v2';
		}

		$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_lostpassword' );
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );

			$captcha_lable = get_option( 'i13_recapcha_lostpassword_title' );
			if ( '' == trim( $captcha_lable ) ) {

				$captcha_lable = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

			$nonce_value = '';
			if ( isset( $_REQUEST['woocommerce-lost-password-nonce'] ) || isset( $_REQUEST['_wpnonce'] ) || isset( $_REQUEST['woocommerce-reset-password-nonce'] ) ) {

				if ( isset( $_REQUEST['woocommerce-lost-password-nonce'] ) && ! empty( $_REQUEST['woocommerce-lost-password-nonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-lost-password-nonce'] );
				} else if ( isset( $_REQUEST['woocommerce-reset-password-nonce'] ) && ! empty( $_REQUEST['woocommerce-reset-password-nonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-reset-password-nonce'] );
				} else if ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['_wpnonce'] );
				}
			}
			if ( 'yes' == $is_enabled && isset( $_POST['wc_reset_password'] ) ) {

				if ( wp_verify_nonce( $nonce_value, 'lost_password' ) || wp_verify_nonce( $nonce_value, 'reset_password' ) ) {

					if ( isset( $_POST['i13_recaptcha_woo_lp_token_v2'] ) && ! empty( $_POST['i13_recaptcha_woo_lp_token_v2'] ) ) {
						// Google reCAPTCHA API secret key
						$response = sanitize_text_field( $_POST['i13_recaptcha_woo_lp_token_v2'] );

												// Verify the reCAPTCHA response
												  $verifyResponse = wp_remote_post(
														 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
														 array(
																		 'method' => 'POST',
																		 'timeout' => 60,
																		 'body' => array(
																						 'secret' => $secret_key,
																						 'response' => $response,
																		 ),
														 )
													);        

						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

															// Decode json data
															$responseData = json_decode( $verifyResponse['body'] );

															// If reCAPTCHA response is valid
							if ( ! $responseData->success ) {

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

									$validation_errors->add( 'cf_turnstile_error', __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
								} else {
										
																		$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_invalid );
								}
							} else {

									delete_transient( 'i13_' . COOKIEHASH_I13 . '_woo_lostpass');
							}
						} else {

							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																$validation_errors->add( 'cf_turnstile_error', __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																	
							} else {
																	
																	$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_no_response );
							}
						}
												
						
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							$validation_errors->add( 'cf_turnstile_error', __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
						} else {
							$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_blank );
						}
					}
				} else {

					$validation_errors->add( 'cf_turnstile_error', __( 'Could not verify request.', 'recaptcha-for-woocommerce' ) );
				}
								
								
			}
		} else {

			$i13_recapcha_lostpassword_action_v3 = get_option( 'i13_recapcha_lostpassword_action_v3' );
			if ( '' == $i13_recapcha_lostpassword_action_v3 ) {

				$i13_recapcha_lostpassword_action_v3 = 'forgot_password';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
			$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
			$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_lostpassword' );
			$nonce_value = '';
			if ( isset( $_REQUEST['woocommerce-lost-password-nonce'] ) || isset( $_REQUEST['_wpnonce'] ) || isset( $_REQUEST['woocommerce-reset-password-nonce'] ) ) {

				if ( isset( $_REQUEST['woocommerce-lost-password-nonce'] ) && ! empty( $_REQUEST['woocommerce-lost-password-nonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-lost-password-nonce'] );
				} else if ( isset( $_REQUEST['woocommerce-reset-password-nonce'] ) && ! empty( $_REQUEST['woocommerce-reset-password-nonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-reset-password-nonce'] );
				} else if ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['_wpnonce'] );
				}
			}
			if ( 'yes' == $is_enabled && isset( $_POST['wc_reset_password'] ) && ( wp_verify_nonce( $nonce_value, 'lost_password' ) || wp_verify_nonce( $nonce_value, 'reset_password' ) ) ) {

				if ( isset( $_POST['i13_recaptcha_woo_fp_token'] ) && ! empty( $_POST['i13_recaptcha_woo_fp_token'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_woo_fp_token'] );

					
											 
						  // Verify the reCAPTCHA response
												  $verifyResponse = wp_remote_post(
														 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
														 array(
																		 'method' => 'POST',
																		 'timeout' => 60,
																		 'body' => array(
																						 'secret' => $secret_key,
																						 'response' => $response,
																		 ),
														 )
													);      

					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

						 // Decode json data
						 $responseData = json_decode( $verifyResponse['body'] );

						 // If reCAPTCHA response is valid
						if ( ! $responseData->success ) {

							if ( 'yes' == $use_v2_along_v3 ) {
																	
																set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_lostpass', '1', $i13_recapcha_v2_timeout );
							}
							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

								$validation_errors->add( 'cf_turnstile_error', __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
																		
							} else {
									
																$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_invalid );
							}
						} else {

							if ( $responseData->action != $i13_recapcha_lostpassword_action_v3 ) {

								if ( 'yes' == $use_v2_along_v3 ) {
																		set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_lostpass', '1', $i13_recapcha_v2_timeout );
								}
								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																			$validation_errors->add( 'cf_turnstile_error', __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
								} else {

																			$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_invalid );
								}
							}
						}
					} else {

						if ( 'yes' == $use_v2_along_v3 ) {
														set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_lostpass', '1', $i13_recapcha_v2_timeout );
						}
						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

														$validation_errors->add( 'cf_turnstile_error', __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
															
						} else {

														 $validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_no_response );
						}
					}
										
					
									
				} else {

					if ( 'yes' == $use_v2_along_v3 ) {
						set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_lostpass', '1', $i13_recapcha_v2_timeout );
					}
					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						$validation_errors->add( 'cf_turnstile_error', __( 'Turnstile captcha token is missing.', 'recaptcha-for-woocommerce' ) );
					} else {

						$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_blank );
					}
				}
			}
		}

		return $validation_errors;
	}

	public function i13_woocomm_validate_login_captcha( $validation_errors, $username, $password ) {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

		$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_woo_login_token_v2'])) {

			$reCapcha_version='v2';
		}
				
		$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );

			$captcha_lable = get_option( 'i13_recapcha_login_title' );
			if ( '' == trim( $captcha_lable ) ) {

				$captcha_lable = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_login' );

			$nonce_value = '';
			if ( isset( $_REQUEST['woocommerce-login-nonce'] ) || isset( $_REQUEST['_wpnonce'] ) ) {

				if ( isset( $_REQUEST['woocommerce-login-nonce'] ) && ! empty( $_REQUEST['woocommerce-login-nonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-login-nonce'] );
				} else if ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['_wpnonce'] );
				}
			}
			if ( 'yes' == $is_enabled && isset( $_POST['username'] ) ) {

				if ( wp_verify_nonce( $nonce_value, 'woocommerce-login' ) ) {
					if ( isset( $_POST['i13_recaptcha_woo_login_token_v2'] ) && ! empty( $_POST['i13_recaptcha_woo_login_token_v2'] ) ) {
						// Google reCAPTCHA API secret key
						$response = sanitize_text_field( $_POST['i13_recaptcha_woo_login_token_v2'] );

						
													 
							// Verify the reCAPTCHA response
							 $verifyResponse = wp_remote_post(
														'https://challenges.cloudflare.com/turnstile/v0/siteverify',
														array(
																		'method' => 'POST',
																		'timeout' => 60,
																		'body' => array(
																						'secret' => $secret_key,
																						'response' => $response,
																		),
															)
														 );
						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

															// Decode json data
															$responseData = json_decode( $verifyResponse['body'] );

															// If reCAPTCHA response is valid
							if ( ! $responseData->success ) {

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

									$validation_errors->add( 'cf_turnstile_error', __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
																				
								} else {
																			
																			$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_invalid );
								}
							} else {

								delete_transient( 'i13_' . COOKIEHASH_I13 . '_woo_login');
							}

						} else {

							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																$validation_errors->add( 'cf_turnstile_error', __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																	
							} else {
																		
									  $validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_no_response );
							}
						}
												
						
												
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							$validation_errors->add( 'cf_turnstile_error', __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
						} else {
							$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_blank );
						}
					}
				} else {

					$validation_errors->add( 'cf_turnstile_error', __( 'Could not verify request.', 'recaptcha-for-woocommerce' ) );
				}
								
								
			}
		} else {

			$i13_recapcha_login_action_v3 = get_option( 'i13_recapcha_login_action_v3' );
			if ( '' == $i13_recapcha_login_action_v3 ) {

				$i13_recapcha_login_action_v3 = 'login';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
			$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
			$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_login' );
			$nonce_value = '';
			if ( isset( $_REQUEST['woocommerce-login-nonce'] ) || isset( $_REQUEST['_wpnonce'] ) ) {

				if ( isset( $_REQUEST['woocommerce-login-nonce'] ) && ! empty( $_REQUEST['woocommerce-login-nonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-login-nonce'] );
										
				} else if ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['_wpnonce'] );
										
				}
			}
			if ( 'yes' == $is_enabled && isset( $_POST['username'] ) && wp_verify_nonce( $nonce_value, 'woocommerce-login' ) ) {

				if ( isset( $_POST['i13_recaptcha_woo_login_token'] ) && ! empty( $_POST['i13_recaptcha_woo_login_token'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_woo_login_token'] );
											
													$verifyResponse = wp_remote_post(
																 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
																 array(
																				 'method' => 'POST',
																				 'timeout' => 60,
																				 'body' => array(
																								 'secret' => $secret_key,
																								 'response' => $response,
																				 ),
																 )
												 );

					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

							// Decode json data
							$responseData = json_decode( $verifyResponse['body'] );

							// If reCAPTCHA response is valid
						if ( ! $responseData->success ) {

							if ( 'yes' == $use_v2_along_v3 ) {
							   set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_login', '1', $i13_recapcha_v2_timeout );
							}

							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

									$validation_errors->add( 'cf_turnstile_error', __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
							} else {
									$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_invalid );
							}
						} else {

							if ( $responseData->action != $i13_recapcha_login_action_v3 ) {

								if ( 'yes' == $use_v2_along_v3 ) {
									set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_login', '1', $i13_recapcha_v2_timeout );
								}

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

									$validation_errors->add( 'cf_turnstile_error', __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
								} else {

	$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_invalid );
								}
							}
						}
					} else {

						if ( 'yes' == $use_v2_along_v3 ) {
							set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_login', '1', $i13_recapcha_v2_timeout );
						}

						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

														$validation_errors->add( 'cf_turnstile_error', __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
						} else {

														  $validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_no_response );
						}
					}
										
					
											
				} else {

					if ( 'yes' == $use_v2_along_v3 ) {
						 set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_login', '1', $i13_recapcha_v2_timeout );
					}

					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						$validation_errors->add( 'cf_turnstile_error', __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) );
					} else {

						$validation_errors->add( 'cf_turnstile_error', $recapcha_error_msg_captcha_blank );
					}
				}
			}
		}

		return $validation_errors;
	}

	public function i13_woo_wp_verify_login_captcha( $user, $password ) {
			
		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

				$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_wp_login_token_v2'])) {

			$reCapcha_version='v2';
		}
				
				$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wplogin' );

			$captcha_lable = get_option( 'i13_recapcha_wplogin_title' );
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

			$nonce_value = isset( $_REQUEST['wp-login-nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['wp-login-nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
			if ( 'yes' == $is_enabled && isset( $_POST['pwd'] ) && ! ( $this->isWordFenceActive() && isset( $_POST['action'] ) && 'wordfence_ls_authenticate' == $_POST['action'] ) && ( ! isset( $_POST['form'] ) || ( isset( $_POST['form'] ) && 'sensei-login' != $_POST['form'] ) ) ) {

				if ( ! wp_verify_nonce( $nonce_value, 'wp-login-nonce' ) ) {

					return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Nonce verification failed.', 'recaptcha-for-woocommerce' ) );

				}

				if ( isset( $_POST['i13_recaptcha_wp_login_token_v2'] ) && ! empty( $_POST['i13_recaptcha_wp_login_token_v2'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_wp_login_token_v2'] );

							
												$verifyResponse = wp_remote_post(
										  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
										  array(
												  'method' => 'POST',
												  'timeout' => 60,
												  'body' => array(
														  'secret' => $secret_key,
														  'response' => $response,
												  ),
										  )
								  );
						
					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

											// Decode json data
											$responseData = json_decode( $verifyResponse['body'] );

											// If reCAPTCHA response is valid
						if ( isset($responseData->success) &&  $responseData->success ) {

														delete_transient( 'i13_' . COOKIEHASH_I13 . '_wp_login');
															   
						} else {

							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

															  return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
							} else {
																		return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );
							}

																
						}
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

						return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
						} else {
							return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_no_response );
						}
					}
					 
				} else {

					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
					} else {
						return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_blank );
					}
				}
								
								
								
			}
		} else {

			
			$i13_recapcha_wp_login_action_v3 = get_option( 'i13_recapcha_wp_login_action_v3' );
			if ( '' == $i13_recapcha_wp_login_action_v3 ) {

				$i13_recapcha_wp_login_action_v3 = 'wp_login';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
			$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
			$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wplogin' );
			$nonce_value = isset( $_REQUEST['wp-login-nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['wp-login-nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
			if ( 'yes' == $is_enabled && isset( $_POST['pwd'] ) && ! ( $this->isWordFenceActive() && isset( $_POST['action'] ) && 'wordfence_ls_authenticate' == $_POST['action'] ) && ( ! isset( $_POST['form'] ) || ( isset( $_POST['form'] ) && 'sensei-login' != $_POST['form'] ) ) ) {

				if ( ! wp_verify_nonce( $nonce_value, 'wp-login-nonce' ) ) {

					return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Nonce verification failed.', 'recaptcha-for-woocommerce' ) );

				}
				if ( isset( $_POST['i13_recaptcha_wp_login_token'] ) && ! empty( $_POST['i13_recaptcha_wp_login_token'] ) ) {
					// Google reCAPTCHA API secret key
					$response = sanitize_text_field( $_POST['i13_recaptcha_wp_login_token'] );

										// Verify the reCAPTCHA response
										$verifyResponse = wp_remote_post(
														'https://challenges.cloudflare.com/turnstile/v0/siteverify',
														array(
																		'method' => 'POST',
																		'timeout' => 60,
																		'body' => array(
																						'secret' => $secret_key,
																						'response' => $response,
																		),
														)
										);
									   
					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {


					  // Decode json data
					  $responseData = json_decode( $verifyResponse['body'] );
										   
					  // If reCAPTCHA response is valid
						if ( ! $responseData->success ) {

							if ( 'yes' == $use_v2_along_v3 ) {
					 set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_login', '1', $i13_recapcha_v2_timeout );
							}

							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

							return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
							} else {
				   return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );
							}
						} else {

							if (  $responseData->action != $i13_recapcha_wp_login_action_v3 ) {

								if ( 'yes' == $use_v2_along_v3 ) {
														set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_login', '1', $i13_recapcha_v2_timeout );
								}
								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

														return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Turnstile captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
								} else {
													return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_invalid );
								}
							}
						}


					} else {

						if ( 'yes' == $use_v2_along_v3 ) {
												  set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_login', '1', $i13_recapcha_v2_timeout );
						}
						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

												   return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
						} else {
								return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_no_response );
						}
					}


					 

				} else {
									
									
					if ( 'yes' == $use_v2_along_v3 ) {
						set_transient( 'i13_' . COOKIEHASH_I13 . '_wp_login', '1', $i13_recapcha_v2_timeout );
					}

					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) );
					} else {
						return new WP_Error( 'Captcha Invalid', '<strong>' . __( 'ERROR:', 'recaptcha-for-woocommerce' ) . '</strong> ' . $recapcha_error_msg_captcha_blank );
					}
				}
			}
		}

		return $user;
	}

	
		
		
	public function i13_load_blocks_type_package() {
		if ( class_exists( '\Automattic\WooCommerce\Blocks\Package' ) && class_exists( '\Automattic\WooCommerce\Blocks\BlockTypesController' ) ) { 
				  \Automattic\WooCommerce\Blocks\Package::container()->get( \Automattic\WooCommerce\Blocks\BlockTypesController::class );
		}
	}
			
	public function i13_is_payment_request_btn($arrdata) {
		 
		$is_pay_req_btn=false;
		if (isset($arrdata['payment_method'])) {
				
			if (stripos($arrdata['payment_method'], 'googlepay')!==false) {
					
				$is_pay_req_btn=true;
			} else if (stripos($arrdata['payment_method'], 'applepay')!==false) {
					
				$is_pay_req_btn=true;
			} else if (stripos($arrdata['payment_method'], 'wcpay')!==false) {
					
				$is_pay_req_btn=true;
			}
		}
			
		return $is_pay_req_btn;
			
	}
		
	
	public function i13_woo_verify_add_payment_method() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

				$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
				$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {
					
			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}
				
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_woo_payment_method_token_v2'])) {

			$reCapcha_version='v2';
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			if ( isset( $_POST['woocommerce_add_payment_method'] ) && ( isset( $_REQUEST['woocommerce-add-payment-method-nonce'] ) || isset( $_REQUEST['_wpnonce'] ) ) ) {

				$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
				$is_enabled = get_option( 'i13_recapcha_enable_on_addpaymentmethod' );
				$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
				$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
				$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );
				$captcha_lable = trim( get_option( 'i13_recapcha_addpaymentmethod_title' ) );
				if ( '' == $captcha_lable ) {

					$captcha_lable = 'captcha';
				}
				$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
				$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
				$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

				if ( 'yes' == $is_enabled && isset( $_POST['woocommerce_add_payment_method'] ) && isset( $_POST['payment_method'] ) ) {

					if ( isset( $_REQUEST['woocommerce-add-payment-method-nonce'] ) && ! empty( $_REQUEST['woocommerce-add-payment-method-nonce'] ) ) {

						$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-add-payment-method-nonce'] ); // @codingStandardsIgnoreLine.
					} else if ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) {

						$nonce_value = sanitize_text_field( $_REQUEST['_wpnonce'] ); // @codingStandardsIgnoreLine.
					}
					if ( ! empty( $nonce_value ) ) {

						if ( wp_verify_nonce( $nonce_value, 'woocommerce-add-payment-method' ) ) {

							if ( isset( $_POST['i13_recaptcha_woo_payment_method_token_v2'] ) && ! empty( $_POST['i13_recaptcha_woo_payment_method_token_v2'] ) ) {

								// Google reCAPTCHA API secret key
								$response = sanitize_text_field( $_POST['i13_recaptcha_woo_payment_method_token_v2'] );

								
																
																	  // Verify the reCAPTCHA response
																		$verifyResponse = wp_remote_post(
																		   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
																		   array(
																						   'method' => 'POST',
																						   'timeout' => 60,
																						   'body' => array(
																										   'secret' => $secret_key,
																										   'response' => $response,
																						   ),
																			   )
																			);
								if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

																			// Decode json data
																			$responseData = json_decode( $verifyResponse['body'] );

																			// If reCAPTCHA response is valid
									if ( ! $responseData->success ) {

										if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																							wc_add_notice( __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
																							return false;
																								
										} else {
																							
																							wc_add_notice( $recapcha_error_msg_captcha_invalid );
																							return false;
										}
									} else {


											delete_transient( 'i13_' . COOKIEHASH_I13 . '_woo_add_payment_method');
									}
								} else {

									if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																				wc_add_notice( __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																				return false;
																					
									} else {
																					
																					wc_add_notice( $recapcha_error_msg_captcha_no_response, 'error' );
																					return false;
									}
								}
								
																
							} else {

								if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

									wc_add_notice( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ), 'error' );
									return false;
								} else {
																	
									wc_add_notice( $recapcha_error_msg_captcha_blank, 'error' );
									return false;
								}
							}
						} else {

							wc_add_notice( __( 'Could not verify request.', 'recaptcha-for-woocommerce' ), 'error' );
							return false;
						}
					}
				}
			}
		} else {

			if ( isset( $_POST['woocommerce_add_payment_method'] ) && ( isset( $_REQUEST['woocommerce-add-payment-method-nonce'] ) || isset( $_REQUEST['_wpnonce'] ) ) ) {

				
				$i13_recapcha_add_payment_method_action_v3 = get_option( 'i13_recapcha_add_payment_method_action_v3' );
				if ( '' == $i13_recapcha_add_payment_method_action_v3 ) {

					$i13_recapcha_add_payment_method_action_v3 = 'add_payment_method';
				}

				$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
				$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
				$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
				$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
				$is_enabled = get_option( 'i13_recapcha_enable_on_addpaymentmethod' );

				$nonce_value = '';

				if ( 'yes' == $is_enabled && isset( $_POST['woocommerce_add_payment_method'] ) && isset( $_POST['payment_method'] ) ) {

					if ( isset( $_REQUEST['woocommerce-add-payment-method-nonce'] ) && ! empty( $_REQUEST['woocommerce-add-payment-method-nonce'] ) ) {

						$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-add-payment-method-nonce'] ); // @codingStandardsIgnoreLine.
					} else if ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) {

						$nonce_value = sanitize_text_field( $_REQUEST['_wpnonce'] ); // @codingStandardsIgnoreLine.
					}
					if ( ! empty( $nonce_value ) ) {

						if ( wp_verify_nonce( $nonce_value, 'woocommerce-add-payment-method' ) ) {

							if ( isset( $_POST['i13_recaptcha_woo_add_payment_method_token'] ) && ! empty( $_POST['i13_recaptcha_woo_add_payment_method_token'] ) ) {
								// Google reCAPTCHA API secret key
								$response = sanitize_text_field( $_POST['i13_recaptcha_woo_add_payment_method_token'] );

									   // Verify the reCAPTCHA response
																		   $verifyResponse = wp_remote_post(
																		   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
																		   array(
																						   'method' => 'POST',
																						   'timeout' => 60,
																						   'body' => array(
																										   'secret' => $secret_key,
																										   'response' => $response,
																						   ),
																			   )
																			);

								if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

									 // Decode json data
									 $responseData = json_decode( $verifyResponse['body'] );

									 // If reCAPTCHA response is valid
									if ( ! $responseData->success ) {

										if ( 'yes' == $use_v2_along_v3 ) {
																							
																						set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_add_payment_method', '1', $i13_recapcha_v2_timeout );
										}
										if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																							wc_add_notice( __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ), 'error' );
																							return false;
																								
										} else {

																							wc_add_notice( $recapcha_error_msg_captcha_invalid, 'error' );
																							return false;
										}
									} else {

										if ( $responseData->action != $i13_recapcha_add_payment_method_action_v3 ) {

											if ( 'yes' == $use_v2_along_v3 ) {
																									
																								set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_add_payment_method', '1', $i13_recapcha_v2_timeout );
											}
											if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																								wc_add_notice( __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ), 'error' );
																								return false;
																									
											} else {

																								wc_add_notice( $recapcha_error_msg_captcha_invalid, 'error' );
																								return false;
											}
										}
									}
								} else {

									if ( 'yes' == $use_v2_along_v3 ) {
																					
																				set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_add_payment_method', '1', $i13_recapcha_v2_timeout );
									}
									if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																					wc_add_notice( __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ), 'error' );
																					return false;
																						
									} else {

																				wc_add_notice( $recapcha_error_msg_captcha_no_response, 'error' );
																				return false;
									}
								}
								
																 
							} else {

								if ( 'yes' == $use_v2_along_v3 ) {
									set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_add_payment_method', '1', $i13_recapcha_v2_timeout );
								}
								if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

									wc_add_notice( __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ), 'error' );
									return false;
								} else {

									wc_add_notice( $recapcha_error_msg_captcha_blank, 'error' );
									return false;
								}
							}
						}
					}
				}
			}
		}

		return true;
	}

	public function i13_woo_page_load_hook_method() {

		global $woocommerce;
		global $wp;
		$is_checkout_js_enabled = false;
		$is_oder_pay_page = false;

		if ( function_exists( 'is_product' ) && is_product() ) {

			add_filter( 'woocommerce_product_review_comment_form_args', array( $this, 'i13_recapcha_for_review_form' ), 10, 1 );
		} else {

			add_action( 'comment_form_logged_in_after', array( $this, 'i13_woo_add_comment_form_captcha' ) );
			add_action( 'comment_form_after_fields', array( $this, 'i13_woo_add_comment_form_captcha' ) );
		}

		if ( function_exists( 'is_page' ) && function_exists( 'wc_get_page_id' ) && is_page( wc_get_page_id( 'checkout' ) ) && 0 < get_query_var( 'order-pay' ) && isset( $_GET['pay_for_order'], $_GET['key'] ) ) {
			$is_oder_pay_page = true;
		}

		$page_id = 0;
		if ( function_exists( 'wc_get_page_id' ) ) {

			$page_id = wc_get_page_id( 'myaccount' );
		}

		$is_add_payment_method = ( $page_id && is_page( $page_id ) && ( isset( $wp->query_vars['payment-methods'] ) || isset( $wp->query_vars['add-payment-method'] ) ) );
		if ( version_compare( $woocommerce->version, '4.3', '>=' ) ) {

			add_action( 'woocommerce_add_payment_method_form_bottom', array( $this, 'i13_woo_add_payment_method_new' ) );
		} else {

			add_action( 'wp_footer', array( $this, 'i13_woo_add_payment_method' ) );
		}
		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

		if ( class_exists( 'wc_elavon_converge' ) && method_exists( 'wc_elavon_converge', 'get_gateway' ) && ! $is_oder_pay_page && ! $is_add_payment_method ) {

			$obj = wc_elavon_converge()->get_gateway( 'elavon_converge_credit_card' );
			if ( is_object( $obj ) && ! empty( $obj ) ) {
				if ( method_exists( $obj, 'is_checkout_js_enabled' ) ) {

					$is_checkout_js_enabled = $obj->is_checkout_js_enabled();
				}
			}
		}

		if ( $is_checkout_js_enabled ) {

			add_action( 'wc_elavon_converge_credit_card_payment_form_end', array( $this, 'i13_trigger_woo_recaptcha_action_for_recaptcha' ) );
		}
	}

	public function i13_woo_add_payment_method_new() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
				
				
		if ('v3'==strtolower($reCapcha_version)) {

			   $use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_woo_add_payment_method')) {

				  $reCapcha_version='v2';
				}
			}
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$is_enabled = get_option( 'i13_recapcha_enable_on_addpaymentmethod' );
			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_paymentmethod' );
			$captcha_lable = get_option( 'i13_recapcha_addpaymentmethod_title' );
			$i13_recapcha_hide_label_addpayment = get_option( 'i13_recapcha_hide_label_addpayment' );
			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_addpaymentmethod_theme' );
			$size = trim( get_option( 'i13_recapcha_addpaymentmethod_size' ) );
			if ( '' == $captcha_lable ) {

				$captcha_lable = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
						$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );
						
			if ( 'yes' == $is_enabled && is_user_logged_in() ) {
							
				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {

								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );

								break;
							}
						}
					}
				}
				?>


				<div class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">   
				<?php if ( 'yes' != $i13_recapcha_hide_label_addpayment ) : ?>
						<label for="cf-recaptcha-payment-method">
					<?php echo esc_html( __( 'Captcha', 'recaptcha-for-woocommerce' ) ); ?>&nbsp;<span class="required">*</span>
						</label><?php endif; ?>
					<div id="cf-recaptcha-payment-method" name="cf-recaptcha-payment-method" class="cf-recaptcha-payment-method" data-callback="verifyCallback_add_payment_method"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>"  data-response-field="false" data-response-field-name="i13_recaptcha_woo_payment_method_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
				</div>
				<!-- do_not_format_javascript --><script type="text/javascript">

				  function intval_payment_method_new_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_payment_method_new_ready(' + f + ')', 9) : f()
					}
					
				  var myCaptcha_payment_method = null;
				  var verifyCallback_add_payment_method=null;
				  intval_payment_method_new_ready(function () {

							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
										jQuery("#place_order").attr("disabled", true);
								<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
											jQuery("#place_order").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
							<?php else : ?>
											jQuery("#place_order").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
							<?php endif; ?>


						<?php endif; ?>
						<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
								jQuery('#add_payment_method').submit(function () {
									if (myCaptcha_payment_method==null || turnstile.getResponse(myCaptcha_payment_method) == "") {


									<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
										alert("<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
									<?php else : ?>
										alert("<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
									<?php endif; ?>

										location.reload();
										return false;

									} else {


										return true;
									}
								});
				<?php endif; ?>

							 verifyCallback_add_payment_method = function (response) {

								if (response.length !== 0) {

																		<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
										jQuery("#place_order").removeAttr("title");
										jQuery("#place_order").attr("disabled", false);
																		<?php endif; ?>

									if (typeof add_payment_method_recaptcha_verified === "function") {

										add_payment_method_recaptcha_verified(response);
									}
								}

							};


														if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined' && myCaptcha_payment_method === null) {    

																i13_pm_renderReCaptchaV2();
														}
														else{


																		  jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=i13_pm_renderReCaptchaV2", function() {



																				});
														}
							

								








						
					});
										
									function i13_pm_renderReCaptchaV2(){


														  try{
																		myCaptcha_payment_method= window.turnstile.render('.cf-recaptcha-payment-method', {
																		'sitekey': '<?php echo esc_html( $site_key ); ?>',
																		 'callback' : verifyCallback_add_payment_method,
																		 'response-field':'false' ,
																		  'response-field-name':'i13_recaptcha_woo_payment_method_token_v2',
																		  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																	  });
													  } catch (error){}


											}

				</script><!-- end_do_not_format_javascript --> 

				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_addpaymentmethod' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
			/*$i13_v3_woo_add_pay_method_disable = get_option( 'i13_recapcha_wp_disable_submit_token_generation_v3_woo_add_pay_method' );*/
			if ( 'yes' == $is_enabled && is_user_logged_in() && function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( get_option( 'woocommerce_myaccount_add_payment_method_endpoint', 'add-payment-method' ) ) ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha-v3' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_add_payment_method_action_v3 = get_option( 'i13_recapcha_add_payment_method_action_v3' );
				if ( '' == trim( $i13_recapcha_add_payment_method_action_v3 ) ) {

					$i13_recapcha_add_payment_method_action_v3 = 'add_payment_method';
				}
								
				$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
				if (''== $i13_recapcha_msg_token_generation) {

					$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
				}
				?>
				<div id="turnstile-woo-add-payment-method-i13" class="turnstile-woo-add-payment-method-i13" ></div>
				<!-- do_not_format_javascript --><script type="text/javascript">
								window.turnstile_woo_add_pay_method_i13=null;    
								document.addEventListener('readystatechange', function () {
									 if (document.readyState === 'interactive') {
													 var element_i13_p =  document.getElementById('place_order');
													 if (typeof(element_i13_p) != 'undefined' && element_i13_p != null)
													 {
																					 element_i13_p.disabled = true;
																					 element_i13_p.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
													 }
									 }
									 });   
				 function intval_payment_method_new_v3_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_payment_method_new_v3_ready(' + f + ')', 9) : f()
					}
					
				  intval_payment_method_new_v3_ready(function () {
					  
													  
												if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.render) !== 'undefined' && window.turnstile_woo_add_pay_method_i13==null) {


																i13_pm_renderReCaptchaV3();
												}
												else{


														jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&render=<?php echo esc_html( $site_key ); ?>&onload=i13_pm_renderReCaptchaV3", function() {

														});

												}	



												setInterval(function () {
															
															if(typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.reset) !== 'undefined'){
																
																	try{

																		   window.turnstile.reset(window.turnstile_woo_add_pay_method_i13);
																	   }
																	   catch (error){

																		   console.log(error);
																	   }

															}
																			   

												}, 80 * 1000);
								

												setTimeout(function(){

														if(jQuery('#place_order').length>0){

															   jQuery('#place_order').attr('title', '');
															   jQuery('#place_order').prop('disabled', false);
													   }

											   }, 60000);           

					});

										function i13_pm_renderReCaptchaV3(){


												 try{


															window.turnstile_woo_add_pay_method_i13 = window.turnstile.render('.turnstile-woo-add-payment-method-i13', {
																sitekey: "<?php echo esc_html( $site_key ); ?>",
																size: "invisible",     
																action: "<?php echo esc_html( $i13_recapcha_add_payment_method_action_v3 ); ?>" ,
																'response-field':"false" ,
																'response-field-name':'i13_recaptcha_woo_add_payment_method_token',
																callback: onSuccessWooAddPayMenthod      
															  });

														}
														catch (error){

																 if(jQuery('#place_order').length>0){

																		jQuery('#place_order').attr('title', '');
																		jQuery('#place_order').prop('disabled', false);
																}

														}

										}
										
										function onSuccessWooAddPayMenthod(token) {
								
													 
												if(jQuery('#place_order').length>0){

															jQuery('#place_order').attr('title', '');
															jQuery('#place_order').prop('disabled', false);
													}
										  }
										
				</script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	public function i13_woo_add_payment_method() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}


		if ('v3'==strtolower($reCapcha_version)) {

			   $use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_woo_add_payment_method')) {

				  $reCapcha_version='v2';
				}
			}
		}
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$is_enabled = get_option( 'i13_recapcha_enable_on_addpaymentmethod' );
			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_paymentmethod' );
			$captcha_lable = get_option( 'i13_recapcha_addpaymentmethod_title' );
			$i13_recapcha_hide_label_addpayment = get_option( 'i13_recapcha_hide_label_addpayment' );
			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_addpaymentmethod_theme' );
			$size = trim( get_option( 'i13_recapcha_addpaymentmethod_size' ) );
			if ( '' == $captcha_lable ) {

				$captcha_lable = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
						$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
												$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );
			if ( 'yes' == $is_enabled && is_user_logged_in() && function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( get_option( 'woocommerce_myaccount_add_payment_method_endpoint', 'add-payment-method' ) ) ) {
							
							
				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {

								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );

								break;
							}
						}
					}
				}
				?>


				<!-- do_not_format_javascript --><script type="text/javascript">
					
				  function intval_payment_method_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_payment_method_ready(' + f + ')', 9) : f()
					}
					
				  myCaptcha_payment_method=null;  
				  var verifyCallback_add_payment_method=null;
				  intval_payment_method_ready(function () { 
					  
						 
					<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
						jQuery('#add_payment_method').submit(function() {
							
						if (typeof (window.turnstile) !== 'undefined' && (myCaptcha_payment_method==null || window.turnstile.getResponse(myCaptcha_payment_method) == "")){


							<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
									alert("<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
							<?php else : ?>
									alert("<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
							<?php endif; ?>

								location.reload();

									return false;
								}
								else{
									return true;
																	}
					 });
										<?php endif; ?>


							 verifyCallback_add_payment_method = function(response) {

								  if (response.length !== 0){

									<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
											jQuery("#place_order").removeAttr("title");
											jQuery("#place_order").attr("disabled", false);
									<?php endif; ?>

										if (typeof add_payment_method_recaptcha_verified === "function") {

																					add_payment_method_recaptcha_verified(response);
										}
									}

							};
							var waitForEl = function(selector, callback) {

								if (jQuery("#" + selector).length) {
										callback_recpacha();
								} 
								else {
										setTimeout(function() {
										 waitForEl(jQuery("#" + selector), callback);
										}, 100);
									}
							};
					<?php if ( '' == trim( $captcha_lable ) ) : ?>
						jQuery(".woocommerce-PaymentMethods").append(`<li id="payment_method" class="woocommerce-PaymentMethod woocommerce-PaymentMethod--stripe payment_method_stripe"><div class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
						<?php
						if ( 'yes' != $i13_recapcha_hide_label_addpayment ) :
							?>
						<label for="cf-recaptcha-payment-method"><?php echo esc_html( __( 'Captcha', 'recaptcha-for-woocommerce' ) ); ?>&nbsp;<span class="required">*</span></label>
							<?php
					endif;
						?>
						<div id="cf-recaptcha-payment-method" name="cf-recaptcha-payment-method"  data-callback="verifyCallback_add_payment_method" data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_woo_payment_method_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div></div></li>`).ready(function () {
					<?php else : ?>
						jQuery(".woocommerce-PaymentMethods").append(`<li id="payment_method" class="woocommerce-PaymentMethod woocommerce-PaymentMethod--stripe payment_method_stripe"><div class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
						<?php
						if ( 'yes' != $i13_recapcha_hide_label_addpayment ) :
							?>
							<label for="cf-recaptcha-payment-method"><?php echo esc_html( $captcha_lable ); ?>&nbsp;<span class="required">*</span></label>
							<?php
						endif;
						?>
					 <div id="cf-recaptcha-payment-method" name="cf-recaptcha-payment-method"  data-callback="verifyCallback_add_payment_method" data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_woo_payment_method_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div></div></li>`).ready(function () {
				<?php endif; ?>


					waitForEl('cf-recaptcha-payment-method', function() {
					<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
						jQuery("#place_order").attr("disabled", true);
							<?php if ( '' == esc_html( $recapcha_error_msg_captcha_blank ) ) : ?>
							jQuery("#place_order").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
					<?php else : ?>
							jQuery("#place_order").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
					<?php endif; ?>
				<?php endif; ?>

													 if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined' && myCaptcha_payment_method === null) {
																												

																													callback_recpacha();
																											}
														else{
															
																 jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=callback_recpacha", function() {

															   
																});
														}
						})

					})
									  });

							function callback_recpacha(){
																		
									if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.render) !== 'undefined'   && myCaptcha_payment_method === null) {
																			   
										<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
														jQuery("#place_order").attr("disabled", true);
											<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
															jQuery("#place_order").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
											<?php else : ?>
															jQuery("#place_order").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
											<?php endif; ?>
										<?php endif; ?>


																						try{
																								myCaptcha_payment_method= window.turnstile.render('#cf-recaptcha-payment-method', {
																								'sitekey': '<?php echo esc_html( $site_key ); ?>',
																								 'callback' : verifyCallback_add_payment_method,
																								 'response-field':'false' ,
																								  'response-field-name':'i13_recaptcha_woo_payment_method_token_v2',
																								  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																							  });
																						  } catch (error){}
																			  
																					   

										}
																				else{
															
																								jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=callback_recpacha", function() {


																							   });
																			   }

							}


					
					
									   
				  </script><!-- end_do_not_format_javascript --> 

				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_addpaymentmethod' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
			/*$i13_v3_woo_add_pay_method_disable = get_option( 'i13_recapcha_wp_disable_submit_token_generation_v3_woo_add_pay_method' );*/
			if ( 'yes' == $is_enabled && is_user_logged_in() && function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( get_option( 'woocommerce_myaccount_add_payment_method_endpoint', 'add-payment-method' ) ) ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha-v3' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_add_payment_method_action_v3 = get_option( 'i13_recapcha_add_payment_method_action_v3' );
				if ( '' == trim( $i13_recapcha_add_payment_method_action_v3 ) ) {

					$i13_recapcha_add_payment_method_action_v3 = 'add_payment_method';
				}
								
				$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
				if (''== $i13_recapcha_msg_token_generation) {

					$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
				}
				?>

				<!-- do_not_format_javascript --><script type="text/javascript">
										 window.turnstile_woo_pay_i13=null;
										document.addEventListener('readystatechange', function () {
											   if (document.readyState === 'interactive') {
															   var element_i13_p =  document.getElementById('place_order');
															   if (typeof(element_i13_p) != 'undefined' && element_i13_p != null)
															   {
																							   element_i13_p.disabled = true;
																							   element_i13_p.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
															   }
											   }
											   });
					  function intval_payment_method_v3_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_payment_method_v3_ready(' + f + ')', 9) : f()
					}
					
										intval_payment_method_v3_ready(function () { 
					  
														
							jQuery(".woocommerce-PaymentMethods").append(`<div id="turnstile-woo-add-payment-method-i13" class="turnstile-woo-add-payment-method-i13" ></div>`);
														
														
														if (typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.render) !== 'undefined') {
			   

																i13_pm_renderReCaptchaV3();

															}
															else{


																	jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&onload=i13_pm_renderReCaptchaV3", function() {



																	});
															}
	
							
						
																														setInterval(function() {
																															
																															
																																					 if(typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.reset) !== 'undefined'){
																																									try{

																																										   window.turnstile.reset(window.turnstile_woo_pay_i13);
																																									   }
																																									   catch (error){

																																										   console.log(error);
																																									   }

																																					}
																																				
																	
																		
																																	}, 80 * 1000);

						
												setTimeout(function(){

													if(jQuery('#place_order').length>0){
													jQuery('#place_order').attr('title', '');
													jQuery('#place_order').prop('disabled', false);
												}

											}, 60000);

																				});
										
										function i13_pm_renderReCaptchaV3(){

																						try{


																								window.turnstile_woo_pay_i13 = window.turnstile.render('#turnstile-woo-add-payment-method-i13', {
																									sitekey: "<?php echo esc_html( $site_key ); ?>",
																									size: "invisible",
																									action: "<?php echo esc_html( $i13_recapcha_add_payment_method_action_v3 ); ?>" ,
																									'response-field':"false" ,
																									'response-field-name':'i13_recaptcha_woo_add_payment_method_token',
																									 callback: onSuccessWooAddPayMenthod      
																								  });

																							}
																							catch (error){

																									 if(jQuery('#place_order').length>0){
													jQuery('#place_order').attr('title', '');
													jQuery('#place_order').prop('disabled', false);
												}

																							}

												  
										
										}
																				function onSuccessWooAddPayMenthod(token) {


																					if(jQuery('#place_order').length>0){
																							jQuery('#place_order').attr('title', '');
																							jQuery('#place_order').prop('disabled', false);
																					}
																			  }
				  </script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	public function i13_woo_get_recaptcha_js_url() {

		$url = 'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha';

		return $url;
	}

	public function i13_woo_recaptcha_load_styles_and_js() {

				
		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

				$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ('v3'== strtolower($reCapcha_version)) {

			if ('yes'==$use_v2_along_v3) {

				$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
			// wp_register_style('i13-woo-styles', plugins_url('/public/css/styles.css', __FILE__), array(), '1.0');
				if ( '' != $i13_recapcha_v2_lang ) {

					wp_register_script( 'i13-woo-captcha', 'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha&hl=' . $i13_recapcha_v2_lang, array(), '1.0' );
					wp_register_script( 'i13-woo-captcha-explicit', 'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha&render=explicit&hl=' . $i13_recapcha_v2_lang, array(), '2.0' );
				} else {
					wp_register_script( 'i13-woo-captcha', 'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha', array(), '1.0' );
					wp_register_script( 'i13-woo-captcha-explicit', 'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha&render=explicit', array(), '2.0' );
				}

			}

		}
		if ( 'v2' == strtolower( $reCapcha_version ) ) {
			$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
			// wp_register_style('i13-woo-styles', plugins_url('/public/css/styles.css', __FILE__), array(), '1.0');
			if ( '' != $i13_recapcha_v2_lang ) {

				wp_register_script( 'i13-woo-captcha', 'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha&hl=' . $i13_recapcha_v2_lang, array(), '1.0' );
				wp_register_script( 'i13-woo-captcha-explicit', 'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha&render=explicit&hl=' . $i13_recapcha_v2_lang, array(), '2.0' );
			} else {
				wp_register_script( 'i13-woo-captcha', 'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha', array(), '1.0' );
				wp_register_script( 'i13-woo-captcha-explicit', 'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha&render=explicit', array(), '2.0' );
			}
			$is_enabled = get_option( 'i13_turnstile_enable_on_guestcheckout' );
			$is_enabled_on_payment_page = get_option( 'i13_turnstile_enable_on_addpaymentmethod' );

			$is_enabled_logincheckout = get_option( 'i13_turnstile_enable_on_logincheckout' );
			$i13_recapcha_enable_on_payfororder = get_option( 'i13_turnstile_enable_on_payfororder' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );


			if ( 'yes' == $is_enabled_on_payment_page && is_user_logged_in() && function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( get_option( 'woocommerce_myaccount_add_payment_method_endpoint', 'add-payment-method' ) ) ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'i13-woo-captcha' );
			}

			if ( 'yes' == $is_enabled && ( ! is_user_logged_in() || $i13_recapcha_enable_on_payfororder ) && function_exists( 'is_checkout' ) && is_checkout() ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'i13-woo-captcha-explicit' );
			} else if ( 'yes' == ( $is_enabled_logincheckout || $i13_recapcha_enable_on_payfororder ) && is_user_logged_in() && function_exists( 'is_checkout' ) && is_checkout() ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'i13-woo-captcha-explicit' );
			}
		} else {

			$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
			wp_register_script( 'i13-woo-captcha-v3', 'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha&render=' . esc_html( $site_key ), array( 'jquery' ), '1.0' );
			$is_enabled = get_option( 'i13_turnstile_enable_on_guestcheckout' );
			$is_enabled_on_payment_page = get_option( 'i13_turnstile_enable_on_addpaymentmethod' );
			$is_enabled_logincheckout = get_option( 'i13_turnstile_enable_on_logincheckout' );
			$i13_recapcha_enable_on_payfororder = get_option( 'i13_turnstile_enable_on_payfororder' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );

			if ( 'yes' == $is_enabled_on_payment_page && is_user_logged_in() && function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( get_option( 'woocommerce_myaccount_add_payment_method_endpoint', 'add-payment-method' ) ) ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'i13-woo-captcha-v3' );
			}

			if ( 'yes' == $is_enabled && ( ! is_user_logged_in() || $i13_recapcha_enable_on_payfororder ) && function_exists( 'is_checkout' ) && is_checkout() ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'i13-woo-captcha-v3' );
			} else if ( 'yes' == ( $is_enabled_logincheckout || $i13_recapcha_enable_on_payfororder ) && is_user_logged_in() && function_exists( 'is_checkout' ) && is_checkout() ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'i13-woo-captcha-v3' );
			}
		}
	}

	public function i13woo_extra_register_fields() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
				
				
		if ('v3'==strtolower($reCapcha_version)) {

			$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_woo_register')) {

					$reCapcha_version='v2';
				}
			}
		}
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_woo_signup' );
			$i13_recapcha_hide_label_signup = get_option( 'i13_recapcha_hide_label_signup' );
			$captcha_lable = trim( get_option( 'i13_recapcha_signup_title' ) );
			$captcha_lable_ = $captcha_lable;
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );

			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_signup_theme' );
			$size = get_option( 'i13_recapcha_signup_size' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_signup' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );
			$enabled_bp = get_option( 'i13_recapcha_using_buddy_press' );
			$unique_id = uniqid( 'cf-turnstile-register-i13_' );
						

			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {
					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {

								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}

				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha' );
				?>
				<?php if ( 'yes' != $enabled_bp ) : ?>
					<p id="woo_reg_recaptcha" class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
					<?php
					if ( 'yes' != $i13_recapcha_hide_label_signup ) :
						?>
							<label for="<?php echo esc_html( $unique_id ); ?>"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? esc_html( __( 'Captcha', 'recaptcha-for-woocommerce' ) ) : esc_html( $captcha_lable ) ); ?>&nbsp;<span class="required">*</span></label>
					<?php endif; ?>
										<div id="<?php echo esc_html( $unique_id ); ?>" name="turnstile-recaptcha-register-i13" class="turnstile-recaptcha-register-i13" data-callback="verifyCallback_woo_signup"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-callback="verifyCallback_woo_register" data-response-field="false" data-response-field-name="i13_recaptcha_woo_register_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
										<input type="hidden" value="" name="i13_recaptcha_register_token_v2" id="i13_recaptcha_register_token_v2"  />
					</p>
				<?php else : ?>
					<div class="editfield field_last field_apple-captcha optional-field visibility-public alt field_type_captcha">
						<fieldset>


							<legend id="field_captcha">
					<?php if ( 'yes' != $i13_recapcha_hide_label_signup ) : ?>
									<label for="<?php echo esc_html( $unique_id ); ?>"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? esc_html( __( 'Captcha', 'recaptcha-for-woocommerce' ) ) : esc_html( $captcha_lable ) ); ?>&nbsp;<span class="required">*</span></label>
					<?php endif; ?>				
							</legend>
							<div id="<?php echo esc_html( $unique_id ); ?>" name="turnstile-recaptcha-register-i13" class="turnstile-recaptcha-register-i13" data-callback="verifyCallback_woo_signup"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-callback="verifyCallback_woo_register" data-response-field="false" data-response-field-name="i13_recaptcha_woo_register_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
							<input type="hidden" value="" name="i13_recaptcha_register_token_v2" id="i13_recaptcha_register_token_v2"  />

						</fieldset>
					</div>
				<?php endif; ?>  
				<!-- do_not_format_javascript --><script type="text/javascript" id="woo_recaptcha_register_v2">



													var capchaChecked_signup = false;
													window.el_i13_register_captcha=null;
													function intval_woo_reg_method_ready(f) {
															/in/.test(document.readyState) ? setTimeout('intval_woo_reg_method_ready(' + f + ')', 9) : f()
													 }

						   intval_woo_reg_method_ready(function () { 



							try{


								if ((typeof (window.turnstile) == 'undefined' ||   typeof (window.turnstile.render) == 'undefined') && el_i13_register_captcha == null){

										jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_turnstile_v2_lang ); ?>&onload=reRender_Woo_Signup_Captcha&render=explicit", function() {
										});
								}
								else{
										
																				   el_i13_register_captcha= window.turnstile.render('.turnstile-recaptcha-register-i13', {
																															'sitekey': '<?php echo esc_html( $site_key ); ?>',
																															 'callback' : verifyCallback_woo_signup,
																															 'response-field':"false" ,
																															  'response-field-name':'i13_recaptcha_woo_register_token_v2',
																															  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																														  });
								}


								} catch (error){}

								<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>

									<?php if ( 'yes' != $enabled_bp ) : ?>

											jQuery('button[name$="register"]').attr("disabled", true);
										<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
												jQuery('button[name$="register"]').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
										<?php else : ?>
												jQuery('button[name$="register"]').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
										<?php endif; ?>

									<?php else : ?>

										setTimeout(function(){

												jQuery('input[name$="signup_submit"]').attr("disabled", true);
											<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
													jQuery('input[name$="signup_submit"]').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
											<?php else : ?>
													jQuery('input[name$="signup_submit"]').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
											<?php endif; ?>

										}, 1500);
									<?php endif; ?>
							<?php endif; ?>
						
						});
							var verifyCallback_woo_signup = function(response) {

								  if (response.length !== 0){

									capchaChecked_signup = true;
									<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
										<?php if ( 'yes' != $enabled_bp ) : ?>
												jQuery('button[name$="register"]').removeAttr("title");
												jQuery('button[name$="register"]').attr("disabled", false);
										<?php else : ?>
												jQuery('input[name$="signup_submit"]').removeAttr("title");
												jQuery('input[name$="signup_submit"]').attr("disabled", false);
										<?php endif; ?>
									<?php endif; ?>

										if (typeof woo_register_recaptcha_verified === "function") {

																					woo_register_recaptcha_verified(response);
										   
										}
								 }

							};
							function reRender_Woo_Signup_Captcha(){
															

								try{

										var myNodeList = document.querySelectorAll('.turnstile-recaptcha-register-i13');
											Array.from(myNodeList).forEach(function(el) {
																							
											if (el.childElementCount == 0){
																							

													try{
															
																														 el_i13_register_captcha= window.turnstile.render('.turnstile-recaptcha-register-i13', {
																															'sitekey': '<?php echo esc_html( $site_key ); ?>',
																															 'callback' : verifyCallback_woo_signup,
																															 'response-field':"false" ,
																															  'response-field-name':'i13_recaptcha_woo_register_token_v2',
																															  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																														  });
																														
													} catch (error){}


											}
											else{


												window.turnstile.reset(el_i13_register_captcha);
											}
										  });
								  } catch (error){}


								<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
									<?php if ( 'yes' != $enabled_bp ) : ?>

										jQuery('button[name$="register"]').attr("disabled", true);
										<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
											jQuery('button[name$="register"]').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
										<?php else : ?>
											jQuery('button[name$="register"]').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
										<?php endif; ?>
									<?php else : ?>
										jQuery('input[name$="signup_submit"]').attr("disabled", true);
										<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
											jQuery('input[name$="signup_submit"]').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
										<?php else : ?>
											jQuery('input[name$="signup_submit"]').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
										<?php endif; ?>
									<?php endif; ?>
								<?php endif; ?>

					   }


					<?php if ( 'yes' == trim( $disable_submit_btn ) && 'yes' == $enabled_bp ) : ?>



							jQuery('input[name$="signup_password"]').on('keyup', function(){

								if (jQuery('input[name$="signup_submit"]').is(":disabled") || capchaChecked_signup == false){

								 setTimeout(function(){ jQuery('input[name$="signup_submit"]').attr("disabled", true); }, 300);
								}
							});

							jQuery('input[name$="signup_password_confirm"]').on('keyup', function(){

									if (jQuery('input[name$="signup_submit"]').is(":disabled") || capchaChecked_signup == false){

									setTimeout(function(){ jQuery('input[name$="signup_submit"]').attr("disabled", true); }, 300);
									}
							});
					<?php elseif ( 'yes' == trim( $disable_submit_btn ) && 'yes' != $enabled_bp ) : ?>

							jQuery('input[name$="password"]').on('keyup', function(){

							if (jQuery('button[name$="register"]').is(":disabled") || capchaChecked_signup == false){

							setTimeout(function(){ jQuery('button[name$="register"]').attr("disabled", true); }, 2000);
							}
							});
					<?php endif; ?>


				</script><!-- end_do_not_format_javascript -->

				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_signup' );
			$enabled_bp = get_option( 'i13_recapcha_using_buddy_press' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
			$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
			if (''== $i13_recapcha_msg_token_generation) {
							
				$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
			}
			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha-v3' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_signup_action_v3 = get_option( 'i13_recapcha_signup_action_v3' );
				if ( '' == trim( $i13_recapcha_signup_action_v3 ) ) {

					$i13_recapcha_signup_action_v3 = 'signup';
				}
				
				?>
				
								<div id="turnstile-register-i13" class="turnstile-register-i13"></div>
				<!-- do_not_format_javascript --><script type="text/javascript" id="woo_recaptcha_register_v3">

				el_i13_register_captcha=null;				
								document.addEventListener('readystatechange', function () {

										if (document.readyState === 'interactive') {
												var element = document.querySelector('[name="register"]');
												if (typeof(element) != 'undefined' && element != null)
												{
													element.disabled = true;
													element.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
												}
										}
								});
				function intval_woo_reg_method_v3_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_woo_reg_method_v3_ready(' + f + ')', 9) : f()
					}
					
				  intval_woo_reg_method_v3_ready(function () { 
					  
														
							if ((typeof (window.turnstile) == 'undefined'  ||  typeof (window.turnstile.render) == 'undefined') && el_i13_register_captcha == null){



								jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&onload=reRender_Woo_Signup_Captcha_v3&render=explicit", function() {




								});
							}
							else{

																	try{
																		  el_i13_register_captcha = window.turnstile.render('.turnstile-register-i13', {
																			sitekey: "<?php echo esc_html( $site_key ); ?>",
																			size: "invisible",     
																			action: "<?php echo esc_html( $i13_recapcha_signup_action_v3 ); ?>" ,
																			'response-field':"false" ,
																			'response-field-name':'i13_recaptcha_register_token',
																			callback: onSuccessRegister      
																		  });
																	  }
																	  catch (error){
																	  
																			console.error('Turnstile execution error:', error);
																			if(jQuery('[name="register"]').length>0){

																					  jQuery('[name="register"]').attr('title', '');
																						   jQuery('[name="register"]').prop('disabled', false);

																				   }
																	  
																	  }
																	  
									
															}


						
															setInterval(function() {

																if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.reset) !== 'undefined' && el_i13_register_captcha!=null) {

																					try{

																						window.turnstile.reset(el_i13_register_captcha);
																					}
																					catch (error){

																						console.log(error);
																					}

																	 }
															}, 80 * 1000);
						

															setTimeout(function(){ 

																	 if(jQuery('[name="register"]').length>0){   

																			jQuery('[name="register"]').attr('title', '');
																			jQuery('[name="register"]').prop('disabled', false);
																	}

															}, 60000);
				  

					});
					
					
					function reRender_Woo_Signup_Captcha_v3(){

					
												try{
										
														el_i13_register_captcha = window.turnstile.render('.turnstile-register-i13', {
																sitekey: "<?php echo esc_html( $site_key ); ?>",
																size: "invisible",     
																action: "<?php echo esc_html( $i13_recapcha_signup_action_v3 ); ?>" ,
																'response-field':"false" ,
																'response-field-name':'i13_recaptcha_register_token',
																callback: onSuccessRegister      
															  });



														if(jQuery('[name="register"]').length>0){

																jQuery('[name="register"]').attr("title", "");
																jQuery('[name="register"]').prop("disabled", false);

														}
												   }
														catch(error) {
																	console.error('Turnstile execution error:', error);
																	if(jQuery('[name="register"]').length>0){

																			  jQuery('[name="register"]').attr('title', '');
																			   jQuery('[name="register"]').prop('disabled', false);

																	   }
														  }

											}
						
										   function onSuccessRegister(token) {
								
													 

															if(jQuery('[name="register"]').length>0){

																jQuery('[name="register"]').attr('title', '');
																jQuery('[name="register"]').prop('disabled', false);
														   }
													  }
									   


				</script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	public function     i13woo_extra_checkout_fields() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

				
		if ('v3'==strtolower($reCapcha_version)) {

			   $use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {
							
				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_woo_checkout')) {

				  $reCapcha_version='v2';
				}
			}
		}    
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_guestcheckout' );
			$disable_submit_btn_login_checkout = get_option( 'i13_recapcha_disable_submitbtn_logincheckout' );
			$i13_recapcha_hide_label_checkout = get_option( 'i13_recapcha_hide_label_checkout' );
			$captcha_lable = get_option( 'i13_recapcha_guestcheckout_title' );
			$captcha_lable_ = get_option( 'i13_recapcha_guestcheckout_title' );
			$refresh_lable = get_option( 'i13_recapcha_guestcheckout_refresh' );
			if ( '' == esc_html( $refresh_lable ) ) {

				$refresh_lable = __( 'Refresh Captcha', 'recaptcha-for-woocommerce' );
			}
			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_guestcheckout_theme' );
			$size = get_option( 'i13_recapcha_guestcheckout_size' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_guestcheckout' );
			$is_enabled_logincheckout = get_option( 'i13_recapcha_enable_on_logincheckout' );
			$i13_recapcha_guest_recpacha_refersh_on_error = get_option( 'i13_recapcha_guest_recpacha_refersh_on_error' );
			$i13_recapcha_login_recpacha_refersh_on_error = get_option( 'i13_recapcha_login_recpacha_refersh_on_error' );
						$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );

			if ( 'yes' == $is_enabled && ! is_user_logged_in() ) {

				wp_enqueue_script( 'jquery' );
				?>
				<p class="guest-checkout-recaptcha woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
				<?php
				if ( 'yes' != $i13_recapcha_hide_label_checkout ) :
					?>
						<label for="cf-turnstile-checkout-i13"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;<span class="required">*</span></label>
					<?php
				endif;
				?>
				<div id="cf-turnstile-checkout-i13" name="cf-turnstile-checkout-i13" class="cf-turnstile-checkout-i13" data-callback="verifyCallback_add_guestcheckout"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_checkout_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
				<div id='refresh_captcha' style="width:100%;padding-top:5px"> 
					<a href="javascript:window.turnstile.reset(myCaptcha);" style="clear:both"><?php echo esc_html( $refresh_lable ); ?></a>
				</div>    

				</p>
				<!-- do_not_format_javascript --><script type="text/javascript">
					var myCaptcha = null;
					var capchaChecked = false;
					 recap_val = null;
				
					function intval_checkout_ready(f) {
						   /in/.test(document.readyState) ? setTimeout('intval_checkout_ready(' + f + ')', 9) : f()
					 }

				  intval_checkout_ready(function () { 
									  
						<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
								jQuery("#place_order").attr("disabled", true);
							<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
									jQuery("#place_order").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
							<?php else : ?>
									jQuery("#place_order").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
							<?php endif; ?>
						<?php endif; ?>



					if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined' && myCaptcha === null) {
													   
							i13renderReCaptchaV2();

					}
										else{

											   

												jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=i13renderReCaptchaV2", function() {


												});
										}

					jQuery(document).on('updated_checkout', function () {

							if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.render) !== 'undefined' && window.myCaptcha === null) {

							try{
															
															
																	
																		 myCaptcha= window.turnstile.render('.cf-turnstile-checkout-i13', {
																							'sitekey': '<?php echo esc_html( $site_key ); ?>',
																							 'callback' : verifyCallback_add_guestcheckout,
																							 'response-field':'false' ,
																							  'response-field-name':'i13_recaptcha_checkout_token_v2',
																							  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																						  });

									
																		
																		
																		
																		
							} catch (error){}

							}
						});
					
					
						<?php if ( 'yes' == $i13_recapcha_guest_recpacha_refersh_on_error ) : ?>
							jQuery('body').on('checkout_error', function(){
															window.turnstile.reset(window.myCaptcha);
							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
								jQuery("#place_order").attr("disabled", true);
								<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
									jQuery("#place_order").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
							<?php else : ?>
									jQuery("#place_order").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
							<?php endif; ?>
						<?php endif; ?>

							});
						   jQuery(document).ajaxComplete(function() {
								
									if (jQuery(".woocommerce-error").is(":visible") || jQuery(".woocommerce_error").is(":visible")){

										window.turnstile.reset(window.myCaptcha);
										<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
												jQuery("#place_order").attr("disabled", true);
											<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
													jQuery("#place_order").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
											<?php else : ?>
													jQuery("#place_order").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
											<?php endif; ?>
										<?php endif; ?>
									}

							});

						  <?php endif; ?>
					  
						   <?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>

								jQuery('#createaccount').on('click', function(){
										if (jQuery("#place_order").is(":disabled") || capchaChecked == false){

										setTimeout(function(){ jQuery("#place_order").attr("disabled", true); }, 100);
										}
								});
								jQuery('#account_username').on('keyup', function(){

										if (jQuery("#place_order").is(":disabled") || capchaChecked == false){

										setTimeout(function(){ jQuery("#place_order").attr("disabled", true); }, 300);
										}
								 });
								jQuery('#account_password').on('keyup', function(){

									if (jQuery("#place_order").is(":disabled") || capchaChecked == false){

									setTimeout(function(){ jQuery("#place_order").attr("disabled", true); }, 300);
									}
								 });
					<?php endif; ?>
											

												jQuery(document).ajaxSend(function (event, jqxhr, settings) {

																		  
																	if(settings.url.indexOf('wc-ajax=checkout') !== -1 || settings.url.indexOf('wc-ajax=wcstripe_create_order') !== -1 ||  (settings.url.indexOf('wc-ajax=wc_stripe_frontend_request') !== -1 && settings.url.indexOf('path=/wc-stripe/v1/checkout') !== -1) || settings.url.indexOf('wc-ajax=wc_stripe_create_order') !== -1 || settings.url.indexOf('wc-ajax=wcpay_create_order') !== -1 || settings.url.indexOf('wc-ajax=wc_ajax_square_digital_wallet_process_checkout') !== -1){
																		if(window.recap_val!==null && window.recap_val!='' && settings.data.indexOf('i13_recaptcha_checkout_token_v2' + '=') === -1 ){
																						settings.data = settings.data + '&i13_recaptcha_checkout_token_v2=' + window.recap_val;
																		}
																	}



														 });

													 
													if (!window.i13_ppc_v2_interceptor_loaded) {
														window.i13_ppc_v2_interceptor_loaded = true;
													
													 (function() {
																	const originalFetch = window.fetch;
																	  window.i13_ppc_alert_shown = false;    
																	
																	function stripHtml(html) {
																		if (!html) return '';
																		const tmp = document.createElement('div');
																		tmp.innerHTML = html;
																		return tmp.textContent || tmp.innerText || '';
																	}

																	window.fetch = async function(input, init) {
																		const url = (typeof input === "string") ? input : (input?.url || "");

																		if (!url.includes("ppc-create-order")) {
																			return originalFetch.apply(this, arguments);
																		}

																		 if (url.includes("ppc-create-order")) {
																				window.i13_ppc_alert_shown = false;

																				if (window.__i13_ppc_last_call && Date.now() - window.__i13_ppc_last_call < 300) {
																					return originalFetch.call(this, input, init);
																				}

																				window.__i13_ppc_last_call = Date.now();
																			}
																		try {
																			
																			
																			if(window.recap_val==null || window.recap_val==''){
																				setTimeout(() => alert('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>'), 2000);
																				return Promise.reject('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>');
																			}

																			const options = { ...init };
																			if (options.body && typeof options.body === "string") {
																				const bodyObj = JSON.parse(options.body);
																				bodyObj.recaptcha_token = window.recap_val;
																				bodyObj.recaptcha_i13_nonce = '<?php echo esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block')); ?>';
																				bodyObj.cookiehash_i13 = '<?php echo esc_html(COOKIEHASH_I13); ?>';
																				bodyObj.js_context = 'inline';
																				bodyObj.recap_v = 'v2';
																				options.body = JSON.stringify(bodyObj);
																			}

																			const response = await originalFetch.call(this, input, options);

																			 if (response.status === 400) {
																				try {
																					const errorData = await response.clone().json();
																					if (errorData && JSON.stringify(errorData).includes('cf-recaptcha_error_v2')) {
																						let message = '❌ Checkout failed. Please try again.';
																						if (errorData.data?.message) {
																							message = stripHtml(errorData.data.message);
																						} else if (errorData.message) {
																							message = stripHtml(errorData.message);
																						}

																						setTimeout(() => {
																							
																							 if(window.i13_ppc_alert_shown==false){
																								 
																								window.i13_ppc_alert_shown=true; 
																								alert(message);
																							}
																						
																						}, 2000);
																					}
																				} catch (parseError) {
																					console.error('Error parsing error response:', parseError);
																				}
																			}

																			return response;

																		} catch (error) {
																			console.error('PayPal fetch interceptor error:', error);
																			throw error;
																		}
																	};
																})();
														   }
																
																
					});
						var verifyCallback_add_guestcheckout = function(response) {

								if (response.length !== 0){

																			window.recap_val = response;
																				<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
																							jQuery("#place_order").removeAttr("title");
																							jQuery("#place_order").attr("disabled", false);
																							capchaChecked = true;
										<?php endif; ?>

										if (typeof woo_guest_checkout_recaptcha_verified === "function") {

											woo_guest_checkout_recaptcha_verified(response);
										}
									}

						};


												function i13renderReCaptchaV2(){
													
															 try{
																		if(myCaptcha===null){
																			myCaptcha= window.turnstile.render('.cf-turnstile-checkout-i13', {
																					'sitekey': '<?php echo esc_html( $site_key ); ?>',
																					 'callback' : verifyCallback_add_guestcheckout,
																					 'response-field':'false' ,
																					  'response-field-name':'i13_recaptcha_checkout_token_v2',
																					  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																				  });
																		 }
																				  
															 } catch (error){}
												}
			   


				</script><!-- end_do_not_format_javascript -->
				<?php
			} else if ( 'yes' == $is_enabled_logincheckout && is_user_logged_in() ) {

				wp_enqueue_script( 'jquery' );
				?>
				<p class="login-checkout-captcha woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
				<?php
				if ( 'yes' != $i13_recapcha_hide_label_checkout ) :
					?>
						<label for="cf-turnstile-checkout-i13"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;<span class="required">*</span></label>
					<?php
				endif;
				?>
				<div id="cf-turnstile-checkout-i13" name="cf-turnstile-checkout-i13" class="cf-turnstile-checkout-i13" data-callback="verifyCallback_add_logincheckout"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_checkout_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
				<div id='refresh_captcha' style="width:100%;padding-top:5px"> 
					<a href="javascript:window.turnstile.reset(myCaptcha);" style="clear:both"><?php echo esc_html( $refresh_lable ); ?></a>
				</div>  
				</p>
				<!-- do_not_format_javascript --><script type="text/javascript">
					var myCaptcha = null;
					 recap_val = null;
					function intval_login_checkout_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_login_checkout_ready(' + f + ')', 9) : f()
					}
					
				  intval_login_checkout_ready(function () { 
					  
						<?php if ( 'yes' == trim( $disable_submit_btn_login_checkout ) ) : ?>
								jQuery("#place_order").attr("disabled", true);
							<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
									jQuery("#place_order").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
							<?php else : ?>
									jQuery("#place_order").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
							<?php endif; ?>
						<?php endif; ?>



													if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.render) !== 'undefined' && myCaptcha === null) {

							i13renderReCaptchaV2();

													}
													else{

																	jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=i13renderReCaptchaV2", function() {


																	 });
													}

						jQuery(document).on('updated_checkout', function () {

							if (typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.render) !== 'undefined' && myCaptcha === null) {

								  try{
										  myCaptcha= window.turnstile.render('.cf-turnstile-checkout-i13', {
																							'sitekey': '<?php echo esc_html( $site_key ); ?>',
																							 'callback' : verifyCallback_add_logincheckout,
																							 'response-field':'false' ,
																							  'response-field-name':'i13_recaptcha_checkout_token_v2',
																							  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																						  });

								  } 
								  catch (error){}

							  }
						});
						
						
						<?php if ( 'yes' == $i13_recapcha_login_recpacha_refersh_on_error ) : ?>
							jQuery('body').on('checkout_error', function(){
							
								myCaptcha = window.turnstile.reset(myCaptcha);
								<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
										jQuery("#place_order").attr("disabled", true);
									<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
											jQuery("#place_order").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
									<?php else : ?>
											jQuery("#place_order").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
									<?php endif; ?>
								<?php endif; ?>


								});
							jQuery(document).ajaxComplete(function() {

								if (jQuery(".woocommerce-error").is(":visible") || jQuery(".woocommerce_error").is(":visible")){

										myCaptcha = window.turnstile.reset(myCaptcha);
											<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
													jQuery("#place_order").attr("disabled", true);
												<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
														jQuery("#place_order").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
												<?php else : ?>
														jQuery("#place_order").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
												<?php endif; ?>
											<?php endif; ?>
									 }

							 });
						<?php endif; ?>
						
												jQuery(document).ajaxSend(function (event, jqxhr, settings) {

																										if(settings.url.indexOf('wc-ajax=checkout') !== -1 || settings.url.indexOf('wc-ajax=wcstripe_create_order') !== -1 ||  (settings.url.indexOf('wc-ajax=wc_stripe_frontend_request') !== -1 && settings.url.indexOf('path=/wc-stripe/v1/checkout') !== -1) || settings.url.indexOf('wc-ajax=wc_stripe_create_order') !== -1 || settings.url.indexOf('wc-ajax=wcpay_create_order') !== -1 || settings.url.indexOf('wc-ajax=wc_ajax_square_digital_wallet_process_checkout') !== -1){
																												if(window.recap_val!==null && window.recap_val!='' && settings.data.indexOf('i13_recaptcha_checkout_token_v2' + '=') === -1 ){
																													settings.data = settings.data + '&i13_recaptcha_checkout_token_v2=' + window.recap_val;
																												}
																										}



												});
												
												 if (!window.i13_ppc_v2_interceptor_loaded) {
													window.i13_ppc_v2_interceptor_loaded = true;
												
												(function() {
																	const originalFetch = window.fetch;
																	window.i13_ppc_alert_shown = false;     
																	
																	function stripHtml(html) {
																		if (!html) return '';
																		const tmp = document.createElement('div');
																		tmp.innerHTML = html;
																		return tmp.textContent || tmp.innerText || '';
																	}

																	window.fetch = async function(input, init) {
																		const url = (typeof input === "string") ? input : (input?.url || "");

																		if (!url.includes("ppc-create-order")) {
																			return originalFetch.apply(this, arguments);
																		}

																		 if (url.includes("ppc-create-order")) {
																			window.i13_ppc_alert_shown = false;

																			if (window.__i13_ppc_last_call && Date.now() - window.__i13_ppc_last_call < 300) {
																				return originalFetch.call(this, input, init);
																			}

																			window.__i13_ppc_last_call = Date.now();
																		}
																		try {
																			
																			
																			if(window.recap_val==null || window.recap_val==''){
																				setTimeout(() => alert('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>'), 2000);
																				return Promise.reject('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>');
																			}

																			const options = { ...init };
																			if (options.body && typeof options.body === "string") {
																				const bodyObj = JSON.parse(options.body);
																				bodyObj.recaptcha_token = window.recap_val;
																				bodyObj.recaptcha_i13_nonce = '<?php echo esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block')); ?>';
																				bodyObj.cookiehash_i13 = '<?php echo esc_html(COOKIEHASH_I13); ?>';
																				bodyObj.js_context = 'inline';
																				bodyObj.recap_v = 'v2';
																				options.body = JSON.stringify(bodyObj);
																			}

																			const response = await originalFetch.call(this, input, options);

																			 if (response.status === 400) {
																				try {
																					const errorData = await response.clone().json();
																					if (errorData && JSON.stringify(errorData).includes('cf-recaptcha_error_v2')) {
																						let message = '❌ Checkout failed. Please try again.';
																						if (errorData.data?.message) {
																							message = stripHtml(errorData.data.message);
																						} else if (errorData.message) {
																							message = stripHtml(errorData.message);
																						}

																						setTimeout(() => {
																							if(window.i13_ppc_alert_shown==false){
																								window.i13_ppc_alert_shown=true;
																								alert(message);
																							}
																						
																						}, 2000);
																					}
																				} catch (parseError) {
																					console.error('Error parsing error response:', parseError);
																				}
																			}

																			return response;

																		} catch (error) {
																			console.error('PayPal fetch interceptor error:', error);
																			throw error;
																		}
																	};
																})(); 
													   }
												
					});
					var verifyCallback_add_logincheckout = function(response) {

								if (response.length !== 0){

									window.recap_val = response;
									<?php if ( 'yes' == trim( $disable_submit_btn_login_checkout ) ) : ?>

																					jQuery("#place_order").removeAttr("title");
																					jQuery("#place_order").attr("disabled", false);
									<?php endif; ?>

								if (typeof woo_login_checkout_recaptcha_verified === "function") {

											woo_login_checkout_recaptcha_verified(response);
									}
								}



					};
					
										function i13renderReCaptchaV2(){
												
												  try{
															 if(myCaptcha===null){
																 myCaptcha= window.turnstile.render('.cf-turnstile-checkout-i13', {
																		 'sitekey': '<?php echo esc_html( $site_key ); ?>',
																		  'callback' : verifyCallback_add_logincheckout,
																		  'response-field':'false' ,
																		   'response-field-name':'i13_recaptcha_checkout_token_v2',
																		   'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																	   });
															  }

												  } catch (error){}
									 }
				</script><!-- end_do_not_format_javascript -->
				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_guestcheckout' );
			$is_enabled_logincheckout = get_option( 'i13_recapcha_enable_on_logincheckout' );
						$captcha_lable_ = get_option( 'i13_recapcha_guestcheckout_title' );
						$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );
			if ( ( 'yes' == $is_enabled && ! is_user_logged_in() ) || ( 'yes' == $is_enabled_logincheckout && is_user_logged_in() ) ) {

				wp_enqueue_script( 'jquery' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_checkout_action_v3 = get_option( 'i13_recapcha_checkout_action_v3' );
				if ( '' == $i13_recapcha_checkout_action_v3 ) {

					$i13_recapcha_checkout_action_v3 = 'checkout';
				}

				
				?>
				<div id="turnstile-woo-checkout-i13" class="turnstile-woo-checkout-i13" ></div>
				<div id="turnstile-woo-checkout-fallback-i13" class="turnstile-woo-checkout-fallback-i13" ></div>
								
				<!-- do_not_format_javascript --><script type="text/javascript">
								window.turnstile_woo_checkout_i13=null;
								window.turnstile_woo_checkout_fallback_i13=null;
								document.addEventListener('readystatechange', function () {
								   if (document.readyState === 'interactive') {
												   var element_i13_p =  document.getElementById('place_order');

												   if (typeof(element_i13_p) != 'undefined' && element_i13_p != null)
												   {
														element_i13_p.disabled = true;
														element_i13_p.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;

												   }
								   }
								   });


				 function intval_checkout_v3_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_checkout_v3_ready(' + f + ')', 9) : f()
					}
					
				  intval_checkout_v3_ready(function () { 
					  
				  
									if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined') {


													i13RenderReCaptchaV3();

									}
									else{


											jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&onload=i13RenderReCaptchaV3", function() {



														 });
									}
														
														
						


							setInterval(function() {

								if (typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.reset) !== 'undefined') {
									
																		 try{

																				window.turnstile.reset(window.turnstile_woo_checkout_i13);
																			}
																			catch (error){

																				console.log(error);
																			}
																								
									
																				
								}
																				
							}, 80 * 1000);
							



														setInterval(function() {

																				try{

																						window.turnstile.reset(window.turnstile_woo_checkout_fallback_i13);
																					}
																					catch (error){

																						console.log(error);
																					}
																			   

																		}, 100 * 1000);


																				
																																if (!window.i13_ppc_v3_interceptor_loaded) {
																																					   window.i13_ppc_v3_interceptor_loaded = true;

																																							   (function() {
																																									   const originalFetch = window.fetch;
																																									   window.i13_ppc_alert_shown = false;    

																																									   function stripHtml(html) {
																																											   if (!html) return '';
																																											   const tmp = document.createElement('div');
																																											   tmp.innerHTML = html;
																																											   return tmp.textContent || tmp.innerText || '';
																																									   }

																																									   window.fetch = async function(input, init) {
																																											   const url = (typeof input === "string") ? input : (input?.url || "");

																																											   if (!url.includes("ppc-create-order")) {
																																													   return originalFetch.apply(this, arguments);
																																											   }

																																											   if (url.includes("ppc-create-order")) {
																																													   window.i13_ppc_alert_shown = false;

																																													   if (window.__i13_ppc_last_call && Date.now() - window.__i13_ppc_last_call < 300) {
																																															   return originalFetch.call(this, input, init);
																																													   }

																																													   window.__i13_ppc_last_call = Date.now();
																																											   }

																																											   try {
																																													   console.log("PayPal create order intercepted:", url, performance.now());
																																													   
																																													   let tokenValX = turnstile.getResponse(window.turnstile_woo_checkout_i13);
																																													 
																																													   if(tokenValX==null || tokenValX==''){

																																																tokenValX = turnstile.getResponse(window.turnstile_woo_checkout_fallback_i13);

																																													   }
																																													   
																																													   if(!tokenValX || tokenValX==null || tokenValX==''){
																																															   setTimeout(() => alert('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>'), 2000);
																																															   return Promise.reject('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>');
																																													   }

																																													   const options = { ...init };
																																													   if (options.body && typeof options.body === "string") {
																																															   const bodyObj = JSON.parse(options.body);
																																															   bodyObj.recaptcha_token_v3 = tokenValX;
																																															   bodyObj.recaptcha_i13_nonce = '<?php echo esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block')); ?>';
																																															   bodyObj.cookiehash_i13 = '<?php echo esc_html(COOKIEHASH_I13); ?>';
																																															   bodyObj.js_context = 'inline';
																																															   bodyObj.recap_v = 'v3';
																																															   options.body = JSON.stringify(bodyObj);
																																													   }

																																													   const response = await originalFetch.call(this, input, options);

																																														if (response.status === 400) {
																																															   try {
																																																	   const errorData = await response.clone().json();
																																																	   if (errorData && JSON.stringify(errorData).includes('cf-recaptcha_error_v3')) {
																																																			   let message = '❌ Checkout failed. Please try again.';
																																																			   if (errorData.data?.message) {
																																																					   message = stripHtml(errorData.data.message);
																																																			   } else if (errorData.message) {
																																																					   message = stripHtml(errorData.message);
																																																			   }

																																																			   setTimeout(() => {
																																																					   if(window.i13_ppc_alert_shown==false){
																																																							   window.i13_ppc_alert_shown=true;
																																																							   alert(message);
																																																					   }
				<?php if ('yes' == $use_v2_along_v3) : ?>
																																																								   const url = new URL(location.href);
																																																								   url.searchParams.set('rand_i13', (Math.random() + 1).toString(36).substring(7));
																																																								   location.assign(url.search);
				<?php endif; ?>
																																																			   }, 2000);
																																																	   }
																																															   } catch (parseError) {
																																																	   console.error('Error parsing error response:', parseError);
																																															   }
																																													   }

																																													   return response;

																																											   } catch (error) {
																																													   console.error('PayPal fetch interceptor error:', error);
																																													   throw error;
																																											   }
																																									   };
																																							   })(); 
																																					   }
															jQuery(document).ajaxSend(function(event, jqXHR, settings) {


																if(settings.url.indexOf('wc-ajax=checkout') !== -1 || settings.url.indexOf('wc-ajax=wcstripe_create_order') !== -1 ||  (settings.url.indexOf('wc-ajax=wc_stripe_frontend_request') !== -1 && settings.url.indexOf('path=/wc-stripe/v1/checkout') !== -1) || settings.url.indexOf('wc-ajax=wc_stripe_create_order') !== -1 || settings.url.indexOf('wc-ajax=wcpay_create_order') !== -1 || settings.url.indexOf('wc-ajax=wc_ajax_square_digital_wallet_process_checkout') !== -1){

																																		try{
																																			
																																			if(settings.data.indexOf('i13_recaptcha_checkout_token' + '=') === -1 ){
																																				let tokenVal__ = turnstile.getResponse(window.turnstile_woo_checkout_i13);

																																				if(tokenVal__!=null && tokenVal__!=''){
																																						settings.data += '&i13_recaptcha_checkout_token='+tokenVal__;                                             


																																				}
																																			}
																																			
																																			if(settings.data.indexOf('i13_recaptcha_checkout_token_fallback' + '=') === -1 ){
																																				 tokenVal__ = turnstile.getResponse(window.turnstile_woo_checkout_fallback_i13);
																																				if(tokenVal__!=null && tokenVal__!=''){
																																						settings.data += '&i13_recaptcha_checkout_token_fallback='+tokenVal__;                                             


																																				}
																																			}
																																													   
																																		}
																																		catch(error){
																																			
																																			
																																		}

																}


															});
																														
																														jQuery(document).ajaxComplete(function (e, jqxhr, settings) {

																																if(settings.url.indexOf('wc-ajax=checkout') !== -1 || settings.url.indexOf('wc-ajax=wcstripe_create_order') !== -1 ||  (settings.url.indexOf('wc-ajax=wc_stripe_frontend_request') !== -1 && settings.url.indexOf('path=/wc-stripe/v1/checkout') !== -1) || settings.url.indexOf('wc-ajax=wc_stripe_create_order') !== -1 || settings.url.indexOf('wc-ajax=wcpay_create_order') !== -1 || settings.url.indexOf('wc-ajax=wc_ajax_square_digital_wallet_process_checkout') !== -1){

																																					   setTimeout(function() { 

																																							   if (jQuery(".woocommerce-error").is(":visible") || jQuery(".woocommerce_error").is(":visible")) {

																																							   <?php if ('yes' == $use_v2_along_v3) : ?>




																																											   if(jQuery("#cf-turnstile_error_v3").length){

																																													   if (typeof jQuery("#cf-turnstile_error_v3").data('reload') !== 'undefined'){
																																															   if(jQuery("#cf-turnstile_error_v3").data('reload')=='1'){
																																															   location.reload();
																																															   }
																																													   }
																																										  }



																																			   <?php endif; ?>       


																																					   }

																																			   }, 3000);

																															   }

																													   });    
										
											
												<?php if ('yes'==$use_v2_along_v3) : ?>                                        
													jQuery(document).on('checkout_error', function () {
																											
													setTimeout(function() { 
														if(jQuery("#cf-turnstile_error_v3").length){

															jQuery(document.body).trigger("update_checkout");

														}
													}, 3000);
													});
											  <?php endif; ?>
																							  
																										setTimeout(function(){

																												if(jQuery('#place_order').length>0){  

																													  jQuery('#place_order').attr('title', '');
																													  jQuery('#place_order').prop('disabled', false);
																											  }

																									  }, 60000);

										});
										
										function i13RenderReCaptchaV3(){
											
											
																							 try{
																										
																										if(window.turnstile_woo_checkout_i13===null){
																										 
																											  
																														window.turnstile_woo_checkout_i13= window.turnstile.render('.turnstile-woo-checkout-i13', {
																															sitekey: "<?php echo esc_html( $site_key ); ?>",
																															size: "invisible",
																															action: "<?php echo esc_html( $i13_recapcha_checkout_action_v3 ); ?>" ,
																															'response-field':"false" ,
																															'response-field-name':'i13_recaptcha_checkout_token',
																															callback: onSuccessWoocheckout
																														  });
																												  
																										  }
																										  
																										if(window.turnstile_woo_checkout_fallback_i13===null ){  
																										
																											 
																													window.turnstile_woo_checkout_fallback_i13 = window.turnstile.render('.turnstile-woo-checkout-fallback-i13', {
																													  sitekey: "<?php echo esc_html( $site_key ); ?>",
																													  size: "invisible",
																													  action: "<?php echo esc_html( $i13_recapcha_checkout_action_v3 ); ?>" ,
																													  'response-field':"false" ,
																													  'response-field-name':'i13_recaptcha_checkout_token_fallback',
																													  callback: onSuccessWoocheckout
																													});
																												
																										  }
																									}
																									catch (error){

																											  if(jQuery('#place_order').length>0){

																													jQuery('#place_order').attr('title', '');
																													jQuery('#place_order').prop('disabled', false);

																											}

																									}
											 
											
										}
																				function onSuccessWoocheckout(token) {


																						if(jQuery('#place_order').length>0){

																									jQuery('#place_order').attr('title', '');
																									jQuery('#place_order').prop('disabled', false);

																							}
																				 }
				</script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	public function i13woo_extra_login_fields() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
				
		if ('v3'==strtolower($reCapcha_version)) {

			$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_woo_login')) {

					$reCapcha_version='v2';
				}
			}
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_woo_login' );
			$i13_recapcha_hide_label_login = get_option( 'i13_recapcha_hide_label_login' );
			$captcha_lable = get_option( 'i13_recapcha_login_title' );
			$captcha_lable_ = $captcha_lable;

			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_login_theme' );
			$size = get_option( 'i13_recapcha_login_size' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_login' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );
			$unique_id = uniqid( 'cf-turnstile-login-i13_' );
			$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );

			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );

			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {

								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );

								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha' );
				?>
				<p class="woo-login-captcha woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
				<?php
				if ( 'yes' != $i13_recapcha_hide_label_login ) :
					?>
						<label for="<?php echo esc_html( $unique_id ); ?>"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;<span class="required">*</span></label>
					<?php
				endif;
				?>
												
								<div id="<?php echo esc_html( $unique_id ); ?>" name="turnstile-recaptcha-woo-login-i13" class="turnstile-recaptcha-woo-login-i13" data-callback="verifyCallback_woo_login"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-callback="verifyCallback_woo_login" data-response-field="false" data-response-field-name="i13_recaptcha_woo_login_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
				
				<input type="hidden" value="" name="i13_recaptcha_login_token_v2" id="i13_recaptcha_login_token_v2"  />

				</p>



				<!-- do_not_format_javascript --><script type="text/javascript" id="woo_recaptcha_login_v2">



				function intval_woo_login_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_woo_login_ready(' + f + ')', 9) : f()
					}
					
				  intval_woo_login_ready(function () { 
					  
								try{
									
									if ((typeof (window.turnstile) == 'undefined' ||  typeof (window.turnstile.render) == 'undefined') && el_i13_login_captcha == null){

									jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=reRender_Woo_Login_Captcha", function() {



									});
																	}
																	else{
															
															
																			 try{
																								el_i13_login_captcha= window.turnstile.render('.turnstile-recaptcha-woo-login-i13', {
																								'sitekey': '<?php echo esc_html( $site_key ); ?>',
																								 'callback' : verifyCallback_woo_login,
																								 'response-field':'false' ,
																								  'response-field-name':'i13_recaptcha_woo_login_token_v2',
																								  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																							  });
																			  } catch (error){}
															
									
								}


							} catch (error){}



							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
									jQuery('button[name$="login"]').attr("disabled", true);
								<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
										jQuery('button[name$="login"]').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
								<?php else : ?>
										jQuery('button[name$="login"]').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
								<?php endif; ?>

							<?php endif; ?>
					
					});
					
					var verifyCallback_woo_login = function(response) {

						 if (response.length !== 0){

							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
								jQuery('button[name$="login"]').removeAttr("title");
								jQuery('button[name$="login"]').attr("disabled", false);
							<?php endif; ?>


							if (typeof woo_login_captcha_verified === "function") {

									woo_login_captcha_verified(response);
								}

							}

					  };
					   function reRender_Woo_Login_Captcha(){


							try{

									var myNodeList = document.querySelectorAll('.turnstile-recaptcha-woo-login-i13');
											Array.from(myNodeList).forEach(function(el) {

									if (el.childElementCount == 0){

											try{
													
																								el_i13_login_captcha= window.turnstile.render('.turnstile-recaptcha-woo-login-i13', {
																								   'sitekey': '<?php echo esc_html( $site_key ); ?>',
																									'callback' : verifyCallback_woo_login,
																									'response-field':'false' ,
																									 'response-field-name':'i13_recaptcha_woo_login_token_v2',
																									 'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																								 });
																										
											} catch (error){}


									}
									else{


																				window.turnstile.reset(window.el_i13_login_captcha);    
										
									}
								 });
							} 
							catch (error){}

								<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>

											jQuery('button[name$="login"]').attr("disabled", true);
									<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
																						jQuery('button[name$="login"]').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
								<?php else : ?>
											jQuery('button[name$="login"]').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
								<?php endif; ?>

							<?php endif; ?>

							}




				</script><!-- end_do_not_format_javascript -->


				<?php
			}
		} else {
						
			$is_enabled = get_option( 'i13_recapcha_enable_on_login' );
						
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
			//$i13_token_generation_v3_woo_login = get_option( 'i13_recapcha_wp_disable_submit_token_generation_v3_woo_login' );
						$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
			if (''== $i13_recapcha_msg_token_generation) {

				$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
			}

			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha-v3' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_login_action_v3 = get_option( 'i13_recapcha_login_action_v3' );
				if ( '' == trim( $i13_recapcha_login_action_v3 ) ) {

					$i13_recapcha_login_action_v3 = 'login';
				}

				/*if ( '' == trim( $i13_token_generation_v3_woo_login ) ) {

					$i13_token_generation_v3_woo_login = 'no';
				}
								 * 
								 */
				?>
				
								<div id="turnstile-woo-login-i13" class="turnstile-woo-login-i13" ></div>
				<!-- do_not_format_javascript --><script type="text/javascript" id="woo_recaptcha_login_v3">

									window.turnstile_woo_login_i13=null;	
								   document.addEventListener('readystatechange', function () {

												if (document.readyState === 'interactive') {
														element = document.querySelector('[name="login"]');
													   if (typeof(element) != 'undefined' && element != null)
													   {
														   element.disabled = true;
														   element.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
													   }
												}
								   });
				function intval_woo_login_v3_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_woo_login_v3_ready(' + f + ')', 9) : f()
					}
					
				  intval_woo_login_v3_ready(function () { 
					  
										  
											   

						 if ((typeof (window.turnstile) == 'undefined'  ||  typeof (window.turnstile.render) == 'undefined') && el_i13_login_captcha == null){

								 jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&onload=reRender_Woo_Login_Captcha_v3", function() {


							});
						}
												else{
																 reRender_Woo_Login_Captcha_v3();
														}



						setInterval(function() {

																			if(typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.reset) !== 'undefined'){
																							 try{

																									window.turnstile.reset(window.turnstile_woo_login_i13);
																								}
																								catch (error){

																									console.log(error);
																								}

																			 }

														}, 80 * 1000);
												
				



													setTimeout(function(){ 

														   if(jQuery('[name="login"]').length>0){

																   jQuery('[name="login"]').attr('title', '');
																   jQuery('[name="login"]').prop('disabled', false);
														   }

												   }, 60000);
				   

					});
					function reRender_Woo_Login_Captcha_v3(){

						
														 try{


															window.el_i13_login_captcha = window.turnstile.render('.turnstile-woo-login-i13', {
																sitekey: "<?php echo esc_html( $site_key ); ?>",
																size: "invisible",     
																action: "<?php echo esc_html( $i13_recapcha_login_action_v3 ); ?>" ,
																'response-field':"false" ,
																'response-field-name':'i13_recaptcha_woo_login_token',
																callback: onSuccessWoologin      
															  });

														}
														catch (error){

																 if(jQuery('[name="login"]').length>0){
																		jQuery('[name="login"]').attr('title', '');
																		jQuery('[name="login"]').prop('disabled', false);

																} 

														}
														
								
							

					}

										 function onSuccessWoologin(token) {
								
													 
												if(jQuery('[name="login"]').length>0){
															jQuery('[name="login"]').attr('title', '');
															jQuery('[name="login"]').prop('disabled', false);

													} 
										  }

				</script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	public function i13_woo_ajax_form_executes() {

		if ( ! is_user_logged_in() ) {

			wp_enqueue_script( 'jquery' );
			$reCapcha_version = get_option( 'i13_turnstile_version' );
			if ( '' == $reCapcha_version ) {
				$reCapcha_version = 'v2';
			}

			$i13_recapcha_using_ajax_registration_v2 = get_option( 'i13_recapcha_using_ajax_registration_v2' );
			$i13_recapcha_using_ajax_registration_v3 = get_option( 'i13_recapcha_using_ajax_registration_v3' );
			$i13_recapcha_using_ajax_login_v2 = get_option( 'i13_recapcha_using_ajax_login_v2' );
			$i13_recapcha_using_ajax_login_v3 = get_option( 'i13_recapcha_using_ajax_login_v3' );
			$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
			$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
			?>
			<?php if ( ( 'v2' == strtolower( $reCapcha_version ) && ( 'yes' == $i13_recapcha_using_ajax_login_v2 || 'yes' == $i13_recapcha_using_ajax_registration_v2 ) ) || ( 'v3' == strtolower( $reCapcha_version ) && ( 'yes' == $i13_recapcha_using_ajax_login_v3 || 'yes' == $i13_recapcha_using_ajax_registration_v3 ) ) ) : ?>

				<!-- do_not_format_javascript --><script type="text/javascript">

					function intval_woo_ajax_signup_ready(f) {
						   /in/.test(document.readyState) ? setTimeout('intval_woo_ajax_signup_ready(' + f + ')', 9) : f()
						}

					  intval_woo_ajax_signup_ready(function () { 

							jQuery(document).ajaxComplete(function(event, xhr, options)
							{

							<?php if ( 'v2' == strtolower( $reCapcha_version ) ) : ?>

								<?php if ( 'yes' == $i13_recapcha_using_ajax_login_v2 ) : ?>

										if (typeof xhr.responseText !== 'undefined' && xhr.responseText.indexOf('woo_recaptcha_login_v2') !== - 1 && document.getElementById('woo_recaptcha_login_v2')){

										if (typeof (window.turnstile) == 'undefined' || typeof turnstile.render == 'undefined'  || el_i13_login_captcha == null){

										jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=reRender_Woo_Login_Captcha", function() {



										});
									}
									 else{

											reRender_Woo_Login_Captcha();
										}

									 jQuery(document).ajaxSend(function(event, jqxhr, settings) {

											if (typeof settings.data !== 'undefined' && settings.data.indexOf('i13_recaptcha_login_token_v2') !== - 1){

											reRender_Woo_Login_Captcha();
											}
									});
							}
					<?php endif; ?>

								<?php if ( 'yes' == $i13_recapcha_using_ajax_registration_v2 ) : ?>

							if (typeof xhr.responseText !== 'undefined' && xhr.responseText.indexOf('woo_recaptcha_register_v2') !== - 1 && document.getElementById('woo_recaptcha_register_v2')){

									if (typeof window.turnstile == 'undefined' || typeof turnstile.render == 'undefined' || el_i13_register_captcha == null){

									jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=reRender_Woo_Signup_Captcha", function() {


									});
								}
								else{

										 reRender_Woo_Signup_Captcha();
								}


							jQuery(document).ajaxSend(function(event, jqxhr, settings) {

									 if (typeof settings.data !== 'undefined' && settings.data.indexOf('woo_recaptcha_register_v2') !== - 1){

										reRender_Woo_Signup_Captcha();
									}
								});
							}

					<?php endif; ?>
				<?php else : ?>

					<?php if ( 'yes' == $i13_recapcha_using_ajax_login_v3 ) : ?>

							if (typeof xhr.responseText !== 'undefined' && xhr.responseText.indexOf('woo_recaptcha_login_v3') !== - 1 && document.getElementById('woo_recaptcha_login_v3')){


							if (typeof (window.turnstile) == 'undefined' || typeof turnstile.render == 'undefined'  || el_i13_login_captcha == null){

									jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&render=<?php echo esc_html( $site_key ); ?>&onload=reRender_Woo_Login_Captcha_v3", function() {


									});
							}
							else{

									reRender_Woo_Login_Captcha_v3();
							}

							jQuery(document).ajaxSend(function(event, jqxhr, settings) {


									if (typeof settings.data !== 'undefined' && settings.data.indexOf('i13_recaptcha_woo_login_token') !== - 1){

										   reRender_Woo_Login_Captcha_v3();
									}




									});
							}
					<?php endif; ?>

					<?php if ( 'yes' == $i13_recapcha_using_ajax_registration_v3 ) : ?>

							if (typeof xhr.responseText !== 'undefined' && xhr.responseText.indexOf('woo_recaptcha_register_v3') !== - 1 && document.getElementById('woo_recaptcha_register_v3')){


							if (typeof window.turnstile == 'undefined' || el_i13_register_captcha == null){

								jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&render=<?php echo esc_html( $site_key ); ?>&onload=reRender_Woo_Signup_Captcha_v3", function() {




									});
							}
							else{

								 reRender_Woo_Signup_Captcha_v3();
							}

							jQuery(document).ajaxSend(function(event, jqxhr, settings) {


									if (settings.data.indexOf('i13_recaptcha_register_token') !== - 1){

											reRender_Woo_Signup_Captcha_v3();
									}




									});
						}


					<?php endif; ?>

				<?php endif; ?>

					});
					
			   });
			 </script><!-- end_do_not_format_javascript -->

			<?php endif; ?>

			<?php
		}
	}

	public function i13woo_extra_checkout_fields_pay_order() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

		if ('v3'==strtolower($reCapcha_version)) {

				$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_woo_pay_order')) {

					$reCapcha_version='v2';
				}
			}
		}
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$is_enabled_gcheckout = get_option( 'i13_recapcha_enable_on_guestcheckout' );
			$is_enabled_login_checkout = get_option( 'i13_recapcha_enable_on_logincheckout' );

			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_payfororder' );
			$i13_recapcha_hide_label_checkout = get_option( 'i13_recapcha_hide_label_checkout' );
			$captcha_lable = get_option( 'i13_recapcha_guestcheckout_title' );
			$captcha_lable_ = get_option( 'i13_recapcha_guestcheckout_title' );
			$refresh_lable = get_option( 'i13_recapcha_guestcheckout_refresh' );
			if ( '' == esc_html( $refresh_lable ) ) {

				$refresh_lable = __( 'Refresh Captcha', 'recaptcha-for-woocommerce' );
			}
			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_guestcheckout_theme' );
			$size = get_option( 'i13_recapcha_guestcheckout_size' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_payfororder' );
			$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );

			if ( 'yes' == $is_enabled ) {

				wp_enqueue_script( 'jquery' );
				if ( ( '' == $is_enabled_gcheckout || 'no' == $is_enabled_gcheckout ) && ! is_user_logged_in() ) {

					wp_enqueue_script( 'i13-woo-captcha' );
				}

				if ( ( '' == $is_enabled_login_checkout || 'no' == $is_enabled_login_checkout ) && is_user_logged_in() ) {

					wp_enqueue_script( 'i13-woo-captcha' );
				}
				?>
				<p class="payorder-checkout-recaptcha woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
				<?php
				if ( 'yes' != $i13_recapcha_hide_label_checkout ) :
					?>
						<label for="cf-turnstile-checkout-i13"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;<span class="required">*</span></label>
					<?php
				endif;
				?>
				<div id="cf-turnstile-checkout-i13" name="cf-turnstile-checkout-i13" class="cf-turnstile-checkout-i13" data-callback="verifyCallback_add_guestcheckout"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_checkout_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
				<div id='refresh_captcha' style="width:100%;padding-top:5px"> 
					<a href="javascript:window.turnstile.reset(myCaptcha);" style="clear:both"><?php echo esc_html( $refresh_lable ); ?></a>
				</div> 
				</p>
				<!-- do_not_format_javascript --><script type="text/javascript">
					var myCaptcha = null;
					 recap_val = null;
					function intval_pay_for_order_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_pay_for_order_ready(' + f + ')', 9) : f()
					}
					
				  intval_pay_for_order_ready(function () { 
					  
						<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
								jQuery("#place_order").attr("disabled", true);
							<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
									jQuery("#place_order").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
							<?php else : ?>
									jQuery("#place_order").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
							<?php endif; ?>
						<?php endif; ?>



													 if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined' && myCaptcha === null) {
													   
																															i13renderReCaptchaV2();

																											}
																											else{



																													jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=i13renderReCaptchaV2", function() {


																													});
																											}
		
					

																											jQuery(document).on('updated_checkout', function () {

																													if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.render) !== 'undefined' && window.myCaptcha === null) {

																													try{



																																	 myCaptcha= window.turnstile.render('.cf-turnstile-checkout-i13', {
																																						'sitekey': '<?php echo esc_html( $site_key ); ?>',
																																						 'callback' : verifyCallback_add_guestcheckout,
																																						 'response-field':'false' ,
																																						  'response-field-name':'i13_recaptcha_checkout_token_v2',
																																						  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																																					  });






																													} catch (error){}

																													}
																											});
										   
													if (!window.i13_ppc_v2_interceptor_loaded) {
														window.i13_ppc_v2_interceptor_loaded = true;
													
													 (function() {
																	const originalFetch = window.fetch;
																	  window.i13_ppc_alert_shown = false;    
																	
																	function stripHtml(html) {
																		if (!html) return '';
																		const tmp = document.createElement('div');
																		tmp.innerHTML = html;
																		return tmp.textContent || tmp.innerText || '';
																	}

																	window.fetch = async function(input, init) {
																		const url = (typeof input === "string") ? input : (input?.url || "");

																		if (!url.includes("ppc-create-order")) {
																			return originalFetch.apply(this, arguments);
																		}

																		 if (url.includes("ppc-create-order")) {
																				window.i13_ppc_alert_shown = false;

																				if (window.__i13_ppc_last_call && Date.now() - window.__i13_ppc_last_call < 300) {
																					return originalFetch.call(this, input, init);
																				}

																				window.__i13_ppc_last_call = Date.now();
																			}
																		try {
																			
																			
																			if(window.recap_val==null || window.recap_val==''){
																				setTimeout(() => alert('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>'), 2000);
																				return Promise.reject('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>');
																			}

																			const options = { ...init };
																			if (options.body && typeof options.body === "string") {
																				const bodyObj = JSON.parse(options.body);
																				bodyObj.recaptcha_token = window.recap_val;
																				bodyObj.recaptcha_i13_nonce = '<?php echo esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block')); ?>';
																				bodyObj.cookiehash_i13 = '<?php echo esc_html(COOKIEHASH_I13); ?>';
																				bodyObj.js_context = 'inline';
																				bodyObj.recap_v = 'v2';
																				options.body = JSON.stringify(bodyObj);
																			}

																			const response = await originalFetch.call(this, input, options);

																			 if (response.status === 400) {
																				try {
																					const errorData = await response.clone().json();
																					if (errorData && JSON.stringify(errorData).includes('cf-recaptcha_error_v2')) {
																						let message = '❌ Checkout failed. Please try again.';
																						if (errorData.data?.message) {
																							message = stripHtml(errorData.data.message);
																						} else if (errorData.message) {
																							message = stripHtml(errorData.message);
																						}

																						setTimeout(() => {
																							
																							 if(window.i13_ppc_alert_shown==false){
																								 
																								window.i13_ppc_alert_shown=true; 
																								alert(message);
																							}
																						
																						}, 2000);
																					}
																				} catch (parseError) {
																					console.error('Error parsing error response:', parseError);
																				}
																			}

																			return response;

																		} catch (error) {
																			console.error('PayPal fetch interceptor error:', error);
																			throw error;
																		}
																	};
																})();
														   }
																												   
																													jQuery(document).ajaxSend(function (event, jqxhr, settings) {


																															   if(settings.url.indexOf('wc-ajax=checkout') !== -1 || settings.url.indexOf('wc-ajax=wcstripe_create_order') !== -1 ||  (settings.url.indexOf('wc-ajax=wc_stripe_frontend_request') !== -1 && settings.url.indexOf('path=/wc-stripe/v1/checkout') !== -1) || settings.url.indexOf('wc-ajax=wc_stripe_create_order') !== -1 || settings.url.indexOf('wc-ajax=wcpay_create_order') !== -1 || settings.url.indexOf('wc-ajax=wc_ajax_square_digital_wallet_process_checkout') !== -1){
																																   if(window.recap_val!==null && window.recap_val!='' && settings.data.indexOf('i13_recaptcha_checkout_token_v2' + '=') === -1 ){
																																				   settings.data = settings.data + '&i13_recaptcha_checkout_token_v2=' + window.recap_val;
																																   }
																															   }



																													});
										
					
															});
							var verifyCallback_add_guestcheckout = function(response) {

							if (response.length !== 0){

									window.recap_val = response;
									<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
										jQuery("#place_order").removeAttr("title");
										jQuery("#place_order").attr("disabled", false);
									<?php endif; ?>

							if (typeof woo_guest_checkout_recaptcha_verified === "function") {

									woo_guest_checkout_recaptcha_verified(response);
								}
							}

						};
											
											
						 function i13renderReCaptchaV2(){
													
															 try{
																		if(myCaptcha===null){
																			myCaptcha= window.turnstile.render('.cf-turnstile-checkout-i13', {
																					'sitekey': '<?php echo esc_html( $site_key ); ?>',
																					 'callback' : verifyCallback_add_guestcheckout,
																					 'response-field':'false' ,
																					  'response-field-name':'i13_recaptcha_checkout_token_v2',
																					  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																				  });
																		 }
																				  
															 } catch (error){}
												}
					</script><!-- end_do_not_format_javascript -->
				<?php
			}
		} else {

			$is_enabled_gcheckout = get_option( 'i13_recapcha_enable_on_guestcheckout' );
			$is_enabled_login_checkout = get_option( 'i13_recapcha_enable_on_logincheckout' );

			$is_enabled = get_option( 'i13_recapcha_enable_on_payfororder' );
						
						$captcha_lable_ = get_option( 'i13_recapcha_guestcheckout_title' );
						$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );

			/*$i13_recapcha_wp_disable_to_woo_checkout = get_option( 'i13_recapcha_wp_disable_submit_token_generation_v3_woo_checkout' );*/
			if ( 'yes' == $is_enabled ) {

				wp_enqueue_script( 'jquery' );

				if ( ( '' == $is_enabled_gcheckout || 'no' == $is_enabled_gcheckout ) && ! is_user_logged_in() ) {

					wp_enqueue_script( 'i13-woo-captcha-v3' );
				}

				if ( ( '' == $is_enabled_login_checkout || 'no' == $is_enabled_login_checkout ) && is_user_logged_in() ) {

					wp_enqueue_script( 'i13-woo-captcha-v3' );
				}

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_checkout_action_v3 = get_option( 'i13_recapcha_checkout_action_v3' );
				if ( '' == $i13_recapcha_checkout_action_v3 ) {

					$i13_recapcha_checkout_action_v3 = 'checkout';
				}
				
								
				$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
				if (''== $i13_recapcha_msg_token_generation) {

					$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
				}
				?>
				<div id="turnstile-woo-checkout-i13" class="turnstile-woo-checkout-i13" ></div>
				<div id="turnstile-woo-checkout-fallback-i13" class="turnstile-woo-checkout-fallback-i13" ></div>
				
				<!-- do_not_format_javascript --><script type="text/javascript">

				 window.turnstile_woo_checkout_i13=null;
								window.turnstile_woo_checkout_fallback_i13=null;	
								document.addEventListener('readystatechange', function () {
									 if (document.readyState === 'interactive') {
											 var element_i13_p =  document.getElementById('place_order');
											 if (typeof(element_i13_p) != 'undefined' && element_i13_p != null)
											 {
													 element_i13_p.disabled = true;
													 element_i13_p.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
											 }
									 }
									 });       
				 function intval_pay_for_order_ready_v3(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_pay_for_order_ready_v3(' + f + ')', 9) : f()
					}
					
				  intval_pay_for_order_ready_v3(function () { 
					  
										  
																							  
														if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined') {


																			i13RenderReCaptchaV3();

															}
															else{


																	jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&onload=i13RenderReCaptchaV3", function() {



																				 });
															}


							
								
																	
																	
							<?php if ('yes'==$use_v2_along_v3) : ?>                                        
																		jQuery(document).on('checkout_error', function () {

																		setTimeout(function() { 
																				if(jQuery("#cf-turnstile_error_v3").length){

																						jQuery(document.body).trigger("update_checkout");

																				}
																		}, 3000);
																		});
														  <?php endif; ?>
														
							 jQuery(document).ajaxComplete(function (e, jqxhr, settings) {

																if(settings.url.indexOf('wc-ajax=checkout') !== -1 || settings.url.indexOf('wc-ajax=wcstripe_create_order') !== -1 ||  (settings.url.indexOf('wc-ajax=wc_stripe_frontend_request') !== -1 && settings.url.indexOf('path=/wc-stripe/v1/checkout') !== -1) || settings.url.indexOf('wc-ajax=wc_stripe_create_order') !== -1 || settings.url.indexOf('wc-ajax=wcpay_create_order') !== -1 || settings.url.indexOf('wc-ajax=wc_ajax_square_digital_wallet_process_checkout') !== -1){

																					   setTimeout(function() { 

																							   if (jQuery(".woocommerce-error").is(":visible") || jQuery(".woocommerce_error").is(":visible")) {

																							   <?php if ('yes' == $use_v2_along_v3) : ?>




																											   if(jQuery("#cf-turnstile_error_v3").length){

																													   if (typeof jQuery("#cf-turnstile_error_v3").data('reload') !== 'undefined'){
																															   if(jQuery("#cf-turnstile_error_v3").data('reload')=='1'){
																															   location.reload();
																															   }
																													   }
																										  }



																			   <?php endif; ?>       


																					   }

																			   }, 3000);

															   }

													   });
						
				
						setInterval(function() {

													if (typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.reset) !== 'undefined') {
									
																		 try{

																				window.turnstile.reset(window.turnstile_woo_checkout_i13);
																			}
																			catch (error){

																				console.log(error);
																			}
																								
									
																				
								}
														
						}, 80 * 1000);
				

								
								
												setInterval(function() {


													  try{

													   window.turnstile.reset(window.turnstile_woo_checkout_fallback_i13);
												   }
												   catch (error){

													   console.log(error);
												   }

											   }, 100 * 1000);
										

											   if (!window.i13_ppc_v3_interceptor_loaded) {
													window.i13_ppc_v3_interceptor_loaded = true;

															(function() {
																	const originalFetch = window.fetch;
																	window.i13_ppc_alert_shown = false;    

																	function stripHtml(html) {
																			if (!html) return '';
																			const tmp = document.createElement('div');
																			tmp.innerHTML = html;
																			return tmp.textContent || tmp.innerText || '';
																	}

																	window.fetch = async function(input, init) {
																			const url = (typeof input === "string") ? input : (input?.url || "");

																			if (!url.includes("ppc-create-order")) {
																					return originalFetch.apply(this, arguments);
																			}

																			if (url.includes("ppc-create-order")) {
																					window.i13_ppc_alert_shown = false;

																					if (window.__i13_ppc_last_call && Date.now() - window.__i13_ppc_last_call < 300) {
																							return originalFetch.call(this, input, init);
																					}

																					window.__i13_ppc_last_call = Date.now();
																			}

																			try {
																					console.log("PayPal create order intercepted:", url, performance.now());

																					let tokenValX = turnstile.getResponse(window.turnstile_woo_checkout_i13);

																					if(tokenValX==null || tokenValX==''){

																							 tokenValX = turnstile.getResponse(window.turnstile_woo_checkout_fallback_i13);

																					}

																					if(!tokenValX || tokenValX==null || tokenValX==''){
																							setTimeout(() => alert('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>'), 2000);
																							return Promise.reject('<?php echo esc_html($recapcha_error_msg_captcha_blank); ?>');
																					}

																					const options = { ...init };
																					if (options.body && typeof options.body === "string") {
																							const bodyObj = JSON.parse(options.body);
																							bodyObj.recaptcha_token_v3 = tokenValX;
																							bodyObj.recaptcha_i13_nonce = '<?php echo esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block')); ?>';
																							bodyObj.cookiehash_i13 = '<?php echo esc_html(COOKIEHASH_I13); ?>';
																							bodyObj.js_context = 'inline';
																							bodyObj.recap_v = 'v3';
																							options.body = JSON.stringify(bodyObj);
																					}

																					const response = await originalFetch.call(this, input, options);

																					 if (response.status === 400) {
																							try {
																									const errorData = await response.clone().json();
																									if (errorData && JSON.stringify(errorData).includes('cf-recaptcha_error_v3')) {
																											let message = '❌ Checkout failed. Please try again.';
																											if (errorData.data?.message) {
																													message = stripHtml(errorData.data.message);
																											} else if (errorData.message) {
																													message = stripHtml(errorData.message);
																											}

																											setTimeout(() => {
																													if(window.i13_ppc_alert_shown==false){
																															window.i13_ppc_alert_shown=true;
																															alert(message);
																													}
																													<?php if ('yes' == $use_v2_along_v3) : ?>
																																const url = new URL(location.href);
																																url.searchParams.set('rand_i13', (Math.random() + 1).toString(36).substring(7));
																																location.assign(url.search);
																													<?php endif; ?>
																											}, 2000);
																									}
																							} catch (parseError) {
																									console.error('Error parsing error response:', parseError);
																							}
																					}

																					return response;

																			} catch (error) {
																					console.error('PayPal fetch interceptor error:', error);
																					throw error;
																			}
																	};
															})(); 
													}
													
													jQuery(document).ajaxSend(function(event, jqXHR, settings) {


															if(settings.url.indexOf('wc-ajax=checkout') !== -1 || settings.url.indexOf('wc-ajax=wcstripe_create_order') !== -1 ||  (settings.url.indexOf('wc-ajax=wc_stripe_frontend_request') !== -1 && settings.url.indexOf('path=/wc-stripe/v1/checkout') !== -1) || settings.url.indexOf('wc-ajax=wc_stripe_create_order') !== -1 || settings.url.indexOf('wc-ajax=wcpay_create_order') !== -1 || settings.url.indexOf('wc-ajax=wc_ajax_square_digital_wallet_process_checkout') !== -1){

																	try{

																		if(settings.data.indexOf('i13_recaptcha_checkout_token' + '=') === -1 ){
																			let tokenVal__ = turnstile.getResponse(window.turnstile_woo_checkout_i13);

																			if(tokenVal__!=null && tokenVal__!=''){
																					settings.data += '&i13_recaptcha_checkout_token='+tokenVal__;                                             


																			}
																		}

																		if(settings.data.indexOf('i13_recaptcha_checkout_token_fallback' + '=') === -1 ){
																			 tokenVal__ = turnstile.getResponse(window.turnstile_woo_checkout_fallback_i13);
																			if(tokenVal__!=null && tokenVal__!=''){
																					settings.data += '&i13_recaptcha_checkout_token_fallback='+tokenVal__;                                             


																			}
																		}

																	}
																	catch(error){


																	}

															}


													});
								

				  
												   
																			  
														setTimeout(function(){
																if(jQuery('#place_order').length>0){

																 jQuery('#place_order').attr('title', '');
																 jQuery('#place_order').prop('disabled', false);
														 }

															}, 60000);
										  
														});
						   
							 function i13RenderReCaptchaV3(){
											
											
																	try{

																			   if(window.turnstile_woo_checkout_i13===null){


																							   window.turnstile_woo_checkout_i13= window.turnstile.render('.turnstile-woo-checkout-i13', {
																								   sitekey: "<?php echo esc_html( $site_key ); ?>",
																								   size: "invisible",
																								   action: "<?php echo esc_html( $i13_recapcha_checkout_action_v3 ); ?>" ,
																								   'response-field':"false" ,
																								   'response-field-name':'i13_recaptcha_checkout_token',
																								   callback: onSuccessWoocheckout
																								 });

																				 }

																			   if(window.turnstile_woo_checkout_fallback_i13===null ){  


																						   window.turnstile_woo_checkout_fallback_i13 = window.turnstile.render('.turnstile-woo-checkout-fallback-i13', {
																							 sitekey: "<?php echo esc_html( $site_key ); ?>",
																							 size: "invisible",
																							 action: "<?php echo esc_html( $i13_recapcha_checkout_action_v3 ); ?>" ,
																							 'response-field':"false" ,
																							 'response-field-name':'i13_recaptcha_checkout_token_fallback',
																							 callback: onSuccessWoocheckout
																						   });

																				 }
																		   }
																		   catch (error){

																					 if(jQuery('#place_order').length>0){

																						   jQuery('#place_order').attr('title', '');
																						   jQuery('#place_order').prop('disabled', false);

																				   }

																		   }


													   }
														function onSuccessWoocheckout(token) {


																if(jQuery('#place_order').length>0){

																			jQuery('#place_order').attr('title', '');
																			jQuery('#place_order').prop('disabled', false);

																	}
														 }  
									   
			</script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	public function i13woo_extra_lostpassword_fields() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
				
				
		if ('v3'==strtolower($reCapcha_version)) {

			$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_woo_lostpass')) {

					$reCapcha_version='v2';
				}
			}
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_woo_lostpassword' );
			$i13_recapcha_hide_label_lostpassword = get_option( 'i13_recapcha_hide_label_lostpassword' );
			$captcha_lable = get_option( 'i13_recapcha_lostpassword_title' );
			$captcha_lable_ = $captcha_lable;
			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_lostpassword_theme' );
			$size = get_option( 'i13_recapcha_lostpassword_size' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_lostpassword' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );
						$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );

			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha' );
				?>
				<p class="woo-lost-password-captcha woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
				<?php
				if ( 'yes' != $i13_recapcha_hide_label_lostpassword ) :
					?>
						<label for="cf-turnstile-lostpassword-i13"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;<span class="required">*</span></label>
					<?php
				endif;
				?>
				<div id="cf-turnstile-lostpassword-i13" name="cf-turnstile-lostpassword-i13" class="cf-turnstile-lostpassword-i13" data-callback="verifyCallback_woo_lostpassword"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_woo_lp_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>


				</p>



				<!-- do_not_format_javascript --><script type="text/javascript">
						
					var capchaChecked = false;
					var myCaptcha = null;
							
					function intval_woo_forgotpass_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_woo_forgotpass_ready(' + f + ')', 9) : f()
					}
					
				  intval_woo_forgotpass_ready(function () { 
					  
										  
										  
															if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined' && myCaptcha === null) {

																			  i13renderRe_FP_CaptchaV2();

															  }
														  else{



																  jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=i13renderRe_FP_CaptchaV2", function() {


																  });
														  }
					  
							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
									jQuery('.woocommerce-Button').attr("disabled", true);
								<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
										jQuery('.woocommerce-Button').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
								<?php else : ?>
										jQuery('.woocommerce-Button').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
								<?php endif; ?>

							<?php endif; ?>
					
					});
					 var verifyCallback_woo_lostpassword = function(response) {

												if (response.length !== 0){

														<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
																		jQuery('.woocommerce-Button').removeAttr("title");
																		jQuery('.woocommerce-Button').attr("disabled", false);
																		capchaChecked = true;
														<?php endif; ?>

														if (typeof woo_lostpassword_captcha_verified === "function") {

																 woo_lostpassword_captcha_verified(response);
														}

												}

					 };
				<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
						jQuery('#password_1').on('keyup', function(){

						if (jQuery(".woocommerce-Button").is(":disabled") || capchaChecked == false){

								setTimeout(function(){ jQuery(".woocommerce-Button").attr("disabled", true); }, 500);
								}
						});
						jQuery('#password_1').on('blur', function(){

						if (jQuery(".woocommerce-Button").is(":disabled") || capchaChecked == false){

								setTimeout(function(){ jQuery(".woocommerce-Button").attr("disabled", true); }, 500);
								}
						});
						
						jQuery('#password_2').on('keyup', function(){

						  if (jQuery(".woocommerce-Button").is(":disabled") || capchaChecked == false){

								setTimeout(function(){ jQuery("#place_order").attr("disabled", true); }, 500);
						   }
						});
					   jQuery('#password_2').on('blur', function(){

						   if (jQuery(".woocommerce-Button").is(":disabled") || capchaChecked == false){

								setTimeout(function(){ jQuery("#place_order").attr("disabled", true); }, 500);
							}
						});
				<?php endif; ?>


								 function i13renderRe_FP_CaptchaV2(){
																	 
																	 
																	 
																				 try{
																								myCaptcha_fp= window.turnstile.render('.cf-turnstile-lostpassword-i13', {
																								'sitekey': '<?php echo esc_html( $site_key ); ?>',
																								 'callback' : verifyCallback_woo_lostpassword,
																								 'response-field':'false' ,
																								  'response-field-name':'i13_recaptcha_woo_lp_token_v2',
																								  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																							  });
																			  } catch (error){}
																			  

									
								   }

				</script><!-- end_do_not_format_javascript -->

				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_lostpassword' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
			/*$i13_generation_v3_woo_fpass = get_option( 'i13_recapcha_wp_disable_submit_token_generation_v3_woo_fpass' );*/
			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha-v3' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_lostpassword_action_v3 = get_option( 'i13_recapcha_lostpassword_action_v3' );
				if ( '' == trim( $i13_recapcha_lostpassword_action_v3 ) ) {

					$i13_recapcha_lostpassword_action_v3 = 'forgot_password';
				}
							
								
				$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
				if (''== $i13_recapcha_msg_token_generation) {

					$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
				}
				?>
								<div id="turnstile-woo-fp-i13" class="turnstile-woo-fp-i13" ></div>
				
				<!-- do_not_format_javascript --><script type="text/javascript">
										window.turnstile_woo_fp_i13=null;
										document.addEventListener('readystatechange', function () {
												if (document.readyState === 'interactive') {

																var form_fpass = document.querySelector('.lost_reset_password');
																var element_fpass = form_fpass?.querySelector('button[type="submit"], input[type="submit"]');
																if (typeof(element_fpass) != 'undefined' && element_fpass != null)
																{
																								element_fpass.disabled = true;
																								element_fpass.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
																}
												}
								   });
										   
									function intval_woo_forgotpass_v3_ready(f) {
									   /in/.test(document.readyState) ? setTimeout('intval_woo_forgotpass_v3_ready(' + f + ')', 9) : f()
									}

					  intval_woo_forgotpass_v3_ready(function () { 


												if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined') {


																	  i13_FP_RenderReCaptchaV3();

																}
																else{


																		jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&render=<?php echo esc_html( $site_key ); ?>&onload=i13_FP_RenderReCaptchaV3", function() {



																		});
																}



																setInterval(function() {

																			if(typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.reset) !== 'undefined'){
																							 try{

																									window.turnstile.reset(window.turnstile_woo_fp_i13);
																								}
																								catch (error){

																									console.log(error);
																								}

																			 }

																}, 80 * 1000);

																setTimeout(function(){ 

																		if( jQuery('.lost_reset_password').find(':submit').length>0){

																				jQuery('.lost_reset_password').find(':submit').attr('title', '');
																				jQuery('.lost_reset_password').find(':submit').prop('disabled', false);
																		}

																}, 60000);    
					

				 });
								 
									function i13_FP_RenderReCaptchaV3(){



												try{


													   window.turnstile_woo_fp_i13 = window.turnstile.render('.turnstile-woo-fp-i13', {
														   sitekey: "<?php echo esc_html( $site_key ); ?>",
														   size: "invisible",     
														   action: "<?php echo esc_html( $i13_recapcha_lostpassword_action_v3 ); ?>" ,
														   'response-field':"false" ,
														   'response-field-name':'i13_recaptcha_woo_fp_token',
														   callback: onSuccessWoofp      
														 });

												   }
												   catch (error){

														   if(jQuery('.lost_reset_password').find(':submit').length>0){

															   jQuery('.lost_reset_password').find(':submit').attr('title', '');
															   jQuery('.lost_reset_password').find(':submit').prop('disabled', false);

															   }

												   }




									}
									
									function onSuccessWoofp(){
									
										 if(jQuery('.lost_reset_password').find(':submit').length>0){

											jQuery('.lost_reset_password').find(':submit').attr('title', '');
											jQuery('.lost_reset_password').find(':submit').prop('disabled', false);

											}
									
									}
				</script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	public function i13woo_extra_wp_login_form() {
		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
				
		if ('v3'==strtolower($reCapcha_version)) {

			$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_wp_login')) {

					$reCapcha_version='v2';
				}
			}
		}
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_wp_login' );
			$i13_recapcha_hide_label_wplogin = get_option( 'i13_recapcha_hide_label_wplogin' );
			$captcha_lable = get_option( 'i13_recapcha_wplogin_title' );
			$captcha_lable_ = $captcha_lable;

			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );
						$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_wplogin_theme' );
			$size = get_option( 'i13_recapcha_wplogin_size' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wplogin' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );
			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha' );
				?>
				<input type="hidden" autocomplete="off" name="wp-login-nonce" value="<?php echo esc_html( wp_create_nonce( 'wp-login-nonce' ) ); ?>" />
				<p class="i13_woo_wp_login_captcha">
				<?php
				if ( 'yes' != $i13_recapcha_hide_label_wplogin ) :
					?>
						<label for="turnstile-wp-login-i13"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;</label>
					<?php
				endif;
				?>
				<div id="turnstile-wp-login-i13" name="turnstile-wp-login-i13" class="turnstile-wp-login-i13" data-callback="verifyCallback_wp_login"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_wp_login_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
				<br/>


				</p>



				<!-- do_not_format_javascript --><script type="text/javascript">
					myCaptchaWpLogin=null;      
					  function intval_wp_login_ready(f) {
						   /in/.test(document.readyState) ? setTimeout('intval_wp_login_ready(' + f + ')', 9) : f()
						}

					  intval_wp_login_ready(function () { 

							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
									jQuery('#wp-submit').attr("disabled", true);
																			if(jQuery('[name="sensi-login-form"]').find('[name="login"]').length>0){

																					jQuery('[name="sensi-login-form"]').find('[name="login"]').attr("disabled", true);
																			}  
								<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
										jQuery('#wp-submit').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
																				if(jQuery('[name="sensi-login-form"]').find('[name="login"]').length>0){

																						jQuery('[name="sensi-login-form"]').find('[name="login"]').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
																				}  
								<?php else : ?>
										jQuery('#wp-submit').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
																				if(jQuery('[name="sensi-login-form"]').find('[name="login"]').length>0){

																						jQuery('[name="sensi-login-form"]').find('[name="login"]').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
																				}  
								<?php endif; ?>
							<?php endif; ?>


														
													if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.render) !== 'undefined' && myCaptchaWpLogin === null) {

															  i13renderWpLoginCaptchaV2();

													  }
													  else{

																	  jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=i13renderWpLoginCaptchaV2&render=explicit", function() {



																	});
													  }
														  
						});
							var verifyCallback_wp_login = function(response) {

							if (response.length !== 0){


								<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
									jQuery('#wp-submit').removeAttr("title");
									jQuery('#wp-submit').attr("disabled", false);
																		
																		if(jQuery('[name="sensi-login-form"]').find('[name="login"]').length>0){

																					   jQuery('[name="sensi-login-form"]').find('[name="login"]').removeAttr("title");
																					   jQuery('[name="sensi-login-form"]').find('[name="login"]').attr("disabled", false);
																			   }  
								<?php endif; ?>


							if (typeof woo_wp_login_captcha_verified === "function") {

								 woo_wp_login_captcha_verified(response);
								}
							}

						};
												
												
											function i13renderWpLoginCaptchaV2(){

													  try{
																	  myCaptchaWpLogin = window.turnstile.render('.turnstile-wp-login-i13', {
																	  'sitekey': '<?php echo esc_html( $site_key ); ?>',
																	   'callback' : verifyCallback_wp_login,
																	   'response-field':'false',
																	   'response-field-name':'i13_recaptcha_wp_login_token_v2',
																	   'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																	   
																	  });
													  } catch (error){}
											  }
				   </script><!-- end_do_not_format_javascript -->
				<?php if ( 'compact' != $size ) : ?>                                       
					<style type="text/css">
						[name="turnstile-wp-login-i13"]{
							transform:scale(0.89);
							-webkit-transform:scale(0.89);
							transform-origin:0 0;
							-webkit-transform-origin:0 0;
						}
					</style>  
				<?php endif; ?>            
				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_wplogin' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha-v3' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_wp_login_action_v3 = get_option( 'i13_recapcha_wp_login_action_v3' );
				if ( '' == trim( $i13_recapcha_wp_login_action_v3 ) ) {

					$i13_recapcha_wp_login_action_v3 = 'wp_login';
				}
								
				$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
				if (''== $i13_recapcha_msg_token_generation) {

					$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
				}
				?>
										
								<input type="hidden" autocomplete="off" name="wp-login-nonce" value="<?php echo esc_html( wp_create_nonce( 'wp-login-nonce' ) ); ?>" />
				
								<div id="turnstile-wp-login-i13" class="turnstile-wp-login-i13" data-response-field="false" data-response-field-name="i13_recaptcha_wp_login_token" ></div>
				<br/>
				<!-- do_not_format_javascript --><script type="text/javascript">
							
								window.turnstile_wp_login_i13=null;
								document.addEventListener('readystatechange', function () {
								   if (document.readyState === 'interactive') {
												 var element_i13_l =  document.getElementById('wp-submit');
												   if (typeof(element_i13_l) != 'undefined' && element_i13_l != null)
												   {
																				   element_i13_l.disabled = true;
																				   element_i13_l.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
												   }
								   }
								 });

								 
																 
								 
								 
				function intval_wp_login_v3_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_wp_login_v3_ready(' + f + ')', 9) : f()
					}
					
				  intval_wp_login_v3_ready(function () { 
					  
										  
										  if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined') {
			   

												i13renderWpLoginCaptchaV3();

											}
											else{


													jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&onload=i13renderWpLoginCaptchaV3&render=explicit", function() {



													});
											}

					
				
																setInterval(function() {

																					if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.reset) !== 'undefined' && window.turnstile_wp_login_i13!=null) {
																						
																										try{
																								
																											window.turnstile.reset(window.turnstile_wp_login_i13);
																										}
																										catch (error){
										 
																											console.log(error);
																										}

																						 }
								}, 80 * 1000);
								
					   
					
			
												jQuery(document).ajaxStart(function() {

							if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.reset) !== 'undefined' && window.turnstile_wp_login_i13!=null) {
																						
																	try{

																		window.turnstile.reset(window.turnstile_wp_login_i13);
																	}
																	catch (error){
																		
																		console.log(error);

																	}

															 }
														
						});
						jQuery(document).ajaxStop(function() {

							if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.reset) !== 'undefined' && window.turnstile_wp_login_i13!=null) {
																						
																	try{

																		window.turnstile.reset(window.turnstile_wp_login_i13);
																	}
																	catch (error){

																		console.log(error);
																	}

															 }
						});
												
												
												setTimeout(function(){

														if(jQuery('[name="wp-submit"]').length>0){

																jQuery('[name="wp-submit"]').attr('title', '');
																jQuery('[name="wp-submit"]').prop('disabled', false);
														}

												}, 60000);

				});
								
								function i13renderWpLoginCaptchaV3(){

										try{


											window.turnstile_wp_login_i13 = window.turnstile.render('.turnstile-wp-login-i13', {
												sitekey: "<?php echo esc_html( $site_key ); ?>",
												size: "invisible",     
												action: "<?php echo esc_html( $i13_recapcha_wp_login_action_v3 ); ?>" ,
												'response-field':'false',
												 'response-field-name':'i13_recaptcha_wp_login_token',
												  callback: onSuccessWpLogin      
											  });

										}
										catch (error){
										 
												var element =  document.getElementById('wp-submit');
												if (typeof(element) != 'undefined' && element != null)
												{
																document.getElementById("wp-submit").disabled = false;
												}

										}


								}
								
								function onSuccessWpLogin(token) {
								
									
										if(jQuery('[name="wp-submit"]').length>0){

										   jQuery('[name="wp-submit"]').attr('title', '');
										   jQuery('[name="wp-submit"]').prop('disabled', false);
									   }
								  }
			   </script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	public function i13woo_extra_wp_lostpassword_form() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
				
		if ('v3'==strtolower($reCapcha_version)) {

			$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_wp_forgotpassword')) {

					$reCapcha_version='v2';
				}
			}
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_wp_lost_password' );
			$i13_recapcha_hide_label_wplostpassword = get_option( 'i13_recapcha_hide_label_wplostpassword' );
			$captcha_lable = get_option( 'i13_recapcha_wplostpassword_title' );
			$captcha_lable_ = $captcha_lable;
			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_wplostpassword_theme' );
			$size = get_option( 'i13_recapcha_wplostpassword_size' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wplostpassword' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );
			$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'recaptcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );

			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha' );
				?>
				<input type="hidden" autocomplete="off" name="wp-lostpassword-nonce" value="<?php echo esc_html( wp_create_nonce( 'wp-lostpassword-nonce' ) ); ?>" />
				<p class="i13_woo_wp_forgopt_password_captcha" >
				<?php
				if ( 'yes' != $i13_recapcha_hide_label_wplostpassword ) :
					?>
						<label for="turnstile-recaptcha-wp-lostpassword-i13"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;</label>
					<?php
				endif;
				?>
								<div id="turnstile-recaptcha-wp-lostpassword-i13" name="turnstile-recaptcha-wp-lostpassword-i13" class="turnstile-recaptcha-wp-lostpassword-i13" data-callback="verifyCallback_wp_lostpassword"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-callback="verifyCallback_wp_lostpassword" data-response-field="false" data-response-field-name="i13_recaptcha_wp_lostpassword_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
								
				
				<br/>

				</p>


				<!-- do_not_format_javascript --><script type="text/javascript">

					myCaptchawp_los_pass=null; 
										
					function intval_wp_lostpass_ready(f) {
						   /in/.test(document.readyState) ? setTimeout('intval_wp_lostpass_ready(' + f + ')', 9) : f()
						}

					  intval_wp_lostpass_ready(function () { 
						  
							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
									jQuery('#wp-submit').attr("disabled", true);
								<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
										jQuery('#wp-submit').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
								<?php else : ?>
										jQuery('#wp-submit').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
								<?php endif; ?>
							<?php endif; ?>

														if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.render) !== 'undefined' && myCaptchawp_los_pass === null) {

																	 i13renderWpLostCaptchaV2();

															}
															else{

																			jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_turnstile_v2_lang ); ?>&onload=i13renderWpLostCaptchaV2", function() {



																					});
															}
														


					
					});
					var verifyCallback_woo_lost_password = function(response) {

											if (response.length !== 0){

															<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
																	jQuery('#wp-submit').removeAttr("title");
																	jQuery('#wp-submit').attr("disabled", false);
															<?php endif; ?>

															if (typeof woo_wp_lost_password_captcha_verified === "function") {

																			 woo_wp_lost_password_captcha_verified(response);
																	}
															}


											};
														
														
											function i13renderWpLostCaptchaV2(){

													  try{
																		myCaptchawp_los_pass= window.turnstile.render('.turnstile-recaptcha-wp-lostpassword-i13', {
																		'sitekey': '<?php echo esc_html( $site_key ); ?>',
																		 'callback' : verifyCallback_woo_lost_password,
																		 'response-field':"false" ,
																		  'response-field-name':'i13_recaptcha_wp_lostpassword_token_v2',
																		  'language':"<?php echo esc_html($i13_recapcha_v2_lang); ?>"
																	  });
													  } catch (error){}
													  
													
											}

				</script><!-- end_do_not_format_javascript -->
				<?php if ( 'compact' != $size ) : ?>                                       
					<style type="text/css">
						[name="turnstile-recaptcha-wp-lostpassword-i13"]{
							transform:scale(0.89);
							-webkit-transform:scale(0.89);
							transform-origin:0 0;
							-webkit-transform-origin:0 0;
						}
					</style>  
				<?php endif; ?>

				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_wplostpassword' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
			/*$i13_recapcha_wp_disable_submit_wp_fpass = get_option( 'i13_recapcha_wp_disable_submit_token_generation_v3_woo_wp_fpass' );*/
			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha-v3' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_wp_lost_password_method_action_v3 = get_option( 'i13_recapcha_wp_lost_password_method_action_v3' );
				if ( '' == trim( $i13_recapcha_wp_lost_password_method_action_v3 ) ) {

					$i13_recapcha_wp_lost_password_method_action_v3 = 'wp_forgot_password';
				}
				
								
				$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
				if (''== $i13_recapcha_msg_token_generation) {

					$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
				}
				?>
				<input type="hidden" autocomplete="off" name="wp-lostpassword-nonce" value="<?php echo esc_html( wp_create_nonce( 'wp-lostpassword-nonce' ) ); ?>" />
								<div id="turnstile-wp-lostpassword-i13" class="turnstile-wp-lostpassword-i13" ></div>
				<!-- do_not_format_javascript --><script type="text/javascript">
								window.turnstile_wp_lostpassword_i13=null;	
				document.onreadystatechange = function () {
										if (document.readyState === 'interactive') {
														var element =  document.getElementById('wp-submit');
														if (typeof(element) != 'undefined' && element != null)
														{
															document.getElementById("wp-submit").disabled = true;
															document.getElementById("wp-submit").title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
														}
										}
								}

								 
				function intval_wp_lostpass_v3_ready(f) {
				   /in/.test(document.readyState) ? setTimeout('intval_wp_lostpass_v3_ready(' + f + ')', 9) : f()
				}

								intval_wp_lostpass_v3_ready(function () { 
						  
												  
												  
																		if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined') {


																					i13renderWpLostCaptchaV3();

																			}
																			else{


																							jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&onload=i13renderWpLostCaptchaV3&render=explicit", function() {



																							});
																			}


							
							
									setInterval(function() {


																					if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.reset) !== 'undefined' && window.turnstile_wp_lostpassword_i13!=null) {

																									try{

																										window.turnstile.reset(window.turnstile_wp_lostpassword_i13);
																									}
																									catch (error){

																										console.log(error);
																									}

																					 }
																					
																					
									}, 80 * 1000);
																		
																		
																		setTimeout(function(){

																						if(jQuery('[name="wp-submit"]').length>0){

																								jQuery('[name="wp-submit"]').attr('title', '');
																								jQuery('[name="wp-submit"]').prop('disabled', false);
																						}

																				}, 60000);
						
					});
										
										function i13renderWpLostCaptchaV3(){
											try{


												window.turnstile_wp_lostpassword_i13 = window.turnstile.render('.turnstile-wp-lostpassword-i13', {
													sitekey: "<?php echo esc_html( $site_key ); ?>",
													size: "invisible",     
													action: "<?php echo esc_html( $i13_recapcha_wp_lost_password_method_action_v3 ); ?>" ,
													'response-field':"false" ,
													'response-field-name':'i13_recaptcha_wp_lostpassword_token',
													callback: onSuccessWplostpassword     
												  });

											}
											catch (error){

													var element =  document.getElementById('wp-submit');
													if (typeof(element) != 'undefined' && element != null)
													{

														 if(jQuery('[name="wp-submit"]').length>0){

																jQuery('[name="wp-submit"]').attr('title', '');
																jQuery('[name="wp-submit"]').prop('disabled', false);
															}          
													}

											}





									  }
									  
									   function onSuccessWplostpassword(token) {
								
													 

												if(jQuery('[name="wp-submit"]').length>0){

												   jQuery('[name="wp-submit"]').attr('title', '');
												   jQuery('[name="wp-submit"]').prop('disabled', false);
											   }
										  }
										
								
								</script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	public function i13woo_extra_wp_register_form() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
				
		if ('v3'==strtolower($reCapcha_version)) {

			$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_wp_register')) {

					$reCapcha_version='v2';
				}
			}
		}
				
		if ( 'v2' == strtolower( $reCapcha_version ) ) {
			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_wp_register' );
			$i13_recapcha_hide_label_wpregister = get_option( 'i13_recapcha_hide_label_wpregister' );
			$captcha_lable = get_option( 'i13_recapcha_wpregister_title' );
			$captcha_lable_ = $captcha_lable;
			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_wpregister_theme' );
			$size = get_option( 'i13_recapcha_wpregister_size' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_wpregister' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict' );
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
						$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );
						
			if ( '' == trim( $captcha_lable_ ) ) {

				$captcha_lable_ = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable_ ), $recapcha_error_msg_captcha_blank );

			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha' );
				?>
				<input type="hidden" autocomplete="off" name="wp-register-nonce" value="<?php echo esc_html( wp_create_nonce( 'wp-register-nonce' ) ); ?>" />
				<p class="wp_register_captcha">
				<?php
				if ( 'yes' != $i13_recapcha_hide_label_wpregister ) :
					?>
						<label for="turnstile-recaptcha-wp-register-i13"><?php echo esc_html( ( '' == trim( $captcha_lable ) ) ? __( 'Captcha', 'recaptcha-for-woocommerce' ) : esc_html( $captcha_lable ) ); ?>&nbsp;</label>
					<?php
				endif;
				?>
				<div id="turnstile-recaptcha-wp-register-i13" name="turnstile-recaptcha-wp-register-i13" class="turnstile-recaptcha-wp-register-i13" data-callback="verifyCallback_wp_register"  data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-callback="verifyCallback_wp_register" data-response-field="false" data-response-field-name="i13_recaptcha_wp_register_token_v2" data-language="<?php echo esc_html($i13_recapcha_v2_lang); ?>"></div>
				<br/>


				</p>

				<!-- do_not_format_javascript --><script type="text/javascript">

					var myCaptcha = null;
					function intval_wp_register_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_wp_register_ready(' + f + ')', 9) : f()
					}

				  intval_wp_register_ready(function () { 
						  
						<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>

														jQuery('#wp-submit').attr("disabled", true);
														if(jQuery('.register').find('[name="register"]').length>0){

																jQuery('.register').find('[name="register"]').attr("disabled", true);
														}       
							<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
									jQuery('#wp-submit').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
																		if(jQuery('.register').find('[name="register"]').length>0){

																				jQuery('.register').find('[name="register"]').attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
																		}  
							<?php else : ?>
									jQuery('#wp-submit').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
																		if(jQuery('.register').find('[name="register"]').length>0){

																				jQuery('.register').find('[name="register"]').attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
																		} 
							<?php endif; ?>
						<?php endif; ?>


												

												 if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.render) !== 'undefined' && myCaptcha === null) {

														  i13renderWpRegisterCaptchaV2();

												  }
												  else{

																  jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_turnstile_v2_lang ); ?>&onload=i13renderWpRegisterCaptchaV2", function() {



																		  });
												  }

				   
					});
					var verifyCallback_wp_register = function(response) {

						if (response.length !== 0){

							<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
																jQuery('#wp-submit').removeAttr("title");
																jQuery('#wp-submit').attr("disabled", false);

																if(jQuery('.register').find('[name="register"]').length>0){

																			   jQuery('.register').find('[name="register"]').removeAttr("title");
																			   jQuery('.register').find('[name="register"]').attr("disabled", false);
																	   } 
							<?php endif; ?>

							if (typeof woo_wp_register_captcha_verified === "function") {

								 woo_wp_register_captcha_verified(response);
							}
						}


					 };
										 
										function i13renderWpRegisterCaptchaV2(){

													  try{
																		myCaptcha= window.turnstile.render('.turnstile-recaptcha-wp-register-i13', {
																		'sitekey': '<?php echo esc_html( $site_key ); ?>',
																		 'callback' : verifyCallback_wp_register,
																		 'response-field':'false' ,
																		  'response-field-name':'i13_recaptcha_wp_register_token_v2',
																		  'data-language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																	  });
													  } catch (error){}
											  }
				 </script><!-- end_do_not_format_javascript -->        
				<?php if ( 'compact' != $size ) : ?>                                       
					<style type="text/css">
						[name="turnstile-recaptcha-wp-register-i13"]{
							transform:scale(0.89);
							-webkit-transform:scale(0.89);
							transform-origin:0 0;
							-webkit-transform-origin:0 0;
						}
					</style>  
				<?php endif; ?>                                                        
				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_wpregister' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
			
			if ( 'yes' == $is_enabled ) {

				if ( 'yes' == $i13_recapcha_no_conflict ) {

					global $wp_scripts;

					$urls = array( 'challenges.cloudflare.com' );

					foreach ( $wp_scripts->queue as $handle ) {

						foreach ( $urls as $url ) {
							if ( false !== strpos( $wp_scripts->registered[ $handle ]->src, $url ) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle ) ) {
								wp_dequeue_script( $handle );
								wp_deregister_script( $handle );
								break;
							}
						}
					}
				}
				wp_enqueue_script( 'jquery' );
				wp_enqueue_script( 'i13-woo-captcha-v3' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_wp_register_method_action_v3 = get_option( 'i13_turnstile_wp_register_method_action_v3' );
				if ( '' == trim( $i13_recapcha_wp_register_method_action_v3 ) ) {

					$i13_recapcha_wp_register_method_action_v3 = 'wp_registration';
				}

							
				$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
				if (''== $i13_recapcha_msg_token_generation) {

					$i13_recapcha_msg_token_generation=__( 'Generating reCaptcha token, Please wait...', 'recaptcha-for-woocommerce' );
				}
				?>
				<input type="hidden" autocomplete="off" name="wp-register-nonce" value="<?php echo esc_html( wp_create_nonce( 'wp-register-nonce' ) ); ?>" />
								<div id="turnstile-wp-register-i13" class="turnstile-wp-register-i13" ></div>
				<!-- do_not_format_javascript --><script type="text/javascript">

					window.turnstile_wp_register_i13=null;					
										document.onreadystatechange = function () {
												if (document.readyState === 'interactive') {
																var element =  document.getElementById('wp-submit');
																if (typeof(element) != 'undefined' && element != null)
																{
																		document.getElementById("wp-submit").disabled = true;
																		document.getElementById("wp-submit").title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
																}
												}
										}

					
					function intval_wp_register_v3_ready(f) {
					   /in/.test(document.readyState) ? setTimeout('intval_wp_register_v3_ready(' + f + ')', 9) : f()
					}

					intval_wp_register_v3_ready(function () { 
						  
												  
													if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined') {
			   
															   
																i13renderWpRegisterCaptchaV3();

														}
														else{

																		jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&onload=i13renderWpRegisterCaptchaV3&render=explicit", function() {



									});

																		 
														}
												  
													
							
					
										
										
						setInterval(function() {

													if (typeof (window.turnstile) !== 'undefined' && typeof (window.turnstile.reset) !== 'undefined' && window.turnstile_wp_register_i13!=null) {

																		try{

																			window.turnstile.reset(window.turnstile_wp_register_i13);
																		}
																		catch (error){

																			console.log(error);
																		}

														 }
						}, 80 * 1000);				
						
						
			
												setTimeout(function(){

														if(jQuery('[name="wp-submit"]').length>0){

																jQuery('[name="wp-submit"]').attr('title', '');
																jQuery('[name="wp-submit"]').prop('disabled', false);
														}

												}, 60000);      

					});
																		
					function i13renderWpRegisterCaptchaV3(){
							
														
														try{


															window.turnstile_wp_register_i13 = window.turnstile.render('.turnstile-wp-register-i13', {
																sitekey: "<?php echo esc_html( $site_key ); ?>",
																size: "invisible",     
																action: "<?php echo esc_html( $i13_recapcha_wp_register_method_action_v3 ); ?>" ,
																'response-field':"false" ,
																'response-field-name':'i13_recaptcha_wp_register_token',
																callback: onSuccessWpRegister      
															  });

														}
														catch (error){

																var element =  document.getElementById('wp-submit');
																if (typeof(element) != 'undefined' && element != null)
																{
																			   
																	 if(jQuery('[name="wp-submit"]').length>0){

																			jQuery('[name="wp-submit"]').attr('title', '');
																			jQuery('[name="wp-submit"]').prop('disabled', false);
																		}          
																}

														}
														
														
										 
															   

												  }  
												   function onSuccessWpRegister(token) {
								
													 

															if(jQuery('[name="wp-submit"]').length>0){

															   jQuery('[name="wp-submit"]').attr('title', '');
															   jQuery('[name="wp-submit"]').prop('disabled', false);
														   }
													  }
				</script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	public function i13woo_verify_pay_order_captcha() {
				
		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

		$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_checkout_token_v2'])) {

			$reCapcha_version='v2';
		}
				
		$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$captcha_lable = get_option( 'i13_recapcha_guestcheckout_title' );
			if ( '' == trim( $captcha_lable ) ) {

				$captcha_lable = 'captcha';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );
			$i13_recapcha_checkout_timeout = get_option( 'i13_turnstile_checkout_timeout' );
			if ( null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout ) {

				$i13_recapcha_checkout_timeout = 3;
			}
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_payfororder' );

			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', '<strong>' . ucfirst( $captcha_lable ) . '</strong>', $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', '<strong>' . $captcha_lable . '</strong>', $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', '<strong>' . $captcha_lable . '</strong>', $recapcha_error_msg_captcha_invalid );
							
			if ( 'yes' == $is_enabled && ( ( isset( $_REQUEST['woocommerce-pay-nonce'] ) && ! empty( $_REQUEST['woocommerce-pay-nonce'] ) ) || ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) ) ) {

				$nonce_value = '';
				if ( isset( $_REQUEST['woocommerce-pay-nonce'] ) || isset( $_REQUEST['_wpnonce'] ) ) {

					if ( isset( $_REQUEST['woocommerce-pay-nonce'] ) && ! empty( $_REQUEST['woocommerce-pay-nonce'] ) ) {

						$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-pay-nonce'] );
					} else if ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) {

						$nonce_value = sanitize_text_field( $_REQUEST['_wpnonce'] );
					}
				}

				if ( wp_verify_nonce( $nonce_value, 'woocommerce-pay' ) ) {

					if ( 'yes' != get_transient( $nonce_value ) ) {

						if ( isset( $_POST['i13_recaptcha_checkout_token_v2'] ) && ! empty( $_POST['i13_recaptcha_checkout_token_v2'] ) ) {

							// Google reCAPTCHA API secret key
							$response = sanitize_text_field( $_POST['i13_recaptcha_checkout_token_v2'] );

															$verifyResponse = wp_remote_post(
															   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
															   array(
																			   'method' => 'POST',
																			   'timeout' => 60,
																			   'body' => array(
																							   'secret' => $secret_key,
																							   'response' => $response,
																			   ),
																   )
																);
							if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

																	// Decode json data
																	$responseData = json_decode( $verifyResponse['body'] );

																	// If reCAPTCHA response is valid
								if ( ! $responseData->success ) {

									if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																				wc_add_notice( __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ), 'error' );
																				return;
									} else {

																				wc_add_notice( $recapcha_error_msg_captcha_invalid, 'error' );
																				return;
									}
								} else {

																												delete_transient( 'i13_' . COOKIEHASH_I13 . '_woo_pay_order');
									if ( 0 != $i13_recapcha_checkout_timeout ) {

																				set_transient( $nonce_value, 'yes', ( $i13_recapcha_checkout_timeout * 60 ) );
									}
								}
							} else {

								if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																			wc_add_notice( __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ), 'error' );
																			return;
								} else {

																			wc_add_notice( $recapcha_error_msg_captcha_no_response, 'error' );
																			return;
								}
							}
														
							
						} else {

							if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

								wc_add_notice( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ), 'error' );
								return;
							} else {
								wc_add_notice( $recapcha_error_msg_captcha_blank, 'error' );
								return;
							}
						}
					}
				} else {

					wc_add_notice( __( 'Could not verify request.', 'recaptcha-for-woocommerce' ), 'error' );
					return;
				}
			}
		} else {

			
			$i13_recapcha_checkout_action_v3 = get_option( 'i13_recapcha_checkout_action_v3' );
			if ( '' == $i13_recapcha_checkout_action_v3 ) {

				$i13_recapcha_checkout_action_v3 = 'checkout';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'i13_recapcha_error_msg_turnstile_blank_v3' );
			$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
			$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_payfororder' );
			$i13_recapcha_enable_on_logincheckout = get_option( 'i13_recapcha_enable_on_logincheckout' );

			$i13_recapcha_checkout_timeout = get_option( 'i13_turnstile_checkout_timeout' );
			if ( null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout ) {

				$i13_recapcha_checkout_timeout = 3;
			}

			$nonce_value = '';
			if ( isset( $_REQUEST['woocommerce-pay-nonce'] ) || isset( $_REQUEST['_wpnonce'] ) ) {

				if ( isset( $_REQUEST['woocommerce-pay-nonce'] ) && ! empty( $_REQUEST['woocommerce-pay-nonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-pay-nonce'] );
				} else if ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) {

					$nonce_value = sanitize_text_field( $_REQUEST['_wpnonce'] );
				}
			}

			if ( 'yes' == $is_enabled && ( ( isset( $_REQUEST['woocommerce-pay-nonce'] ) && ! empty( $_REQUEST['woocommerce-pay-nonce'] ) ) || ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) ) && wp_verify_nonce( $nonce_value, 'woocommerce-pay' ) ) {

				if ( 'yes' != get_transient( $nonce_value ) ) {

					$i13_checkout_token = '';
					if ( isset( $_POST['i13_recaptcha_checkout_token'] ) || isset( $_POST['i13_recaptcha_checkout_token_fallback'] ) ) {

						if ( isset( $_POST['i13_recaptcha_checkout_token'] ) && ! empty( $_POST['i13_recaptcha_checkout_token'] ) ) {

							$i13_checkout_token = sanitize_text_field( $_POST['i13_recaptcha_checkout_token'] );

						} else if ( isset( $_POST['i13_recaptcha_checkout_token_fallback'] ) && ! empty( $_POST['i13_recaptcha_checkout_token_fallback'] ) ) {

							$i13_checkout_token = sanitize_text_field( $_POST['i13_recaptcha_checkout_token_fallback'] );
						}
					}

					if ( isset( $i13_checkout_token ) && ! empty( $i13_checkout_token ) ) {
						// Google reCAPTCHA API secret key

						
												
															// Verify the reCAPTCHA response
															 $verifyResponse = wp_remote_post(
															'https://challenges.cloudflare.com/turnstile/v0/siteverify',
															array(
																			'method' => 'POST',
																			'timeout' => 60,
																			'body' => array(
																							'secret' => $secret_key,
																							'response' => $i13_checkout_token,
																			),
																)
															 );

						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

							// Decode json data
							$responseData = json_decode( $verifyResponse['body'] );

							// If reCAPTCHA response is valid
							if ( ! $responseData->success ) {

								if ( 'yes' == $use_v2_along_v3 ) {
								   set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_pay_order', '1', $i13_recapcha_v2_timeout );
								}

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																				wc_add_notice( __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ), 'error' );
																				return;
								} else {

																				wc_add_notice( $recapcha_error_msg_captcha_invalid, 'error' );
																				return;
								}
							} else {

								if (  $responseData->action != $i13_recapcha_checkout_action_v3 ) {

									if ( 'yes' == $use_v2_along_v3 ) {
																					
																				set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_pay_order', '1', $i13_recapcha_v2_timeout );
									}
									if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																					wc_add_notice( __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ), 'error' );
																					return;
									} else {

										wc_add_notice( $recapcha_error_msg_captcha_invalid, 'error' );
										return;
									}
								} else {

									if ( 0 != $i13_recapcha_checkout_timeout ) {

																				set_transient( $nonce_value, 'yes', ( $i13_recapcha_checkout_timeout * 60 ) );
									}
								}
							}
						} else {

							if ( 'yes' == $use_v2_along_v3 ) {
																	
																set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_pay_order', '1', $i13_recapcha_v2_timeout );
							}
							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																	wc_add_notice( __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ), 'error' );
																	return;
							} else {

																	wc_add_notice( $recapcha_error_msg_captcha_no_response, 'error' );
																	return;
							}
						}
												
												
						
					} else {

						if ( 'yes' == $use_v2_along_v3 ) {
						   set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_pay_order', '1', $i13_recapcha_v2_timeout );
						}
						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							wc_add_notice( __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ), 'error' );
							return;
						} else {

							wc_add_notice( $recapcha_error_msg_captcha_blank, 'error' );
							return;
						}
					}
				}
			}
		}
	}

	public function i13_woocommerce_track_order() {

		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}

				
		$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_ordertrack_token_v2'])) {

			$reCapcha_version='v2';
		}

		$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}

		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			if ( isset( $_REQUEST['woocommerce-order-tracking-nonce'] ) && ( isset( $_REQUEST['woocommerce-order-tracking-nonce'] ) || isset( $_REQUEST['_wpnonce'] ) ) ) {

				$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
				$is_enabled = get_option( 'i13_recapcha_enable_on_woo_tracking' );
				$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
				$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
				$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );
				$captcha_lable = trim( get_option( 'i13_recapcha_woo_tracking_title' ) );
				if ( '' == $captcha_lable ) {

					$captcha_lable = 'captcha';
				}
				$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
				$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
				$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

				if ( 'yes' == $is_enabled && isset( $_POST['orderid'] ) ) {

					if ( isset( $_REQUEST['woocommerce-order-tracking-nonce'] ) && ! empty( $_REQUEST['woocommerce-order-tracking-nonce'] ) ) {

						$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-order-tracking-nonce'] ); // @codingStandardsIgnoreLine.
					} else if ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) {

						$nonce_value = sanitize_text_field( $_REQUEST['_wpnonce'] ); // @codingStandardsIgnoreLine.
					}
					if ( ! empty( $nonce_value ) ) {

						if ( wp_verify_nonce( $nonce_value, 'woocommerce-order_tracking' ) ) {

							if ( isset( $_POST['i13_recaptcha_ordertrack_token_v2'] ) && ! empty( $_POST['i13_recaptcha_ordertrack_token_v2'] ) ) {

																// Google reCAPTCHA API secret key
															   $response = sanitize_text_field( $_POST['i13_recaptcha_ordertrack_token_v2'] );

								
																
																		// Verify the reCAPTCHA response
																		  $verifyResponse = wp_remote_post(
																											'https://challenges.cloudflare.com/turnstile/v0/siteverify',
																											array(
																															'method' => 'POST',
																															'timeout' => 60,
																															'body' => array(
																																			'secret' => $secret_key,
																																			'response' => $response,
																															),
																												)
																											 );

								if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

									// Decode json data
									$responseData = json_decode( $verifyResponse['body'] );

									// If reCAPTCHA response is valid
									if ( ! $responseData->success ) {

										if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																							update_option( 'err_i13_captcha_tracking', __( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
																							global $wp;
																							$current_url = home_url( add_query_arg( array(), $wp->request ) );
																							wp_redirect( $current_url );
										} else {
																							
																							update_option( 'err_i13_captcha_tracking', $recapcha_error_msg_captcha_invalid );

																							global $wp;
																							$current_url = home_url( add_query_arg( array(), $wp->request ) );
																							wp_redirect( $current_url );
										}
									} else {


										delete_transient( 'i13_' . COOKIEHASH_I13 . '_woo_order_track');
									}
								} else {

									if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {
																					
																					update_option( 'err_i13_captcha_tracking', __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																					global $wp;
																					$current_url = home_url( add_query_arg( array(), $wp->request ) );
																					wp_redirect( $current_url );

									} else {
																					
																					update_option( 'err_i13_captcha_tracking', $recapcha_error_msg_captcha_no_response );
																					global $wp;
																					$current_url = home_url( add_query_arg( array(), $wp->request ) );
																					wp_redirect( $current_url );

									}
								}

								
																	
							} else {

								if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

									update_option( 'err_i13_captcha_tracking', __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
									global $wp;
									$current_url = home_url( add_query_arg( array(), $wp->request ) );

									wp_redirect( $current_url );
								} else {

									update_option( 'err_i13_captcha_tracking', $recapcha_error_msg_captcha_blank );

									global $wp;
									$current_url = home_url( add_query_arg( array(), $wp->request ) );
									wp_redirect( $current_url );
								}
							}
						} else {

							update_option( 'err_i13_captcha_tracking', __( 'Could not verify request.', 'recaptcha-for-woocommerce' ) );
							global $wp;
							$current_url = home_url( add_query_arg( array(), $wp->request ) );
							wp_redirect( $current_url );
						}
					}
				}
			}

		} else {

			if ( isset( $_REQUEST['woocommerce-order-tracking-nonce'] ) && ( isset( $_REQUEST['woocommerce-order-tracking-nonce'] ) || isset( $_REQUEST['_wpnonce'] ) ) ) {

				$is_enabled = get_option( 'i13_recapcha_enable_on_woo_tracking' );

				if ( 'yes' == $is_enabled && isset( $_POST['orderid'] ) ) {

					
					$i13_recapcha_woo_tracking_method_action_v3 = get_option( 'i13_recapcha_woo_tracking_method_action_v3' );
					if ( '' == $i13_recapcha_woo_tracking_method_action_v3 ) {

						$i13_recapcha_woo_tracking_method_action_v3 = 'order_tracking';
					}

					$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
					$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
					$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
					$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );

					$nonce_value = '';

					if ( isset( $_REQUEST['woocommerce-order-tracking-nonce'] ) && ! empty( $_REQUEST['woocommerce-order-tracking-nonce'] ) ) {

						$nonce_value = sanitize_text_field( $_REQUEST['woocommerce-order-tracking-nonce'] ); // @codingStandardsIgnoreLine.
					} else if ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) {

						$nonce_value = sanitize_text_field( $_REQUEST['_wpnonce'] ); // @codingStandardsIgnoreLine.
					}

					if ( wp_verify_nonce( $nonce_value, 'woocommerce-order_tracking' ) ) {

						if ( isset( $_POST['i13_track_order_token'] ) && ! empty( $_POST['i13_track_order_token'] ) ) {
							// Google reCAPTCHA API secret key
							$response = sanitize_text_field( $_POST['i13_track_order_token'] );
				   
														// Verify the reCAPTCHA response
															   $verifyResponse = wp_remote_post(
																								 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
																								 array(
																												 'method' => 'POST',
																												 'timeout' => 60,
																												 'body' => array(
																																 'secret' => $secret_key,
																																 'response' => $response,
																												 ),
																									 )
																								  );

							if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

								 // Decode json data
								 $responseData = json_decode( $verifyResponse['body'] );

								 // If reCAPTCHA response is valid
								if ( ! $responseData->success ) {

									if ( 'yes' == $use_v2_along_v3 ) {
									 set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_order_track', '1', $i13_recapcha_v2_timeout );
									}
									if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {
																					
																					update_option( 'err_i13_captcha_tracking', __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );

																					global $wp;
																					$current_url = home_url( add_query_arg( array(), $wp->request ) );
																					wp_redirect( $current_url );
									} else {

																					update_option( 'err_i13_captcha_tracking', $recapcha_error_msg_captcha_invalid );

																					global $wp;
																					$current_url = home_url( add_query_arg( array(), $wp->request ) );
																					wp_redirect( $current_url );
									}
								} else {

									if (  $responseData->action != $i13_recapcha_woo_tracking_method_action_v3 ) {

										if ( 'yes' == $use_v2_along_v3 ) {
																							set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_order_track', '1', $i13_recapcha_v2_timeout );
										}
										if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																							update_option( 'err_i13_captcha_tracking', __( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );

																							global $wp;
																							$current_url = home_url( add_query_arg( array(), $wp->request ) );
																							wp_redirect( $current_url );
																								
										} else {

																							update_option( 'err_i13_captcha_tracking', $recapcha_error_msg_captcha_invalid );

																							global $wp;
																							$current_url = home_url( add_query_arg( array(), $wp->request ) );
																							wp_redirect( $current_url );
										}
									}
								}
							} else {

								if ( 'yes' == $use_v2_along_v3 ) {
																			
																		set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_order_track', '1', $i13_recapcha_v2_timeout );
								}
								if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																			update_option( 'err_i13_captcha_tracking', __( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );

																			global $wp;
																			$current_url = home_url( add_query_arg( array(), $wp->request ) );
																			wp_redirect( $current_url );
								} else {

																			update_option( 'err_i13_captcha_tracking', $recapcha_error_msg_captcha_no_response );

																			global $wp;
																			$current_url = home_url( add_query_arg( array(), $wp->request ) );
																			wp_redirect( $current_url );
								}
							}
														
							
														
						} else {

							if ( 'yes' == $use_v2_along_v3 ) {
								set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_order_track', '1', $i13_recapcha_v2_timeout );
							}
							if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

								update_option( 'err_i13_captcha_tracking', __( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) );

								global $wp;
								$current_url = home_url( add_query_arg( array(), $wp->request ) );
								wp_redirect( $current_url );
																
							} else {

								update_option( 'err_i13_captcha_tracking', $recapcha_error_msg_captcha_blank );
								global $wp;
								$current_url = home_url( add_query_arg( array(), $wp->request ) );
								wp_redirect( $current_url );
							}
						}
					}
				}
			}
		}
	}

	public function i13_woo_order_tracking_form_captcha() {

		$retrive_err = get_option( 'err_i13_captcha_tracking' );
		update_option( 'err_i13_captcha_tracking', '' );
		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}


		if ('v3'==strtolower($reCapcha_version)) {

			  $use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
			if ( 'yes' == $use_v2_along_v3 ) {

				if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_woo_order_track')) {

				   $reCapcha_version='v2';
				}
			}
		}
			   
		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$is_enabled = get_option( 'i13_recapcha_enable_on_woo_tracking' );
			$disable_submit_btn = get_option( 'i13_recapcha_disable_submitbtn_woo_tracking' );
			$captcha_lable = get_option( 'i13_recapcha_woo_tracking_title' );
			$i13_recapcha_hide_label_addpayment = get_option( 'i13_recapcha_hide_label_woo_tracking' );
			$site_key = get_option( 'wc_settings_tab_turnstile_site_key' );
			$theme = get_option( 'i13_recapcha_woo_tracking_theme' );
			$size = trim( get_option( 'i13_recapcha_woo_tracking_size' ) );
			if ( '' == $captcha_lable ) {

				$captcha_lable = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$i13_recapcha_v2_lang = apply_filters( 'i13_turnstilev2_set_lang', esc_html( get_option( 'i13_turnstile_v2_lang' ) ) );

			if ( 'yes' == $is_enabled ) {

				wp_enqueue_script( 'jquery' );
				?>


				<!-- do_not_format_javascript --><script type="text/javascript">

							var recaptcha_track_order_method = null;
							var verifyCallback_order_track_method = function(response) {

							if (jQuery("#woocommerce-order-tracking-nonce").length > 0){
									if (response.length !== 0){
											<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
															jQuery("[name='track']").removeAttr("title");
																	jQuery("[name='track']").attr("disabled", false);
											<?php endif; ?>

											if (typeof tracking_method_recaptcha_verified === "function") {

												tracking_method_recaptcha_verified(response);
											}
										}
									}

							};
							
							function rerender_recpacha_track_order(){

							if (jQuery("#woocommerce-order-tracking-nonce").length > 0){

																		if (typeof (window.turnstile) !== 'undefined'  && typeof (window.turnstile.render) !== 'undefined' && recaptcha_track_order_method === null) {
									
																						
													<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
																	jQuery("[name='track']").attr("disabled", true);
														<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
																		jQuery("[name='track']").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
														<?php else : ?>
																		jQuery("[name='track']").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
														<?php endif; ?>
													<?php endif; ?>

										try{
																					
																								  recaptcha_track_order_method= window.turnstile.render('#cf-recaptcha-order-track-method', {
																											'sitekey': '<?php echo esc_html( $site_key ); ?>',
																											 'callback' : verifyCallback_order_track_method,
																											 'response-field':'false' ,
																											  'response-field-name':'i13_recaptcha_ordertrack_token_v2',
																											  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																										  });

												
											} catch (error){
																						
																							console.log(error);
																						}

										}
																				else{
																					
																						  jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=rerender_recpacha_track_order", function() {


																						});
																				}

									}

							}

				
							var recaptcha_track_order_method = null;
							
							function intval_track_order_ready(f) {
								/in/.test(document.readyState) ? setTimeout('intval_track_order_ready(' + f + ')', 9) : f()
							 }

						   intval_track_order_ready(function () { 
							if (jQuery("#woocommerce-order-tracking-nonce").length > 0){

									<?php if ( '' != $retrive_err ) : ?>
											jQuery(".track_order").parent().prepend(`<ul class="woocommerce-error" role="alert"><li><?php echo esc_html( $retrive_err ); ?></li></ul>`);
									<?php endif; ?>
									<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
										jQuery("[name='track']").click(function() {

										if (window.turnstile.getResponse(recaptcha_track_order_method) == ""){
												
											<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
													alert("<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
											<?php else : ?>
													alert("<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
											<?php endif; ?>



											 return false;
											}
										   else{


												return true;
										   }
								});
				<?php endif; ?>







					function callback_recpacha_track_order(){

					if (typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.render) !== 'undefined' && recaptcha_track_order_method === null) {

						<?php if ( 'yes' == trim( $disable_submit_btn ) ) : ?>
								jQuery("[name='track']").attr("disabled", true);
							<?php if ( '' == $recapcha_error_msg_captcha_blank ) : ?>
									jQuery("[name='track']").attr("title", "<?php echo esc_html( __( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) ); ?>");
							<?php else : ?>
									jQuery("[name='track']").attr("title", "<?php echo esc_html( $recapcha_error_msg_captcha_blank ); ?>");
							<?php endif; ?>
						<?php endif; ?>

																		try{
														
														
																			 recaptcha_track_order_method= window.turnstile.render('#cf-recaptcha-order-track-method', {
																							'sitekey': '<?php echo esc_html( $site_key ); ?>',
																							 'callback' : verifyCallback_order_track_method,
																							 'response-field':'false' ,
																							  'response-field-name':'i13_recaptcha_ordertrack_token_v2',
																							  'language':'<?php echo esc_html($i13_recapcha_v2_lang); ?>'
																						  });
																						  
						
																			} catch (error){}

							}
							else{

									 jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&hl=<?php echo esc_html( $i13_recapcha_v2_lang ); ?>&onload=rerender_recpacha_track_order", function() {



							});
						}


					}

					var waitForEl_track = function(selector, callback) {

							if (jQuery("#" + selector).length) {

							callback_recpacha_track_order();
					} 
					else {
							setTimeout(function() {
							 waitForEl_track(jQuery("#" + selector), callback);
							}, 100);
						}
				  };
				<?php if ( '' == trim( $captcha_lable ) ) : ?>
			
						jQuery("[name='track']").parent().prepend(`<div id="add_captcha_order_track" class="add_captcha_order_track woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
							<?php
							if ( 'yes' != $i13_recapcha_hide_label_addpayment ) :
								?>
								<label for="cf-recaptcha-order-track-method"><?php echo esc_html( __( 'Captcha', 'recaptcha-for-woocommerce' ) ); ?>&nbsp;<span class="required">*</span></label>
								<?php
							endif;
							?>
							<div id="cf-recaptcha-order-track-method" name="cf-recaptcha-track-order"  data-callback="verifyCallback_order_track_method" data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_ordertrack_token_v2"></div></div>`).ready(function () {
							<?php else : ?>
									jQuery("[name='track']").parent().prepend(`<div id="add_captcha_order_track" class="add_captcha_order_track woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
								<?php
								if ( 'yes' != $i13_recapcha_hide_label_addpayment ) :
									?>
																				<label for="cf-recaptcha-order-track-method"><?php echo esc_html( $captcha_lable ); ?>&nbsp;<span class="required">*</span></label>
									<?php
								endif;
								?>
							  <div id="cf-recaptcha-order-track-method" name="cf-recaptcha-track-order"  data-callback="verifyCallback_order_track_method" data-sitekey="<?php echo esc_html( $site_key ); ?>" data-theme="<?php echo esc_html( $theme ); ?>" data-size="<?php echo esc_html( $size ); ?>" data-response-field="false" data-response-field-name="i13_recaptcha_ordertrack_token_v2"></div></div>`).ready(function () {
							<?php endif; ?>



								waitForEl_track('cf-recaptcha-order-track-method', function() {


								})

						})


					}


				 
					});
				</script><!-- end_do_not_format_javascript --> 

				<?php
			}
		} else {

			$is_enabled = get_option( 'i13_recapcha_enable_on_woo_tracking' );
			$i13_recapcha_no_conflict = get_option( 'i13_turnstile_no_conflict_v3' );
			
			if ( 'yes' == $is_enabled ) {

				wp_enqueue_script( 'jquery' );

				$site_key = get_option( 'wc_settings_tab_turnstile_site_key_v3' );
				$i13_recapcha_woo_tracking_method_action_v3 = get_option( 'i13_recapcha_woo_tracking_method_action_v3' );
				if ( '' == trim( $i13_recapcha_woo_tracking_method_action_v3 ) ) {

					$i13_recapcha_woo_tracking_method_action_v3 = 'order_tracking';
				}
							
				$i13_recapcha_msg_token_generation = get_option( 'i13_turnstile_msg_token_generation' );
				if (''== $i13_recapcha_msg_token_generation) {

					$i13_recapcha_msg_token_generation=__( 'Generating turnstile token, Please wait...', 'recaptcha-for-woocommerce' );
				}

				?>

				<!-- do_not_format_javascript --><script type="text/javascript">
							var el_i13_track_order_captcha = null;
														
														document.addEventListener('readystatechange', function () {
																		if (document.readyState === 'interactive') {
																						var element = document.querySelector('[name="track"]');
																						if (typeof(element) != 'undefined' && element != null)
																						{
																									element.disabled = true;
																									element.title = `<?php echo esc_html( $i13_recapcha_msg_token_generation ); ?>`;
																						}
																		}
																});

													  
							function intval_track_order_v3_ready(f) {
								/in/.test(document.readyState) ? setTimeout('intval_track_order_v3_ready(' + f + ')', 9) : f()
							 }

						   intval_track_order_v3_ready(function () { 
							   
							if (jQuery("#woocommerce-order-tracking-nonce").length > 0){
																	
																	  
	
									<?php if ( '' != $retrive_err ) : ?>
											jQuery(".track_order").parent().prepend(`<ul class="woocommerce-error" role="alert"><li><?php echo esc_html( $retrive_err ); ?></li></ul>`);
									<?php endif; ?>
										jQuery("[name='track']").parent().prepend(`<div id="turnstile-woo-track-order-v3-i13" class="turnstile-woo-track-order-v3-i13" ></div>`);
																				if (typeof window.turnstile == 'undefined' || window.turnstile.render == 'undefined' || el_i13_track_order_captcha == null){

										jQuery.getScript("<?php echo esc_url( $this->i13_woo_get_recaptcha_js_url() ); ?>&render=<?php echo esc_html( $site_key ); ?>&onload=reRender_Woo_track_Captcha_v3", function() {




										});
									}
									else{

											reRender_Woo_track_Captcha_v3();
									 }




						
									setInterval(function() {

																				if (typeof (window.turnstile) !== 'undefined' &&  typeof (window.turnstile.reset) !== 'undefined') {

																							try{

																								   window.turnstile.reset(el_i13_track_order_captcha);
																							   }
																							   catch (error){

																								   console.log(error);
																							   }



																				   }
									}, 80 * 1000);
							

					   }

					
											setTimeout(function(){

															 if(jQuery('[name="track"]').length>0){

															   jQuery('[name="track"]').attr('title', '');
															   jQuery('[name="track"]').prop('disabled', false);
													   }

											   }, 60000);

					});
					function reRender_Woo_track_Captcha_v3(){

					if (jQuery("#woocommerce-order-tracking-nonce").length > 0){


															try{

																	window.el_i13_track_order_captcha= window.turnstile.render('#turnstile-woo-track-order-v3-i13', {
																										sitekey: "<?php echo esc_html( $site_key ); ?>",
																										size: "invisible",
																										action: "<?php echo esc_html( $i13_recapcha_woo_tracking_method_action_v3 ); ?>" ,
																										'response-field':"false" ,
																										'response-field-name':'i13_track_order_token',
																										callback: onSuccessTrackorder
																									  });
															}
															catch(error) {

																		console.error('Turnstile execution error:', error);

																		if(jQuery('[name="track"]').length>0){

																						jQuery('[name="track"]').attr('title', '');
																						jQuery('[name="track"]').prop('disabled', false);
																				}

																}
															
							
						}

					}
										
										function onSuccessTrackorder(){
										
											if(jQuery('[name="track"]').length>0){

													jQuery('[name="track"]').attr('title', '');
													jQuery('[name="track"]').prop('disabled', false);
											}
										
										}

				</script><!-- end_do_not_format_javascript -->
				<?php
			}
		}
	}

	public function i13_woocomm_validate_bb_press_signup_captcha() {
			
		$reCapcha_version = get_option( 'i13_turnstile_version' );
		if ( '' == $reCapcha_version ) {
			$reCapcha_version = 'v2';
		}
				
				
		$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
		if ( 'yes' == $use_v2_along_v3 && isset($_POST) && isset($_POST['i13_recaptcha_woo_register_token_v2'])) {

			$reCapcha_version='v2';
		}


		$i13_recapcha_v2_timeout=get_option( 'i13_turnstile_v2_timeout' );
		if (''==$i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout=600;
		} else {

			$i13_recapcha_v2_timeout=$i13_recapcha_v2_timeout*60;
		}


		if ( 'v2' == strtolower( $reCapcha_version ) ) {

			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_signup' );
			$enabled_bp = get_option( 'i13_recapcha_using_buddy_press' );
			$recapcha_error_msg_captcha_blank = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_blank' );
			$recapcha_error_msg_captcha_no_response = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_no_response' );
			$recapcha_error_msg_captcha_invalid = get_option( 'wc_settings_tab_turnstile_error_msg_captcha_invalid' );
			$captcha_lable = get_option( 'i13_recapcha_signup_title' );
			if ( '' == trim( $captcha_lable ) ) {

				$captcha_lable = 'captcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace( '[captcha]', ucfirst( $captcha_lable ), $recapcha_error_msg_captcha_blank );
			$recapcha_error_msg_captcha_no_response = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response );
			$recapcha_error_msg_captcha_invalid = str_replace( '[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid );

			$nonce_value = isset( $_REQUEST['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_wpnonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification

			if ( 'yes' == $is_enabled && 'yes' == $enabled_bp && ( ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) ) ) {

				if ( wp_verify_nonce( $nonce_value, 'bp_new_signup' ) ) {

					if ( isset( $_POST['i13_recaptcha_woo_register_token_v2'] ) && ! empty( $_POST['i13_recaptcha_woo_register_token_v2'] ) ) {
						// Google reCAPTCHA API secret key
						$response = sanitize_text_field( $_POST['i13_recaptcha_woo_register_token_v2'] );

						

														 $verifyResponse = wp_remote_post(
														'https://challenges.cloudflare.com/turnstile/v0/siteverify',
														array(
																		'method' => 'POST',
																		'timeout' => 60,
																		'body' => array(
																						'secret' => $secret_key,
																						'response' => $response,
																		),
															)
														 );
						if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

															// Decode json data
															$responseData = json_decode( $verifyResponse['body'] );

															// If reCAPTCHA response is valid
							if ( ! $responseData->success ) {

								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																				wp_die( esc_html__( 'Invalid captcha.', 'recaptcha-for-woocommerce' ) );
																				exit;
								} else {

																			wp_die( esc_html__( $recapcha_error_msg_captcha_invalid ) );
																			exit;
								}
							} else {

									delete_transient( 'i13_' . COOKIEHASH_I13 . '_woo_register');
							}
						} else {

							if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

																	wp_die( esc_html__( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
																	exit;
							} else {

																wp_die( esc_html__( $recapcha_error_msg_captcha_no_response ) );
																exit;
							}
						}
												
						
					} else {

						if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

							wp_die( esc_html__( 'Captcha is a required field.', 'recaptcha-for-woocommerce' ) );
							exit;
						} else {

							wp_die( esc_html__( $recapcha_error_msg_captcha_blank ) );
							exit;
						}
					}
				} else {

					wp_die( esc_html__( 'Could not verify request.', 'recaptcha-for-woocommerce' ) );
					exit;
				}
			}
		} else {

			$i13_recapcha_signup_score_threshold_v3 = get_option( 'i13_recapcha_signup_score_threshold_v3' );
			if ( '' == $i13_recapcha_signup_score_threshold_v3 ) {

				$i13_recapcha_signup_score_threshold_v3 = '0.5';
			}
			$i13_recapcha_signup_action_v3 = get_option( 'i13_recapcha_signup_action_v3' );
			if ( '' == $i13_recapcha_signup_action_v3 ) {

				$i13_recapcha_signup_action_v3 = 'signup';
			}

			$recapcha_error_msg_captcha_blank = get_option( 'i13_turnstile_error_msg_captcha_blank_v3' );
			$recapcha_error_msg_captcha_no_response = get_option( 'i13_turnstile_error_msg_captcha_no_response_v3' );
			$recapcha_error_msg_captcha_invalid = get_option( 'i13_turnstile_error_msg_v3_invalid_captcha' );
			$secret_key = get_option( 'wc_settings_tab_turnstile_secret_key_v3' );
			$is_enabled = get_option( 'i13_recapcha_enable_on_signup' );
			$enabled_bp = get_option( 'i13_recapcha_using_buddy_press' );
			$nonce_value = isset( $_REQUEST['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_wpnonce'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification

			if ( 'yes' == $is_enabled && 'yes' == $enabled_bp && ( ( isset( $_REQUEST['_wpnonce'] ) && ! empty( $_REQUEST['_wpnonce'] ) ) ) ) {

				if ( isset( $_POST['i13_recaptcha_register_token'] ) && ! empty( $_POST['i13_recaptcha_register_token'] ) ) {
									
												// Google reCAPTCHA API secret key
												$response = sanitize_text_field( $_POST['i13_recaptcha_register_token'] );

											
												// Verify the reCAPTCHA response
												$verifyResponse = wp_remote_post(
												   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
												   array(
																   'method' => 'POST',
																   'timeout' => 60,
																   'body' => array(
																				   'secret' => $secret_key,
																				   'response' => $response,
																   ),
													   )
													);

					if ( is_array( $verifyResponse ) && ! is_wp_error( $verifyResponse ) && isset( $verifyResponse['body'] ) ) {

						// Decode json data
						$responseData = json_decode( $verifyResponse['body'] );

						// If reCAPTCHA response is valid
						if ( ! $responseData->success ) {

							if ( 'yes' == $use_v2_along_v3 ) {
																	
																		set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_register', '1', $i13_recapcha_v2_timeout );
							}
							if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

																	wp_die( esc_html__( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
																	exit;
							} else {

																	wp_die( esc_html__( $recapcha_error_msg_captcha_invalid ) );
																	exit;
							}
						} else {

							if (  $responseData->action != $i13_recapcha_signup_action_v3 ) {

								if ( 'yes' == $use_v2_along_v3 ) {
																			
																		set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_register', '1', $i13_recapcha_v2_timeout );
								}
								if ( '' == trim( $recapcha_error_msg_captcha_invalid ) ) {

									wp_die( esc_html__( 'Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce' ) );
									exit;
								} else {

																			wp_die( esc_html__( $recapcha_error_msg_captcha_invalid ) );
																			exit;
								}
							}
						}
					} else {

						if ( 'yes' == $use_v2_along_v3 ) {
															
															set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_register', '1', $i13_recapcha_v2_timeout );
						}
						if ( '' == trim( $recapcha_error_msg_captcha_no_response ) ) {

															wp_die( esc_html__( 'Could not get response from turnstile server.', 'recaptcha-for-woocommerce' ) );
															exit;
																
						} else {

								wp_die( esc_html__( $recapcha_error_msg_captcha_no_response ) );
								exit;
						}
					}
										
					
				} else {

					if ( 'yes' == $use_v2_along_v3 ) {
											
						set_transient( 'i13_' . COOKIEHASH_I13 . '_woo_register', '1', $i13_recapcha_v2_timeout );
					}
					if ( '' == trim( $recapcha_error_msg_captcha_blank ) ) {

						wp_die( esc_html__( 'Turnstile token is missing.', 'recaptcha-for-woocommerce' ) );
						exit;
					} else {

						wp_die( esc_html__( $recapcha_error_msg_captcha_blank ) );
						exit;
					}
				}
			}
		}
	}

	public function isWordFenceActive() {

		$wordfence_isactive = false;
		$active_plugins = (array) apply_filters( 'active_plugins', get_option( 'active_plugins', array() ) );

		if ( function_exists( 'is_multisite' ) && is_multisite() ) {
			$active_plugins = array_merge( $active_plugins, apply_filters( 'active_plugins', get_site_option( 'active_sitewide_plugins', array() ) ) );
		}

		if ( ( in_array( 'wordfence/wordfence.php', $active_plugins ) || array_key_exists( 'wordfence/wordfence.php', $active_plugins ) ) || ( in_array( 'wordfence-login-security/wordfence-login-security.php', $active_plugins ) || array_key_exists( 'wordfence-login-security/wordfence-login-security.php', $active_plugins ) ) ) {

			$wordfence_isactive = true;
		}

		return $wordfence_isactive;
	}


	public function i13_remove_extra_p_tags( $content ) {

		if ( strpos( $content, 'do_not_format_javascript' ) !== false ) {

			$pattern = '/<!-- do_not_format_javascript -->(.*)<!-- end_do_not_format_javascript -->/Uis';
			$content = preg_replace_callback(
				$pattern,
				function( $matches ) {

					$altered = str_replace( '<p>', '', $matches[1] );
					$altered = str_replace( '</p>', '', $altered );

					$altered = str_replace( '&#038;', '&', $altered );
					$altered = str_replace( '&#8221;', '"', $altered );

					return @str_replace( $matches[1], $altered, $matches[0] );
				},
				$content
			);

		}

			$content = str_replace( '<p><!-- do_not_format_javascript -->', '<!-- end_do_not_format_javascript -->', $content );
			$content = str_replace( '<!-- do_not_format_javascript --></p>', '<!-- end_do_not_format_javascript -->', $content );

			return $content;
	}
		
	public function checkCaptchaV3PPC($arrdata) {

		
		$i13_recapcha_checkout_action_v3 = get_option('i13_recapcha_checkout_action_v3');
		if ('' == $i13_recapcha_checkout_action_v3) {

			$i13_recapcha_checkout_action_v3 = 'checkout';
		}

		$use_v2_along_v3 = get_option('i13_turnstile_use_both_recaptcha');
		$recapcha_error_msg_captcha_blank = get_option('i13_turnstile_error_msg_captcha_blank_v3');
		$recapcha_error_msg_captcha_no_response = get_option('i13_turnstile_error_msg_captcha_no_response_v3');
		$recapcha_error_msg_captcha_invalid = get_option('i13_turnstile_error_msg_v3_invalid_captcha');
		
		$captcha_lable_ = get_option('i13_recapcha_guestcheckout_title');
		if ('' == trim($captcha_lable_)) {

			$captcha_lable_ = 'captcha';
		}
		$recapcha_error_msg_captcha_invalid = str_replace('[captcha]', ucfirst($captcha_lable_), $recapcha_error_msg_captcha_invalid);
	   
		
		$secret_key = get_option('wc_settings_tab_turnstile_secret_key_v3');
		
		$i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page');
		if ('' == $i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page) {
			$i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page = 'no';
		}

		$i13_recaptcha_v3_login_recpacha_for_req_btn_product_page = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn');
		if ('' == $i13_recaptcha_v3_login_recpacha_for_req_btn_product_page) {
			$i13_recaptcha_v3_login_recpacha_for_req_btn_product_page = 'no';
		}

		

		$i13_recapcha_v2_timeout = get_option('i13_turnstile_v2_timeout');
		if ('' == $i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout = 600;
		} else {

			$i13_recapcha_v2_timeout = $i13_recapcha_v2_timeout * 60;
		}
		
		$i13_recapcha_checkout_timeout = get_option('i13_recapcha_checkout_timeout');
		if (null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout) {

			$i13_recapcha_checkout_timeout = 3;
		}
		if (0 == $i13_recapcha_checkout_timeout) {
			$i13_recapcha_checkout_timeout = 0.5;
		}

		$nonce_value = isset($arrdata['recaptcha_i13_nonce']) ? sanitize_text_field(wp_unslash($arrdata['recaptcha_i13_nonce'])) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
		
		if ( 'yes' == $i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page || 'yes' == $i13_recaptcha_v3_login_recpacha_for_req_btn_product_page) {


			if ('yes' == get_transient($nonce_value)) {

				return true;
			}



			if (isset($arrdata['recaptcha_token_v3']) && !empty($arrdata['recaptcha_token_v3'])) {

				$cookiehash_i13 = isset($arrdata['cookiehash_i13']) ? sanitize_text_field(wp_unslash($arrdata['cookiehash_i13'])) : COOKIEHASH_I13;
		
				// Google reCAPTCHA API secret key 
				$response = sanitize_text_field($arrdata['recaptcha_token_v3']);
								
				

									// Verify the reCAPTCHA response 
								   $verifyResponse = wp_remote_post(
														   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
														   array(
																		   'method' => 'POST',
																		   'timeout' => 60,
																		   'body' => array(
																						   'secret' => $secret_key,
																						   'response' => $response,
																		   ),
															   )
															);


				if (is_array($verifyResponse) && !is_wp_error($verifyResponse) && isset($verifyResponse['body'])) {

					// Decode json data 
					$responseData = json_decode($verifyResponse['body']);
												
					// If reCAPTCHA response is valid 
					if (!$responseData->success) {


						if ('yes' == $use_v2_along_v3) {
							set_transient('i13_' . $cookiehash_i13 . 'block_checkout', '1', $i13_recapcha_v2_timeout);
						}
						if ('' == trim($recapcha_error_msg_captcha_invalid)) {


							  wp_send_json_error(
										array(
											'name' => 'i13_recaptcha_error',
											'message' => '<span id="cf-recaptcha_error_v3"></span>' . __('Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce'),
											'code' => 400,
										),
										400
								);
								exit;
									
								
						} else {

							  wp_send_json_error(
										array(
											'name' => 'i13_recaptcha_error',
											'message' => '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid,
											'code' => 400,
										),
										400
								);
								exit;
									
								
						}
					} else {



						if ($responseData->action != $i13_recapcha_checkout_action_v3) {

							if ('yes' == $use_v2_along_v3) {
								set_transient('i13_' . $cookiehash_i13 . 'block_checkout', '1', $i13_recapcha_v2_timeout);
							}
							if ('' == trim($recapcha_error_msg_captcha_invalid)) {

								 wp_send_json_error(
										array(
											'name' => 'i13_recaptcha_error',
											'message' => '<span id="cf-recaptcha_error_v3"></span>' . __('Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce'),
											'code' => 400,
										),
										400
								);
								exit;
									
									
							} else {

									
									
							   wp_send_json_error(
										array(
											'name' => 'i13_recaptcha_error',
											'message' => '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid,
											'code' => 400,
										),
										400
								);
								exit;
									
									
							}
						} else {

							if (0 != $i13_recapcha_checkout_timeout) {

								set_transient($nonce_value, 'yes', ( $i13_recapcha_checkout_timeout * 60 ));
							}
						}
					}
				} else {

					if ('yes' == $use_v2_along_v3) {
						set_transient('i13_' . $cookiehash_i13 . 'block_checkout', '1', $i13_recapcha_v2_timeout);
					}
					if ('' == trim($recapcha_error_msg_captcha_no_response)) {

							
						   wp_send_json_error(
										array(
											'name' => 'i13_recaptcha_error',
											'message' => '<span id="cf-recaptcha_error_v3"></span>' . __('Could not get response from turnstile server.', 'recaptcha-for-woocommerce'),
											'code' => 400,
										),
										400
								);
								exit;
									
							
					} else {


							  wp_send_json_error(
										array(
											'name' => 'i13_recaptcha_error',
											'message' => '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_no_response,
											'code' => 400,
										),
										400
								);
								exit;
									
							
					}
				}
				
			} else {

				$cookiehash_i13 = isset($arrdata['cookiehash_i13']) ? sanitize_text_field(wp_unslash($arrdata['cookiehash_i13'])) : COOKIEHASH_I13;
				if ('yes' == $use_v2_along_v3) {
					set_transient('i13_' . $cookiehash_i13 . 'block_checkout', '1', $i13_recapcha_v2_timeout);
				}
				if ('' == trim($recapcha_error_msg_captcha_blank)) {


						wp_send_json_error(
								array(
									'name' => 'i13_recaptcha_error',
									'message' => '<span id="cf-recaptcha_error_v3"></span>' . __('Turnstile token is missing.', 'recaptcha-for-woocommerce'),
									'code' => 400,
								),
								400
						);
						exit;
			
					
				} else {

					 wp_send_json_error(
								array(
									'name' => 'i13_recaptcha_error',
									'message' => '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_blank,
									'code' => 400,
								),
								400
						);
						exit;
						
					
				}
			}
		}
	}
	
	public function checkCaptchaV2PPC($arrdata) {

		
		
		
	   
		$recapcha_error_msg_captcha_blank = get_option('wc_settings_tab_turnstile_error_msg_captcha_blank');
		$recapcha_error_msg_captcha_no_response = get_option('wc_settings_tab_turnstile_error_msg_captcha_no_response');
		$recapcha_error_msg_captcha_invalid = get_option('wc_settings_tab_turnstile_error_msg_captcha_invalid');
		$captcha_lable_ = get_option('i13_recapcha_guestcheckout_title');
		if ('' == trim($captcha_lable_)) {

			$captcha_lable_ = 'captcha';
		}
		$recapcha_error_msg_captcha_invalid = str_replace('[captcha]', ucfirst($captcha_lable_), $recapcha_error_msg_captcha_invalid);
		
		$secret_key = get_option('wc_settings_tab_turnstile_secret_key');
		
		$i13_recaptcha_login_recpacha_for_req_btn_cart_page = get_option('i13_recaptcha_login_recpacha_for_req_btn_cart_page');
		if ('' == $i13_recaptcha_login_recpacha_for_req_btn_cart_page) {
			$i13_recaptcha_login_recpacha_for_req_btn_cart_page = 'no';
		}

		$i13_recaptcha_login_recpacha_for_req_btn = get_option('i13_recaptcha_login_recpacha_for_req_btn');
		if ('' == $i13_recaptcha_login_recpacha_for_req_btn) {
			$i13_recaptcha_login_recpacha_for_req_btn = 'no';
		}

		

				$i13_recapcha_v2_timeout = get_option('i13_turnstile_v2_timeout');
		if ('' == $i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout = 600;
		} else {

			$i13_recapcha_v2_timeout = $i13_recapcha_v2_timeout * 60;
		}
		
		$i13_recapcha_checkout_timeout = get_option('i13_recapcha_checkout_timeout');
		if (null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout) {

			$i13_recapcha_checkout_timeout = 3;
		}
		if (0 == $i13_recapcha_checkout_timeout) {
			$i13_recapcha_checkout_timeout = 0.5;
		}

		$nonce_value = isset($arrdata['recaptcha_i13_nonce']) ? sanitize_text_field(wp_unslash($arrdata['recaptcha_i13_nonce'])) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
		
		if ( 'yes' == $i13_recaptcha_login_recpacha_for_req_btn_cart_page || 'yes' == $i13_recaptcha_login_recpacha_for_req_btn) {


			if ('yes' == get_transient($nonce_value)) {

				return true;
			}



			if (isset($arrdata['recaptcha_token']) && !empty($arrdata['recaptcha_token'])) {

  
				// Google reCAPTCHA API secret key 
				$response = sanitize_text_field($arrdata['recaptcha_token']);
				$cookiehash_i13=sanitize_text_field($arrdata['cookiehash_i13']);



									// Verify the reCAPTCHA response 
									 $verifyResponse = wp_remote_post(
																'https://challenges.cloudflare.com/turnstile/v0/siteverify',
																array(
																				'method' => 'POST',
																				'timeout' => 60,
																				'body' => array(
																								'secret' => $secret_key,
																								'response' => $response,
																				),
																	)
																 );


				if (is_array($verifyResponse) && !is_wp_error($verifyResponse) && isset($verifyResponse['body'])) {

						// Decode json data 
						$responseData = json_decode($verifyResponse['body']);

						// If reCAPTCHA response is valid 
					if (!$responseData->success) {



						if ('' == trim($recapcha_error_msg_captcha_invalid)) {


				  wp_send_json_error(
					array(
							'name' => 'i13_recaptcha_error',
							'message' => '<span id="cf-recaptcha_error_v2"></span>' . __('Invalid captcha.', 'recaptcha-for-woocommerce'),
							'code' => 400,
					),
					400
	);
	exit;


						} else {

						  wp_send_json_error(
							array(
									'name' => 'i13_recaptcha_error',
									'message' => '<span id="cf-recaptcha_error_v2"></span>' . $recapcha_error_msg_captcha_invalid,
									'code' => 400,
							),
							400
			);
			exit;


						}
					} else {



														delete_transient('i13_' . $cookiehash_i13 . 'block_checkout');
														delete_transient('i13_' . $cookiehash_i13 . '_woo_checkout');
						if (0 != $i13_recapcha_checkout_timeout) {

					set_transient($nonce_value, 'yes', ( $i13_recapcha_checkout_timeout * 60 ));
						}
					}
				} else {


					if ('' == trim($recapcha_error_msg_captcha_no_response)) {


											   wp_send_json_error(
																			array(
																					'name' => 'i13_recaptcha_error',
																					'message' => '<span id="cf-recaptcha_error_v2"></span>' . __('Could not get response from turnstile server.', 'recaptcha-for-woocommerce'),
																					'code' => 400,
																			),
																			400
															);
															exit;


					} else {


														  wp_send_json_error(
																				array(
																						'name' => 'i13_recaptcha_error',
																						'message' => '<span id="cf-recaptcha_error_v2"></span>' . $recapcha_error_msg_captcha_no_response,
																						'code' => 400,
																				),
																				400
																);
																exit;


					}
				}
				
			} else {

			  
				if ('' == trim($recapcha_error_msg_captcha_blank)) {


						wp_send_json_error(
								array(
									'name' => 'i13_recaptcha_error',
									'message' => '<span id="cf-recaptcha_error_v2"></span>' . __('Turnstile token is missing.', 'recaptcha-for-woocommerce'),
									'code' => 400,
								),
								400
						);
						exit;
			
					
				} else {

					 wp_send_json_error(
								array(
									'name' => 'i13_recaptcha_error',
									'message' => '<span id="cf-recaptcha_error_v2"></span>' . $recapcha_error_msg_captcha_blank,
									'code' => 400,
								),
								400
						);
						exit;
						
					
				}
			}
		}
	}
	
	public function checkCaptchaV2PPCCheckout($arrdata) {

		$recapcha_error_msg_captcha_blank = get_option('wc_settings_tab_turnstile_error_msg_captcha_blank');
		$recapcha_error_msg_captcha_no_response = get_option('wc_settings_tab_turnstile_error_msg_captcha_no_response');
		$recapcha_error_msg_captcha_invalid = get_option('wc_settings_tab_turnstile_error_msg_captcha_invalid');
		$captcha_lable_ = get_option('i13_recapcha_guestcheckout_title');
		if ('' == trim($captcha_lable_)) {

			$captcha_lable_ = 'captcha';
		}
		$recapcha_error_msg_captcha_invalid = str_replace('[captcha]', ucfirst($captcha_lable_), $recapcha_error_msg_captcha_invalid);
		
		$secret_key = get_option('wc_settings_tab_turnstile_secret_key');
		
	   
		
		$is_enabled = get_option('i13_recapcha_enable_on_guestcheckout');
		$i13_recapcha_enable_on_logincheckout = get_option('i13_recapcha_enable_on_logincheckout');


				$i13_recapcha_v2_timeout = get_option('i13_turnstile_v2_timeout');
		if ('' == $i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout = 600;
		} else {

			$i13_recapcha_v2_timeout = $i13_recapcha_v2_timeout * 60;
		}
		
		$i13_recapcha_checkout_timeout = get_option('i13_recapcha_checkout_timeout');
		if (null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout) {

			$i13_recapcha_checkout_timeout = 3;
		}
		if (0 == $i13_recapcha_checkout_timeout) {
			$i13_recapcha_checkout_timeout = 0.5;
		}

		
		$nonce_value = wp_create_nonce('woocommerce-process_checkout');
		$context='';
		if (isset($arrdata['context']) && !empty($arrdata['context'])) {
		 
			$context=sanitize_text_field($arrdata['context']);
		}
		if ('pay-now'==$context) {
			$nonce_value = wp_create_nonce('woocommerce-pay');
		}


		if ('yes' == get_transient($nonce_value)) {

			return true;
		}



		if (isset($arrdata['recaptcha_token']) && !empty($arrdata['recaptcha_token'])) {


			// Google reCAPTCHA API secret key 
			$response = sanitize_text_field($arrdata['recaptcha_token']);
			$cookiehash_i13=sanitize_text_field($arrdata['cookiehash_i13']);

		
				// Verify the reCAPTCHA response 

								$verifyResponse = wp_remote_post(
														   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
														   array(
																		   'method' => 'POST',
																		   'timeout' => 60,
																		   'body' => array(
																						   'secret' => $secret_key,
																						   'response' => $response,
																		   ),
															   )
															);


			if (is_array($verifyResponse) && !is_wp_error($verifyResponse) && isset($verifyResponse['body'])) {

				// Decode json data 
				$responseData = json_decode($verifyResponse['body']);

				// If reCAPTCHA response is valid 
				if (!$responseData->success) {



					if ('' == trim($recapcha_error_msg_captcha_invalid)) {


						  wp_send_json_error(
									array(
										'name' => 'i13_recaptcha_error',
										'message' => '<span id="cf-recaptcha_error_v2"></span>' . __('Invalid captcha.', 'recaptcha-for-woocommerce'),
										'code' => 400,
									),
									400
							);
							exit;


					} else {

						  wp_send_json_error(
									array(
										'name' => 'i13_recaptcha_error',
										'message' => '<span id="cf-recaptcha_error_v2"></span>' . $recapcha_error_msg_captcha_invalid,
										'code' => 400,
									),
									400
							);
							exit;


					}
				} else {



						delete_transient('i13_' . $cookiehash_i13 . 'block_checkout');
						delete_transient('i13_' . $cookiehash_i13 . '_woo_checkout');
					if (0 != $i13_recapcha_checkout_timeout) {

						set_transient($nonce_value, 'yes', ( $i13_recapcha_checkout_timeout * 60 ));
					}
				}
			} else {


				if ('' == trim($recapcha_error_msg_captcha_no_response)) {


					   wp_send_json_error(
									array(
										'name' => 'i13_recaptcha_error',
										'message' => '<span id="cf-recaptcha_error_v2"></span>' . __('Could not get response from turnstile server.', 'recaptcha-for-woocommerce'),
										'code' => 400,
									),
									400
							);
							exit;


				} else {


						  wp_send_json_error(
									array(
										'name' => 'i13_recaptcha_error',
										'message' => '<span id="cf-recaptcha_error_v2"></span>' . $recapcha_error_msg_captcha_no_response,
										'code' => 400,
									),
									400
							);
							exit;


				}
			}
			
		} else {


			if ('' == trim($recapcha_error_msg_captcha_blank)) {


					wp_send_json_error(
							array(
								'name' => 'i13_recaptcha_error',
								'message' => '<span id="cf-recaptcha_error_v2"></span>' . __('Turnstile token is missing.', 'recaptcha-for-woocommerce'),
								'code' => 400,
							),
							400
					);
					exit;


			} else {

				 wp_send_json_error(
							array(
								'name' => 'i13_recaptcha_error',
								'message' => '<span id="cf-recaptcha_error_v2"></span>' . $recapcha_error_msg_captcha_blank,
								'code' => 400,
							),
							400
					);
					exit;


			}
		}

	}
	
	
	public function checkCaptchaV3PPCCheckout($arrdata) {

		
		$i13_recapcha_checkout_action_v3 = get_option('i13_recapcha_checkout_action_v3');
		if ('' == $i13_recapcha_checkout_action_v3) {

			$i13_recapcha_checkout_action_v3 = 'checkout';
		}

		$use_v2_along_v3 = get_option('i13_turnstile_use_both_recaptcha');
		$recapcha_error_msg_captcha_blank = get_option('i13_turnstile_error_msg_captcha_blank_v3');
		$recapcha_error_msg_captcha_no_response = get_option('i13_turnstile_error_msg_captcha_no_response_v3');
		$recapcha_error_msg_captcha_invalid = get_option('i13_turnstile_error_msg_v3_invalid_captcha');
		
		$captcha_lable_ = get_option('i13_recapcha_guestcheckout_title');
		if ('' == trim($captcha_lable_)) {

			$captcha_lable_ = 'captcha';
		}
		$recapcha_error_msg_captcha_invalid = str_replace('[captcha]', ucfirst($captcha_lable_), $recapcha_error_msg_captcha_invalid);
	   
		
		$secret_key = get_option('wc_settings_tab_turnstile_secret_key_v3');
		
		$is_enabled = get_option('i13_recapcha_enable_on_guestcheckout');
		$i13_recapcha_enable_on_logincheckout = get_option('i13_recapcha_enable_on_logincheckout');

		

		 $i13_recapcha_v2_timeout = get_option('i13_turnstile_v2_timeout');
		if ('' == $i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout = 600;
		} else {

			$i13_recapcha_v2_timeout = $i13_recapcha_v2_timeout * 60;
		}
		
		$i13_recapcha_checkout_timeout = get_option('i13_recapcha_checkout_timeout');
		if (null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout) {

			$i13_recapcha_checkout_timeout = 3;
		}
		if (0 == $i13_recapcha_checkout_timeout) {
			$i13_recapcha_checkout_timeout = 0.5;
		}

		$trans='_woo_checkout';
		$nonce_value = wp_create_nonce('woocommerce-process_checkout');
		$context='';
		if (isset($arrdata['context']) && !empty($arrdata['context'])) {
		 
			$context=sanitize_text_field($arrdata['context']);
		}
		if ('pay-now'==$context) {
			$nonce_value = wp_create_nonce('woocommerce-pay');
			$trans='_woo_pay_order';
		}
		
		


		if ('yes' == get_transient($nonce_value)) {

			return true;
		}



		if (isset($arrdata['recaptcha_token_v3']) && !empty($arrdata['recaptcha_token_v3'])) {


			$cookiehash_i13=sanitize_text_field($arrdata['cookiehash_i13']);

			// Google reCAPTCHA API secret key 
			$response = sanitize_text_field($arrdata['recaptcha_token_v3']);

			

				 $verifyResponse = wp_remote_post(
													'https://challenges.cloudflare.com/turnstile/v0/siteverify',
													array(
																	'method' => 'POST',
																	'timeout' => 60,
																	'body' => array(
																					'secret' => $secret_key,
																					'response' => $response,
																	),
														)
													 );

			if (is_array($verifyResponse) && !is_wp_error($verifyResponse) && isset($verifyResponse['body'])) {

				// Decode json data 
				$responseData = json_decode($verifyResponse['body']);

				// If reCAPTCHA response is valid 
				if (!$responseData->success) {


					if ('yes' == $use_v2_along_v3) {
						set_transient('i13_' . $cookiehash_i13 . $trans, '1', $i13_recapcha_v2_timeout);
					}
					if ('' == trim($recapcha_error_msg_captcha_invalid)) {


						  wp_send_json_error(
									array(
										'name' => 'i13_recaptcha_error',
										'message' => '<span id="cf-recaptcha_error_v3"></span>' . __('Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce'),
										'code' => 400,
									),
									400
							);
							exit;


					} else {

						  wp_send_json_error(
									array(
										'name' => 'i13_recaptcha_error',
										'message' => '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid,
										'code' => 400,
									),
									400
							);
							exit;


					}
				} else {



					if ( $responseData->action != $i13_recapcha_checkout_action_v3) {

						if ('yes' == $use_v2_along_v3) {
							set_transient('i13_' . $cookiehash_i13 . $trans, '1', $i13_recapcha_v2_timeout);
						}
						if ('' == trim($recapcha_error_msg_captcha_invalid)) {

							 wp_send_json_error(
									array(
										'name' => 'i13_recaptcha_error',
										'message' => '<span id="cf-recaptcha_error_v3"></span>' . __('Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce'),
										'code' => 400,
									),
									400
							);
							exit;


						} else {



						   wp_send_json_error(
									array(
										'name' => 'i13_recaptcha_error',
										'message' => '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid,
										'code' => 400,
									),
									400
							);
							exit;


						}
					} else {

						if (0 != $i13_recapcha_checkout_timeout) {

							set_transient($nonce_value, 'yes', ( $i13_recapcha_checkout_timeout * 60 ));
						}
					}
				}
			} else {

				if ('yes' == $use_v2_along_v3) {
					set_transient('i13_' . $cookiehash_i13 . $trans, '1', $i13_recapcha_v2_timeout);
				}
				if ('' == trim($recapcha_error_msg_captcha_no_response)) {


					   wp_send_json_error(
									array(
										'name' => 'i13_recaptcha_error',
										'message' => '<span id="cf-recaptcha_error_v3"></span>' . __('Could not get response from turnstile server.', 'recaptcha-for-woocommerce'),
										'code' => 400,
									),
									400
							);
							exit;


				} else {


						  wp_send_json_error(
									array(
										'name' => 'i13_recaptcha_error',
										'message' => '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_no_response,
										'code' => 400,
									),
									400
							);
							exit;


				}
			}
			
		} else {

						$cookiehash_i13 = isset($arrdata['cookiehash_i13']) ? sanitize_text_field(wp_unslash($arrdata['cookiehash_i13'])) : COOKIEHASH_I13;
			if ('yes' == $use_v2_along_v3) {
				set_transient('i13_' . $cookiehash_i13 . $trans, '1', $i13_recapcha_v2_timeout);
			}
			if ('' == trim($recapcha_error_msg_captcha_blank)) {


					wp_send_json_error(
							array(
								'name' => 'i13_recaptcha_error',
								'message' => '<span id="cf-recaptcha_error_v3"></span>' . __('Turnstile token is missing.', 'recaptcha-for-woocommerce'),
								'code' => 400,
							),
							400
					);
					exit;


			} else {

				 wp_send_json_error(
							array(
								'name' => 'i13_recaptcha_error',
								'message' => '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_blank,
								'code' => 400,
							),
							400
					);
					exit;


			}
		}
		
	}
	
	public function i13_woocommerce_paypal_payments_create_order_request_started(array $data) {

		
		
		$ononce = isset($data['nonce']) ? sanitize_text_field(wp_unslash($data['nonce'])) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
		if (wp_verify_nonce($ononce, 'ppc-create-order')) {
			
			
			$nonce_value = isset($data['recaptcha_i13_nonce']) ? sanitize_text_field(wp_unslash($data['recaptcha_i13_nonce'])) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
			$cookiehash_i13 = isset($data['cookiehash_i13']) ? sanitize_text_field(wp_unslash($data['cookiehash_i13'])) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.NoNonceVerification
			$use_v2_along_v3 = get_option('i13_turnstile_use_both_recaptcha');
			$i13_recapcha_v2_timeout = get_option('i13_turnstile_v2_timeout');
			if ('' == $i13_recapcha_v2_timeout) {
				$i13_recapcha_v2_timeout = 600;
			} else {

				$i13_recapcha_v2_timeout = $i13_recapcha_v2_timeout * 60;
			}

			if (isset($data['recap_v']) && !empty($data['recap_v'])) {
				
				$reCapcha_version=sanitize_text_field($data['recap_v']);
			} else {
				
				$reCapcha_version = get_option( 'i13_recapcha_version' );
				if ( '' == $reCapcha_version ) {
						$reCapcha_version = 'v2';
				}
			}

			
			
		 

			if (isset($data['context']) && 'checkout'==sanitize_text_field($data['context'])) {


								$is_enabled = get_option('i13_recapcha_enable_on_guestcheckout');
								$i13_recapcha_enable_on_logincheckout = get_option('i13_recapcha_enable_on_logincheckout');
				if ( 'v3'==strtolower($reCapcha_version) && ( ( 'yes' == $is_enabled && !is_user_logged_in() ) || ( 'yes' ==  $i13_recapcha_enable_on_logincheckout && is_user_logged_in() ) )) {
								
				$this->checkCaptchaV3PPCCheckout($data);
				} else if ( 'v2'==strtolower($reCapcha_version) && ( ( 'yes' ==  $is_enabled && !is_user_logged_in() ) || ( 'yes' ==  $i13_recapcha_enable_on_logincheckout && is_user_logged_in() ) )) { 

					$this->checkCaptchaV2PPCCheckout($data);
				}
							
						
			} else if (isset($data['context']) && 'pay-now'==sanitize_text_field($data['context'])) {
					
				$is_enabled = get_option( 'i13_recapcha_enable_on_payfororder' );
				if ('yes'== $is_enabled) {
						
					if ( 'v3'==strtolower($reCapcha_version) ) {

							$this->checkCaptchaV3PPCCheckout($data);
					} else if ('v2'==strtolower($reCapcha_version)) {

						$this->checkCaptchaV2PPCCheckout($data);
					}
						
				}
			} else {

					
				if (isset($data['js_context']) && !empty($data['js_context']) && 'inline'==sanitize_text_field($data['js_context'])) {
						
						
					if ('v3'==strtolower($reCapcha_version)) {
					
							$use_v2_along_v3=get_option( 'i13_turnstile_use_both_recaptcha' );
						if ( 'yes' == $use_v2_along_v3 ) {

											
							if (1==get_transient( 'i13_' . COOKIEHASH_I13 . '_woo_checkout')) {

									$reCapcha_version='v2';
												  
							} else if (1 == get_transient('i13_' . COOKIEHASH_I13 . 'block_checkout')) {

									$reCapcha_version = 'v2';
													
							}
						}
					}
				
					if ( 'v3'==strtolower($reCapcha_version) ) {

						$i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page');
						if ('' == $i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page) {
							$i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page = 'no';
						}

						$i13_recaptcha_v3_login_recpacha_for_req_btn_product_page = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn');
						if ('' == $i13_recaptcha_v3_login_recpacha_for_req_btn_product_page) {
							$i13_recaptcha_v3_login_recpacha_for_req_btn_product_page = 'no';
						}
								
						if ( 'yes' == $i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page || 'yes' == $i13_recaptcha_v3_login_recpacha_for_req_btn_product_page) {
									
							$this->checkCaptchaV3PPCCheckout($data);
						}
					} else if ('v2'==strtolower($reCapcha_version)) {

						$i13_recaptcha_login_recpacha_for_req_btn_cart_page = get_option( 'i13_recaptcha_login_recpacha_for_req_btn_cart_page' );
						if ( '' == $i13_recaptcha_login_recpacha_for_req_btn_cart_page ) {
							$i13_recaptcha_login_recpacha_for_req_btn_cart_page = 'no';
						}
								
						$i13_recaptcha_login_recpacha_for_req_btn = get_option( 'i13_recaptcha_login_recpacha_for_req_btn' );
						if ( '' == $i13_recaptcha_login_recpacha_for_req_btn ) {
							$i13_recaptcha_login_recpacha_for_req_btn = 'no';
						}
								
						if ( 'yes' == $i13_recaptcha_login_recpacha_for_req_btn_cart_page || 'yes' == $i13_recaptcha_login_recpacha_for_req_btn) {
							$this->checkCaptchaV2PPCCheckout($data);
						}
					}
				} else {
					if ( 'v3'==strtolower($reCapcha_version) ) {

						$this->checkCaptchaV3PPC($data);
					} else if ('v2'==strtolower($reCapcha_version) ) {

						$this->checkCaptchaV2PPC($data);
					}
				}

			}
			
		} else {
			
			
			wp_send_json_error(
						array(
							'name' => 'i13_recaptcha_nonce_fail',
							'message' => __('Could not verify request.', 'recaptcha-for-woocommerce'),
							'code' => 400,
						),
						400
				);
		}
	}

}


