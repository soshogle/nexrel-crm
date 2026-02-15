<?php

use Automattic\WooCommerce\Blocks\Integrations\IntegrationInterface;
use Automattic\WooCommerce\Blocks\StoreApi\Schemas\CheckoutSchema;
use Automattic\WooCommerce\StoreApi\Schemas\ExtendSchema;
use Automattic\WooCommerce\StoreApi\StoreApi;

#use Automattic\WooCommerce\StoreApi\Schemas\V1\CheckoutSchema;

define('RECAPTCHA_BLOCK_VERSION', '2.0');
defined('ABSPATH') || exit;

/**
 * Class I13Recaptcha_Blocks_Integration
 *
 * Class for integrating marketing reCaptcha block with WooCommerce Checkout
 *
 */
class I13Recaptcha_Blocks_Integration implements IntegrationInterface {

	/**
	 * The name of the integration.
	 *
	 * @return string
	 */
	public function get_name() {
		return 'i13-recaptcha-checkout-block';
	}

	/**
	 * When called invokes any initialization/setup for the integration.
	 */
	public function initialize() {


		$this->register_frontend_scripts();
		$this->register_editor_scripts();
		$this->register_editor_blocks();

		$this->extend_store_api();
		add_filter('__experimental_woocommerce_blocks_add_data_attributes_to_block', [$this, 'add_attributes_to_frontend_blocks'], 10, 1);
		add_action('wp_enqueue_scripts', array($this, 'i13_woo_recaptcha_remove_ref'), 99999);
		add_filter('nonce_user_logged_out', array($this, 'i13_modify_nonce_user_logged_out_defaults'), 10, 2);
		add_action('wp_ajax_save_recaptcha_token', array($this, 'i13_save_recaptcha_token'));
		add_action('wp_ajax_nopriv_save_recaptcha_token', array($this, 'i13_save_recaptcha_token'));
		add_action('wp_ajax_save_recaptcha_tokenv2', array($this, 'i13_save_recaptcha_tokenv2'));
		add_action('wp_ajax_nopriv_save_recaptcha_tokenv2', array($this, 'i13_save_recaptcha_tokenv2'));
		
				/*add_filter('script_loader_tag', function($tag, $handle, $src) {
					// Replace 'i13-recaptcha-checkout-block-frontend' with your ACTUAL script handle
					if ( 'i13-recaptcha-checkout-block-frontend' === $handle ) {
						$tag = '<script type="module" src="' . esc_url($src) . '"></script>';
					}
					return $tag;
				}, 10, 3);
				 * 
				 */
		add_action('woocommerce_store_api_checkout_update_order_from_request', function ($order, $request) {

			if ($request->get_method() === 'POST') {
				$extensions = $request->get_param('extensions');
				if (empty($extensions)) {
					throw new \Exception(__('Extensions cannot be empty', 'recaptcha-for-woocommerce'));
				}

				//check unknown order source
				$i13_recaptcha_block_unknown_orgin_orders = get_option('i13_recaptcha_block_unknown_orgin_orders');
				if ('yes' == $i13_recaptcha_block_unknown_orgin_orders) {

					$i13_recapcha_error_msg_invalid_order_origin = get_option('i13_recapcha_error_msg_invalid_order_origin');
					$source_types = array('utm', 'organic', 'referral', 'typein', 'mobile_app', 'admin');
					$_wc_order_attribution_source_type = '';
					if (isset($extensions['woocommerce/order-attribution']) && isset($extensions['woocommerce/order-attribution']['source_type'])) {

						$_wc_order_attribution_source_type = $extensions['woocommerce/order-attribution']['source_type'];
					}

					if ('' == $_wc_order_attribution_source_type) {

						if ('' == $i13_recapcha_error_msg_invalid_order_origin) {

							throw new \Exception(__('Order with an unknown origin is not allowed.', 'recaptcha-for-woocommerce'));
						} else {

							throw new \Exception($i13_recapcha_error_msg_invalid_order_origin);
						}
					} else if (!in_array(strtolower($_wc_order_attribution_source_type), $source_types)) {

						if ('' == $i13_recapcha_error_msg_invalid_order_origin) {

							throw new \Exception(__('Order with an unknown origin is not allowed.', 'recaptcha-for-woocommerce'));
						} else {

							throw new \Exception($i13_recapcha_error_msg_invalid_order_origin);
						}
					}
				}


				$value = $extensions[$this->get_name()];
				if (empty($value)) {
					throw new \Exception(__('Catpcha response cannot be empty', 'recaptcha-for-woocommerce'));
				}
				
								
								 $captcha_provider = get_option('i13_captcha_provider', 'google');
				if ('google'==$captcha_provider) {
					$response = $this->i13_checkout_check_captcha($value);
				} else if ('turnstile'==$captcha_provider) {

					$response = $this->i13_checkout_check_turnstile_captcha($value);
									
				}
																
				if (is_wp_error($response)) {
					throw new \Exception($response->get_error_message());
				}

				return $order;
			}
		}, 10, 2);
	}

	public function i13_woo_recaptcha_remove_ref() {


				$captcha_provider = get_option('i13_captcha_provider', 'google');
		$is_enabled = get_option('i13_recapcha_enable_on_guestcheckout');
		$i13_recapcha_enable_on_logincheckout = get_option('i13_recapcha_enable_on_logincheckout');

		//wp_enqueue_style('frontend-recaptcha-block', plugins_url('/build/recaptcha-block-frontend.css', __FILE__), array(), RECAPTCHA_BLOCK_VERSION);

		$i13_recaptcha_for_cart_page = get_option('i13_recaptcha_login_recpacha_for_req_btn_cart_page');
		if ('' == $i13_recaptcha_for_cart_page) {
			$i13_recaptcha_for_cart_page = 'no';
		}

		$i13_recaptcha_for_product_page = get_option('i13_recaptcha_login_recpacha_for_req_btn');
		if ('' == $i13_recaptcha_for_product_page) {
			$i13_recaptcha_for_product_page = 'no';
		}

		$i13_recaptcha_for_product_page_v3 = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn');
		if ('' == $i13_recaptcha_for_product_page_v3) {
			$i13_recaptcha_for_product_page = 'no';
		}

		$i13_recaptcha_for_cart_page_v3 = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page');
		if ('' == $i13_recaptcha_for_cart_page_v3) {
			$i13_recaptcha_for_cart_page_v3 = 'no';
		}

		if (is_singular()) {
			//We only want the script if it's a singular page
			$id = get_the_ID();
			if (has_block('woocommerce/checkout', $id)) {


				global $wp_scripts;
								
								$urls=array();
				if ('google'==$captcha_provider) {
					$urls = array('google.com/recaptcha', 'gstatic.com/recaptcha', 'recaptcha.net/recaptcha');
				} else if ('turnstile'==$captcha_provider) {
									
					$urls = array('challenges.cloudflare.com');
									
									
				}

				foreach ($wp_scripts->queue as $handle) {

					foreach ($urls as $url) {
						if (false !== strpos($wp_scripts->registered[$handle]->src, $url) && ( 'i13-woo-captcha' != $handle && 'i13-woo-captcha-v3' != $handle )) {
							wp_dequeue_script($handle);
							wp_deregister_script($handle);
							break;
						}
					}
				}
			} else if (has_block('woocommerce/cart', $id)) {

				if ('google'==$captcha_provider) {
									
					$reCapcha_version = get_option('i13_recapcha_version');
				} else if ('turnstile'==$captcha_provider) {
									 
					 $reCapcha_version = get_option('i13_turnstile_version');
				}
				$use_v2_along_v3 = '';
				if ('' == $reCapcha_version) {
					$reCapcha_version = 'v2';
				}


				if ('v3' == strtolower($reCapcha_version)) {

					if ('google'==$captcha_provider) {
											 
					   $use_v2_along_v3 = get_option('i13_recapcha_use_both_recaptcha');
					} else if ('turnstile'==$captcha_provider) {
											  
						  $use_v2_along_v3 = get_option('i13_turnstile_use_both_recaptcha');
					}
										  
					if ('yes' == $use_v2_along_v3) {

						if (1 == get_transient('i13_' . COOKIEHASH_I13 . 'block_checkout')) {

							$reCapcha_version = 'v2';
							if ('yes'!=$i13_recaptcha_for_cart_page) {
								
								$i13_recaptcha_for_cart_page=$i13_recaptcha_for_cart_page_v3;
							}
						}
					}
				}


				if ('v2' == $reCapcha_version && 'yes' == $i13_recaptcha_for_cart_page && ( ( $is_enabled && !is_user_logged_in() ) || ( $i13_recapcha_enable_on_logincheckout && is_user_logged_in() ) )) {

					$scriptData = $this->get_script_data();
					if ('google'==$captcha_provider) {
						  wp_enqueue_script(
										  'i13-google-recaptcha-v2-cart-page',
										  'https://' . esc_html(sanitize_text_field($this->i13_get_recaptcha_domain())) . '/recaptcha/' . I13_USE_API . '?from=i13_recaptcha&hl=' . $scriptData['i13_recapcha_v2_lang'] . '&onload=onRecaptchaLoadCallback&render=explicit',
										  [],
										  '1.3',
										  true
						  );
												
						  // Our JS
						  wp_register_script(
										  'cart-recaptcha-v2',
										  plugin_dir_url(__FILE__) . 'assets/js/recaptcha-block/cart-recaptcha-v2.js',
										  ['wp-hooks'],
										  '2.0',
										  true,
										  [],
										  true
						  );
					} else if ('turnstile'==$captcha_provider) {
											  
											  
						 wp_enqueue_script(
										  'i13-turnstile-recaptcha-v2-cart-page',
										  'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha&hl=' . $scriptData['i13_recapcha_v2_lang'] . '&onload=onRecaptchaLoadCallback&render=explicit',
										  [],
										  '1.3',
										  true
						  );
											   
						 // Our JS
						  wp_register_script(
										  'cart-recaptcha-v2',
										  plugin_dir_url(__FILE__) . 'assets/js/recaptcha-block/cart-turnstile-v2.js',
										  ['wp-hooks'],
										  '2.14',
										  true,
										  [],
										  true
						  );
					}

					

					wp_localize_script(
							'cart-recaptcha-v2',
							'RecaptchaSettings',
							[
								'siteKey' => $scriptData['site_key_v2'],
								'theme' => $scriptData['theme'],
								'size' => $scriptData['size'],
								'lang' => $scriptData['i13_recapcha_v2_lang'],
								'captcha_lable' => $scriptData['captcha_lable'],
								'refresh_lable' => $scriptData['refresh_lable'],
								'i13_is_enterprise_captcha' => $scriptData['i13_is_enterprise_captcha'],
								'recapcha_error_msg_captcha_blank' => $scriptData['recapcha_error_msg_captcha_blank'],
								'recapcha_error_msg_captcha_invalid_v2' => $scriptData['recapcha_error_msg_captcha_invalid_v2'],
								'ajaxurl' => admin_url('admin-ajax.php'),
								'nonce' => wp_create_nonce('save_recaptcha_tokenv2_nonce'),
								'nonce_ppc' => wp_create_nonce('i13-woocommerce-process_checkout-block'),
								'cookiehash_i13' => $scriptData['cookiehash_i13'],
							]
					);

					wp_enqueue_script('cart-recaptcha-v2');
				}
				if ('v3' == $reCapcha_version && 'yes' == $i13_recaptcha_for_cart_page_v3 && ( ( $is_enabled && !is_user_logged_in() ) || ( $i13_recapcha_enable_on_logincheckout && is_user_logged_in() ) )) {


					$scriptData = $this->get_script_data();

					if ('google'==$captcha_provider) {
							wp_enqueue_script(
											'i13-google-recaptcha-v3-cart-page',
											'https://' . esc_html(sanitize_text_field($this->i13_get_recaptcha_domain())) . '/recaptcha/' . I13_USE_API . '?from=i13_recaptcha&onload=onRecaptchaLoadCallbackV3&render=' . $scriptData['site_key_v3'],
											[],
											'1.25',
											true
							);

							// Our JS
							wp_register_script(
											'cart-recaptcha-v3',
											plugin_dir_url(__FILE__) . 'assets/js/recaptcha-block/cart-recaptcha-v3.js',
											['wp-hooks'],
											'2.1',
											true,
											[],
											true
							);
					} else if ('turnstile'==$captcha_provider) {
											
											
						 wp_enqueue_script(
											'i13-google-turnstile-v3-cart-page',
											'https://challenges.cloudflare.com/turnstile/v0/api.js?from=i13_recaptcha&onload=onRecaptchaLoadCallbackV3&render=explicit',
											[],
											'1.31',
											true
							);

							// Our JS
							wp_register_script(
											'cart-recaptcha-v3',
											plugin_dir_url(__FILE__) . 'assets/js/recaptcha-block/cart-turnstile-v3.js',
											['wp-hooks'],
											'2.15',
											true,
											[],
											true
							);
											
					}

					wp_localize_script(
							'cart-recaptcha-v3',
							'RecaptchaSettings',
							[
								'siteKey' => $scriptData['site_key_v3'],
								'i13_is_enterprise_captcha' => $scriptData['i13_is_enterprise_captcha'],
								'recapcha_error_msg_captcha_blank' => $scriptData['recapcha_error_msg_captcha_blank'],
								'i13_recapcha_checkout_action_v3' => $scriptData['i13_recapcha_checkout_action_v3'],
								'recapcha_error_msg_captcha_invalid_v3' => $scriptData['recapcha_error_msg_captcha_invalid_v3'],
								'ajaxurl' => admin_url('admin-ajax.php'),
								'use_v2_along_v3' => $scriptData['use_v2_along_v3'],
								'cookiehash_i13' => $scriptData['cookiehash_i13'],
								'nonce' => wp_create_nonce('save_recaptcha_token_nonce'),
								'nonce_ppc' => wp_create_nonce('i13-woocommerce-process_checkout-block')
							]
					);
					
				

					wp_enqueue_script('cart-recaptcha-v3');
				}
			} else if (is_product()) {



				if ('google'==$captcha_provider) {
									
									$reCapcha_version = get_option('i13_recapcha_version');
				} else if ('turnstile'==$captcha_provider) {
									 
					 $reCapcha_version = get_option('i13_turnstile_version');
				}
								 
				$use_v2_along_v3 = '';
				if ('' == $reCapcha_version) {
					$reCapcha_version = 'v2';
				}


				if ('v3' == strtolower($reCapcha_version)) {

					if ('google'==$captcha_provider) {
											 
										   $use_v2_along_v3 = get_option('i13_recapcha_use_both_recaptcha');
					} else if ('turnstile'==$captcha_provider) {
											  
						  $use_v2_along_v3 = get_option('i13_turnstile_use_both_recaptcha');
					}
					
					if ('yes' == $use_v2_along_v3) {
						
						if (1 == get_transient('i13_' . COOKIEHASH_I13 . 'block_checkout')) {

							$reCapcha_version = 'v2';
							if ('yes'!=$i13_recaptcha_for_product_page) {
								
								$i13_recaptcha_for_product_page=$i13_recaptcha_for_product_page_v3;
							}
							
						}
					}
				}


				if ('v2' == $reCapcha_version && 'yes' == $i13_recaptcha_for_product_page && ( ( $is_enabled && !is_user_logged_in() ) || ( $i13_recapcha_enable_on_logincheckout && is_user_logged_in() ) )) { 

					$scriptData = $this->get_script_data();

					if ('google'==$captcha_provider) {
						  // Our JS
						  wp_register_script(
										  'product-recaptcha-v2',
										  plugin_dir_url(__FILE__) . 'assets/js/recaptcha-block/product-recaptcha-v2.js',
										  ['wp-hooks'],
										  '1.75',
										  true,
										  [],
										  true
						  );
					} else if ('turnstile'==$captcha_provider) {
											   
						 wp_register_script(
										  'product-recaptcha-v2',
										  plugin_dir_url(__FILE__) . 'assets/js/recaptcha-block/product-turnstile-v2.js',
										  ['wp-hooks'],
										  '1.75',
										  true,
										  [],
										  true
						  );
											   
					}  
					wp_localize_script(
							'product-recaptcha-v2',
							'RecaptchaSettings',
							[
								'captcha_lable' => $scriptData['captcha_lable'],
								'refresh_lable' => $scriptData['refresh_lable'],
								'i13_is_enterprise_captcha' => $scriptData['i13_is_enterprise_captcha'],
								'recapcha_error_msg_captcha_blank' => $scriptData['recapcha_error_msg_captcha_blank'],
								'recapcha_error_msg_captcha_invalid_v2' => $scriptData['recapcha_error_msg_captcha_invalid_v2'],
								'ajaxurl' => admin_url('admin-ajax.php'),
								'nonce' => wp_create_nonce('save_recaptcha_tokenv2_nonce'),
								 'nonce_ppc' => wp_create_nonce('i13-woocommerce-process_checkout-block'),
								'cookiehash_i13' => $scriptData['cookiehash_i13'],
								
							]
					);

					wp_enqueue_script('product-recaptcha-v2');
				}
				if ('v3' == $reCapcha_version && 'yes' == $i13_recaptcha_for_product_page_v3 && ( ( $is_enabled && !is_user_logged_in() ) || ( $i13_recapcha_enable_on_logincheckout && is_user_logged_in() ) )) {


					$scriptData = $this->get_script_data();

										
					if ('google'==$captcha_provider) {
					   // Our JS
					   wp_register_script(
									   'product-recaptcha-v3',
									   plugin_dir_url(__FILE__) . 'assets/js/recaptcha-block/product-recaptcha-v3.js',
									   ['wp-hooks'],
									   '1.72',
									   true,
									   [],
									   true
					   );
					} else if ('turnstile'==$captcha_provider) {
											   
						   // Our JS
						  wp_register_script(
										  'product-recaptcha-v3',
										  plugin_dir_url(__FILE__) . 'assets/js/recaptcha-block/product-turnstile-v3.js',
										  ['wp-hooks'],
										  '1.82',
										  true,
										  [],
										  true
						  );
											   
					}

					wp_localize_script(
							'product-recaptcha-v3',
							'RecaptchaSettings',
							[
								'recapcha_error_msg_captcha_blank' => $scriptData['recapcha_error_msg_captcha_blank'],
								'recapcha_error_msg_captcha_invalid_v3' => $scriptData['recapcha_error_msg_captcha_invalid_v3'],
								'use_v2_along_v3' => $scriptData['use_v2_along_v3'],
								'cookiehash_i13' => $scriptData['cookiehash_i13'],
								'ajaxurl' => admin_url('admin-ajax.php'),
								'nonce' => wp_create_nonce('save_recaptcha_token_nonce'),
								'nonce_ppc' => wp_create_nonce('i13-woocommerce-process_checkout-block')
							]
					);

					wp_enqueue_script('product-recaptcha-v3');
				}
			}
		}
	}

	public function register_frontend_scripts() {
		$script_path = '/build/recaptcha-block-frontend.js';
		$script_url = plugins_url($script_path, __FILE__);
		$script_asset_path = dirname(__FILE__) . '/build/recaptcha-block-frontend.asset.php';
		$script_asset = file_exists($script_asset_path) ? require $script_asset_path : array(
			'dependencies' => array(),
			'version' => $this->get_file_version($script_asset_path),
		);

		wp_register_script(
				'i13-recaptcha-checkout-block-frontend',
				$script_url,
				$script_asset['dependencies'],
				$script_asset['version'],
				true
		);
				
				wp_localize_script( 
	'i13-recaptcha-checkout-block-frontend', // The handle you used in wp_enqueue_script
	'i13_vars', 
	array(
		'plugin_url' => plugin_dir_url( __FILE__ ) 
	) 
);

		wp_set_script_translations(
				'i13-recaptcha-checkout-block-frontend', // script handle
				'recaptcha-for-woocommerce', // text domain
				dirname(dirname(__FILE__)) . '/languages'
		);
	}

	public function register_editor_scripts() {
		$script_path = '/build/recaptcha-block.js';
		$script_url = plugins_url($script_path, __FILE__);
		$script_asset_path = dirname(__FILE__) . '/build/recaptcha-block.asset.php';
		$script_asset = file_exists($script_asset_path) ? require $script_asset_path : array(
			'dependencies' => array(),
			'version' => $this->get_file_version($script_asset_path),
		);

		wp_register_script(
				'i13-recaptcha-checkout-block-editor',
				$script_url,
				$script_asset['dependencies'],
				$script_asset['version'],
				true
		);

		wp_set_script_translations(
				'i13-recaptcha-checkout-block-editor', // script handle
				'recaptcha-for-woocommerce', // text domain
				dirname(__FILE__) . '/languages'
		);
	}

	/**
	 * Returns an array of script handles to enqueue in the frontend context.
	 *
	 * @return string[]
	 */
	public function get_script_handles() {
		return array('i13-recaptcha-checkout-block-frontend');
	}

	/**
	 * Returns an array of script handles to enqueue in the editor context.
	 *
	 * @return string[]
	 */
	public function get_editor_script_handles() {
		return array('i13-recaptcha-checkout-block-editor');
	}

	/**
	 * An array of key, value pairs of data made available to the block on the client side.
	 *
	 * @return array
	 */
	public function get_script_data() {

				$captcha_provider = get_option('i13_captcha_provider', 'google');
		$i13_recapcha_checkout_action_v3 = get_option('i13_recapcha_checkout_action_v3');
		if ('google'==$captcha_provider) {
					
				$reCapcha_version = get_option('i13_recapcha_version');
				$use_v2_along_v3 = '';
			if ('' == $reCapcha_version) {
						$reCapcha_version = 'v2';
			}


			if ('v3' == strtolower($reCapcha_version)) {

							$use_v2_along_v3 = get_option('i13_recapcha_use_both_recaptcha');
				if ('yes' == $use_v2_along_v3) {

					if (1 == get_transient('i13_' . COOKIEHASH_I13 . 'block_checkout')) {

							$reCapcha_version = 'v2';
					}
				}
			}
		} else if ('turnstile'==$captcha_provider) {
					
				$reCapcha_version = get_option('i13_turnstile_version');
				$use_v2_along_v3 = '';
			if ('' == $reCapcha_version) {
						$reCapcha_version = 'v2';
			}


			if ('v3' == strtolower($reCapcha_version)) {

							$use_v2_along_v3 = get_option('i13_turnstile_use_both_recaptcha');
				if ('yes' == $use_v2_along_v3) {

					if (1 == get_transient('i13_' . COOKIEHASH_I13 . 'block_checkout')) {

							$reCapcha_version = 'v2';
					}
				}
			}
		}

		$recaptcha_img = plugin_dir_url(__FILE__) . 'assets/js/recaptcha-block/img/recaptcha.png';
		$turnstile_img = plugin_dir_url(__FILE__) . 'assets/js/recaptcha-block/img/turnstile.png';
		$i13_recapcha_domain = get_option('i13_recapcha_domain');
		if ('google'==$captcha_provider) {
					
			$i13_recapcha_v2_lang = get_option('i13_recapcha_v2_lang');
		} else if ('turnstile'==$captcha_provider) {
					 
			$i13_recapcha_v2_lang = get_option('i13_turnstile_v2_lang');
		}
		$disable_submit_btn = get_option('i13_recapcha_disable_submitbtn_guestcheckout');
		$disable_submit_btn_login_checkout = get_option('i13_recapcha_disable_submitbtn_logincheckout');
		$i13_recapcha_hide_label_checkout = get_option('i13_recapcha_hide_label_checkout');
		$captcha_lable = get_option('i13_recapcha_guestcheckout_title');
		$captcha_lable_ = get_option('i13_recapcha_guestcheckout_title');
		$refresh_lable = get_option('i13_recapcha_guestcheckout_refresh');
		if ('' == esc_html($refresh_lable)) {

			$refresh_lable = __('Refresh Captcha', 'recaptcha-for-woocommerce');
		}
				
		if ('google'==$captcha_provider) {
			$site_key_v2 = get_option('wc_settings_tab_recapcha_site_key');
			$site_key_v3 = get_option('wc_settings_tab_recapcha_site_key_v3');
		} else if ('turnstile'==$captcha_provider) {
					
			 $site_key_v2 = get_option('wc_settings_tab_turnstile_site_key');
			$site_key_v3 = get_option('wc_settings_tab_turnstile_site_key_v3');
		}
				
		$theme = get_option('i13_recapcha_guestcheckout_theme');
		$size = get_option('i13_recapcha_guestcheckout_size');
		$is_enabled = get_option('i13_recapcha_enable_on_guestcheckout');
		$is_enabled_logincheckout = get_option('i13_recapcha_enable_on_logincheckout');
		$i13_recapcha_guest_recpacha_refersh_on_error = get_option('i13_recapcha_guest_recpacha_refersh_on_error');
		$i13_recapcha_login_recpacha_refersh_on_error = get_option('i13_recapcha_login_recpacha_refersh_on_error');

		if ('google'==$captcha_provider) {
					
			$recapcha_error_msg_captcha_blank = get_option('wc_settings_tab_recapcha_error_msg_captcha_blank');
			if ('' == trim($captcha_lable_)) {

					$captcha_lable_ = 'recaptcha';
			}
			$recapcha_error_msg_captcha_blank = str_replace('[recaptcha]', ucfirst($captcha_lable_), $recapcha_error_msg_captcha_blank);

			$recapcha_error_msg_captcha_invalid_v3 = get_option('i13_recapcha_error_msg_v3_invalid_captcha');
			$recapcha_error_msg_captcha_invalid_v3 = str_replace('[recaptcha]', ucfirst($captcha_lable_), $recapcha_error_msg_captcha_invalid_v3);

			$recapcha_error_msg_captcha_invalid_v2 = get_option('wc_settings_tab_recapcha_error_msg_captcha_invalid');
			$recapcha_error_msg_captcha_invalid_v2 = str_replace('[recaptcha]', ucfirst($captcha_lable_), $recapcha_error_msg_captcha_invalid_v2);

		} else if ('turnstile'==$captcha_provider) {
					
				$recapcha_error_msg_captcha_blank = get_option('wc_settings_tab_turnstile_error_msg_captcha_blank');
			if ('' == trim($captcha_lable_)) {

						$captcha_lable_ = 'captcha';
			}
				$recapcha_error_msg_captcha_blank = str_replace('[captcha]', ucfirst($captcha_lable_), $recapcha_error_msg_captcha_blank);

				$recapcha_error_msg_captcha_invalid_v3 = get_option('i13_turnstile_error_msg_v3_invalid_captcha');
				$recapcha_error_msg_captcha_invalid_v3 = str_replace('[captcha]', ucfirst($captcha_lable_), $recapcha_error_msg_captcha_invalid_v3);

				$recapcha_error_msg_captcha_invalid_v2 = get_option('wc_settings_tab_turnstile_error_msg_captcha_invalid');
				$recapcha_error_msg_captcha_invalid_v2 = str_replace('[captcha]', ucfirst($captcha_lable_), $recapcha_error_msg_captcha_invalid_v2);

					
		}
		$is_user_login = is_user_logged_in();

		$i13_recapcha_checkout_action_v3 = get_option('i13_recapcha_checkout_action_v3');
		$i13_recapcha_wp_disable_to_woo_checkout = get_option('i13_recapcha_wp_disable_submit_token_generation_v3_woo_checkout');

		if ('' == $i13_recapcha_checkout_action_v3) {

			$i13_recapcha_checkout_action_v3 = 'checkout';
		}

		if ('' == $i13_recapcha_wp_disable_to_woo_checkout) {

			$i13_recapcha_wp_disable_to_woo_checkout = 'no';
		}


		$data = array(
			'captcha_provider' => $captcha_provider,
			'reCapchaVersion' => $reCapcha_version,
			'disable_submit_btn' => ( 'yes' == $disable_submit_btn ) ? 1 : 0,
			'disable_submit_btn_login_checkout' => ( 'yes' == $disable_submit_btn_login_checkout ) ? 1 : 0,
			'i13_recapcha_hide_label_checkout' => ( 'yes' == $i13_recapcha_hide_label_checkout ) ? 1 : 0,
			'captcha_lable' => $captcha_lable,
			'refresh_lable' => $refresh_lable,
			'site_key_v2' => $site_key_v2,
			'site_key_v3' => $site_key_v3,
			'theme' => $theme,
			'size' => $size,
			'is_enabled_guest' => ( 'yes' == $is_enabled ) ? 1 : 0,
			'is_enabled_logincheckout' => ( 'yes' == $is_enabled_logincheckout ) ? 1 : 0,
			'i13_recapcha_guest_recpacha_refersh_on_error' => ( 'yes' == $i13_recapcha_guest_recpacha_refersh_on_error ) ? 1 : 0,
			'i13_recapcha_login_recpacha_refersh_on_error' => ( 'yes' == $i13_recapcha_login_recpacha_refersh_on_error ) ? 1 : 0,
			'recapcha_error_msg_captcha_blank' => $recapcha_error_msg_captcha_blank,
			'recapcha_error_msg_captcha_invalid_v2' => $recapcha_error_msg_captcha_invalid_v2,
			'recapcha_error_msg_captcha_invalid_v3' => $recapcha_error_msg_captcha_invalid_v3,
			'is_user_login' => ( 'yes' == $is_user_login ) ? 1 : 0,
			'i13_recapcha_checkout_action_v3' => $i13_recapcha_checkout_action_v3,
			'i13_recapcha_wp_disable_to_woo_checkout' => ( 'yes' == $i13_recapcha_wp_disable_to_woo_checkout ) ? 1 : 0,
			'i13_recapcha_v2_lang' => $i13_recapcha_v2_lang,
			'i13_recapcha_domain' => ( 'yes' == $i13_recapcha_domain ) ? 1 : 0,
			'i13_checkout_nonce' => esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block')),
			'recaptcha_url' => $recaptcha_img,
			'turnstile_img' => $turnstile_img,
			'use_v2_along_v3' => ( 'yes' == $use_v2_along_v3 ) ? 1 : 0,
			'cookiehash_i13' => COOKIEHASH_I13,
			'i13_is_enterprise_captcha' => ( defined( 'I13_IS_ENTERPRISE_CAPTCHA' ) )?I13_IS_ENTERPRISE_CAPTCHA:'',
			'i13_grecaptcha_instance' => ( defined( 'I13_GRECAPTCHA_INSTANCE' ) )?I13_GRECAPTCHA_INSTANCE:'',
			'i13_use_api' => ( defined( 'I13_USE_API' ) )?I13_USE_API:'',
			'ajaxurl' => admin_url('admin-ajax.php'),
			'nonce' => wp_create_nonce('save_recaptcha_tokenv2_nonce'),
			'noncev3' => wp_create_nonce('save_recaptcha_token_nonce'),
			'nonce_ppc' => wp_create_nonce('i13-woocommerce-process_checkout-block')
		);
				
		return $data;
	}

	/**
	 * Register blocks.
	 */
	public function register_editor_blocks() {
		register_block_type(dirname(__FILE__) . '/assets/js/recaptcha-block', array(
			'editor_script' => 'i13-recaptcha-checkout-block-editor',
		));
	}

	/**
	 * This allows dynamic (JS) blocks to access attributes in the frontend.
	 *
	 * @param string[] $allowed_blocks
	 */
	public function add_attributes_to_frontend_blocks($allowed_blocks) {
		//$allowed_blocks[] = 'woocommerce/checkout-newsletter-subscription';
		$allowed_blocks[] = 'i13websolution/i13-recaptcha-checkout-block';
		return $allowed_blocks;
	}

	/**
	 * Add schema Store API to support posted data.
	 */
	public function extend_store_api() {
		$extend = StoreApi::container()->get(
				ExtendSchema::class
		);

		$extend->register_endpoint_data(
				array(
					'endpoint' => CheckoutSchema::IDENTIFIER,
					'namespace' => $this->get_name(),
					'schema_callback' => function () {

						return array(
					'optin' => array(
						'description' => __('Check recaptcha value.', 'recaptcha-for-woocommerce'),
						'type' => 'boolean',
						'context' => array(),
						'arg_options' => array(
							'validate_callback' => function ($value) {

																$captcha_provider = get_option('i13_captcha_provider', 'google');
								if ('google'==$captcha_provider) {
									return $this->i13_checkout_check_captcha($value);
								} else if ('turnstile'==$captcha_provider) {
																	
									return $this->i13_checkout_check_turnstile_captcha($value);
								}
							},
						),
					),
						);
					},
				)
		);
	}

	public function i13_modify_nonce_user_logged_out_defaults($uid, $action) {

		if ('i13-woocommerce-process_checkout-block' == esc_html($action)) {

			return 0;
		}
		return $uid;
	}

	// add the filter


	public function i13_checkout_check_captcha($value) {
				
		$flg_fallback=false;
		$rawData = file_get_contents('php://input');
		$arrdata = json_decode($rawData, true);

		$cookiehash_i13 = uniqid();
		if (defined('COOKIEHASH')) {

			$cookiehash_i13 = COOKIEHASH;
		}

		$reCapcha_version = get_option('i13_recapcha_version');
		if ('' == $reCapcha_version) {
			$reCapcha_version = 'v2';
		}

		//check already created order
		$is_woo_pay = false;
		if (isset($arrdata['payment_data']) && is_array($arrdata['payment_data'])) {


			foreach ($arrdata['payment_data'] as $val_) {

				if (is_array($val_) && isset($val_['key']) && isset($val_['value'])) {


					if (false !== stripos($val_['key'], 'is-woopay-preflight-check') && '' != trim($val_['value'])) {

						$is_woo_pay = true;
						break;
					} else if (false !== stripos($val_['key'], 'is_woopay') && '' != trim($val_['value'])) {

						$is_woo_pay = true;
						break;
					}
				}
			}
			if ($is_woo_pay) {

				$cookiehash_i13 = uniqid();
				if (defined('COOKIEHASH')) {

					$cookiehash_i13 = COOKIEHASH;
				}
				$session_key = WC()->session ? WC()->session->get_customer_id() : $cookiehash_i13;
				$transient_key = 'woopay_recaptcha_v2_' . md5($session_key);
				$i13_checkout_token_ = get_transient($transient_key); // expires in 2 min
				if (false !== $i13_checkout_token_) {
					$arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'] = $cookiehash_i13;
					$arrdata['extensions']['i13-recaptcha-checkout-block']['g-recaptcha-response-v2'] = $i13_checkout_token_;
				}
			}
		}
		$isv2_post = false;
		if (isset($arrdata['extensions']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']['g-recaptcha-response-v2'])) {

			$isv2_post = true;
		}
		$use_v2_along_v3 = get_option('i13_recapcha_use_both_recaptcha');
		if ('yes' == $use_v2_along_v3 && $isv2_post) {

			$reCapcha_version = 'v2';
			$flg_fallback=true;
		}

		$i13_recapcha_v2_timeout = get_option('i13_recapcha_v2_timeout');
		if ('' == $i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout = 600;
		} else {

			$i13_recapcha_v2_timeout = $i13_recapcha_v2_timeout * 60;
		}

		if ('v2' == strtolower($reCapcha_version)) {


			$i13_recaptcha_v3_login_recpacha_for_req_btn = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn');
			$captcha_lable = get_option('i13_recapcha_guestcheckout_title');
			if ('' == trim($captcha_lable)) {

				$captcha_lable = 'recaptcha';
			}
			if ('' == $i13_recaptcha_v3_login_recpacha_for_req_btn) {
				$i13_recaptcha_v3_login_recpacha_for_req_btn = 'no';
			}
			$recapcha_error_msg_captcha_blank = get_option('wc_settings_tab_recapcha_error_msg_captcha_blank');
			$recapcha_error_msg_captcha_no_response = get_option('wc_settings_tab_recapcha_error_msg_captcha_no_response');
			$recapcha_error_msg_captcha_invalid = get_option('wc_settings_tab_recapcha_error_msg_captcha_invalid');
			$i13_recapcha_checkout_timeout = get_option('i13_recapcha_checkout_timeout');
			if (null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout) {

				$i13_recapcha_checkout_timeout = 3;
			}
			if (0 == $i13_recapcha_checkout_timeout) {
				$i13_recapcha_checkout_timeout = 0.5;
			}
			$secret_key = get_option('wc_settings_tab_recapcha_secret_key');
			$is_enabled = get_option('i13_recapcha_enable_on_guestcheckout');
			$i13_recapcha_enable_on_logincheckout = get_option('i13_recapcha_enable_on_logincheckout');

			$recapcha_error_msg_captcha_blank = str_replace('[recaptcha]', ucfirst($captcha_lable), $recapcha_error_msg_captcha_blank);
			$recapcha_error_msg_captcha_no_response = str_replace('[recaptcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response);
			$recapcha_error_msg_captcha_invalid = str_replace('[recaptcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid);

			$nonce_value = ( isset($arrdata['extensions'], $arrdata['extensions']['i13-recaptcha-checkout-block']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']['woo-checkout-nonce']) ) ? $arrdata['extensions']['i13-recaptcha-checkout-block']['woo-checkout-nonce'] : '';
			/* if (! wp_verify_nonce( $nonce_value, 'i13-woocommerce-process_checkout-block' ) ) {


			  return new \WP_Error( 'api-error', __('Could not verify request.', 'recaptcha-for-woocommerce'));

			  } */

			if ('' == $nonce_value) {

				$nonce_value = esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block'));
			}

			

			if (( ( $is_enabled && !is_user_logged_in() ) || ( $i13_recapcha_enable_on_logincheckout && is_user_logged_in() ) ) && isset($arrdata['payment_method']) && !$this->i13_is_payment_request_btn($arrdata, 'v2', $flg_fallback)) {



				if ('yes' == get_transient($nonce_value)) {
					
					return true;
				}



				if (isset($arrdata['extensions']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']['g-recaptcha-response-v2'])) {



					if (isset($arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13']) && !empty($arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'])) {

						$cookiehash_i13 = $arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'];
					}
					// Google reCAPTCHA API secret key 
					$response = sanitize_text_field($arrdata['extensions']['i13-recaptcha-checkout-block']['g-recaptcha-response-v2']);

					if (!I13_IS_ENTERPRISE_CAPTCHA) {


						// Verify the reCAPTCHA response 
						$verifyResponse = wp_remote_get('https://www.' . esc_html(sanitize_text_field($this->i13_get_recaptcha_domain())) . '/recaptcha/api/siteverify?secret=' . $secret_key . '&response=' . $response, array('timeout' => 30));

						if (is_array($verifyResponse) && !is_wp_error($verifyResponse) && isset($verifyResponse['body'])) {

							// Decode json data 
							$responseData = json_decode($verifyResponse['body']);

							// If reCAPTCHA response is valid 
							if (!$responseData->success) {


								if ('' == trim($recapcha_error_msg_captcha_invalid)) {


									return new \WP_Error('api-error', __('Invalid recaptcha.', 'recaptcha-for-woocommerce'));
								} else {


									return new \WP_Error('api-error', __($recapcha_error_msg_captcha_invalid, 'recaptcha-for-woocommerce'));
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

								return new \WP_Error('api-error', __('Could not get response from reCAPTCHA server.', 'recaptcha-for-woocommerce'));
							} else {

								return new \WP_Error('api-error', $recapcha_error_msg_captcha_no_response);
							}
						}
					} else {

						$site_key = get_option('wc_settings_tab_recapcha_site_key');
						$api_key = get_option('i13_recapcha_google_cloud_api_key');
						$project_id = get_option('i13_recapcha_google_cloud_project_id');

						$data = array('event' => array('token' => $response, 'siteKey' => $site_key));

						$url = I13_GRECAPTCHA_URL . $project_id . '/assessments?key=' . $api_key;

						$verifyResponse = wp_remote_post($url, [
							'timeout' => 60,
							'data_format' => 'body',
							'headers' => [
								'Accept' => 'application/json',
								'Content-Type' => 'application/json',
								'Referer' => I13_DOMAIN_REFERER
							],
							'body' => json_encode($data),
						]);

						if (is_array($verifyResponse) && !is_wp_error($verifyResponse) && isset($verifyResponse['body'])) {

							// Decode json data
							$responseData = json_decode($verifyResponse['body']);

							if (isset($responseData->tokenProperties) && isset($responseData->tokenProperties->valid) && $responseData->tokenProperties->valid) {

								delete_transient('i13_' . $cookiehash_i13 . 'block_checkout');
								delete_transient('i13_' . $cookiehash_i13 . '_woo_checkout');
								if (0 != $i13_recapcha_checkout_timeout) {

									set_transient($nonce_value, 'yes', ( $i13_recapcha_checkout_timeout * 60 ));
								}
							} else {


								if ('' == trim($recapcha_error_msg_captcha_invalid)) {


									return new \WP_Error('api-error', __('Invalid recaptcha.', 'recaptcha-for-woocommerce'));
								} else {


									return new \WP_Error('api-error', __($recapcha_error_msg_captcha_invalid, 'recaptcha-for-woocommerce'));
								}
							}
						} else {

							if ('' == trim($recapcha_error_msg_captcha_no_response)) {

								return new \WP_Error('api-error', __('Could not get response from reCAPTCHA server.', 'recaptcha-for-woocommerce'));
							} else {

								return new \WP_Error('api-error', $recapcha_error_msg_captcha_no_response);
							}
						}
					}
				} else {




					if ('' == trim($recapcha_error_msg_captcha_blank)) {


						return new \WP_Error('api-error', __('Recaptcha is a required field.', 'recaptcha-for-woocommerce'));
					} else {

						return new \WP_Error('api-error', $recapcha_error_msg_captcha_blank);
					}
				}
			}
			
		} else {


						
			$i13_recapcha_checkout_score_threshold_v3 = get_option('i13_recapcha_checkout_score_threshold_v3');
			if ('' == $i13_recapcha_checkout_score_threshold_v3) {

				$i13_recapcha_checkout_score_threshold_v3 = '0.5';
			}
			$i13_recapcha_checkout_action_v3 = get_option('i13_recapcha_checkout_action_v3');
			if ('' == $i13_recapcha_checkout_action_v3) {

				$i13_recapcha_checkout_action_v3 = 'checkout';
			}

			$recapcha_error_msg_captcha_blank = get_option('i13_recapcha_error_msg_captcha_blank_v3');
			$recapcha_error_msg_captcha_no_response = get_option('i13_recapcha_error_msg_captcha_no_response_v3');
			$recapcha_error_msg_captcha_invalid = get_option('i13_recapcha_error_msg_v3_invalid_captcha');
			$secret_key = get_option('wc_settings_tab_recapcha_secret_key_v3');
			$is_enabled = get_option('i13_recapcha_enable_on_guestcheckout');
			$i13_recapcha_enable_on_logincheckout = get_option('i13_recapcha_enable_on_logincheckout');

			$i13_recapcha_checkout_timeout = get_option('i13_recapcha_checkout_timeout');
			if (null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout) {

				$i13_recapcha_checkout_timeout = 3;
			}
			if (0 == $i13_recapcha_checkout_timeout) {
				$i13_recapcha_checkout_timeout = 0.5;
			}

			$nonce_value = ( isset($arrdata['extensions'], $arrdata['extensions']['i13-recaptcha-checkout-block']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']['woo-checkout-nonce']) ) ? $arrdata['extensions']['i13-recaptcha-checkout-block']['woo-checkout-nonce'] : '';

			/* if (! wp_verify_nonce( $nonce_value, 'i13-woocommerce-process_checkout-block' ) ) {


			  return new \WP_Error( 'api-error', __('Could not verify request.', 'recaptcha-for-woocommerce'));

			  }
			 * 
			 */

			if ('' == $nonce_value) {

				$nonce_value = esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block'));
			}



			if ($is_woo_pay) {

				$cookiehash_i13 = uniqid();
				if (defined('COOKIEHASH')) {

					$cookiehash_i13 = COOKIEHASH;
				}

				$session_key = WC()->session ? WC()->session->get_customer_id() : $cookiehash_i13;
				$transient_key = 'woopay_recaptcha_v3_' . md5($session_key);
				$transient_key_cookie_hash = 'woopay_cookiehash_i13_' . md5($session_key);
				$cookiehash_i13 = get_transient($transient_key_cookie_hash); // expires in 2 min
				$i13_checkout_token_ = get_transient($transient_key); // expires in 2 min

				$arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'] = $cookiehash_i13;
				$arrdata['extensions']['i13-recaptcha-checkout-block']['i13_checkout_token_'] = $i13_checkout_token_;
			}


			if (( ( $is_enabled && !is_user_logged_in() ) || ( $i13_recapcha_enable_on_logincheckout && is_user_logged_in() ) ) && isset($arrdata['payment_method']) && !$this->i13_is_payment_request_btn($arrdata, 'v3', $flg_fallback)) {


				if ('yes' == get_transient($nonce_value)) {

					return true;
				}



				if (isset($arrdata['extensions']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']['i13_checkout_token_'])) {


					if (isset($arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13']) && !empty($arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'])) {

						$cookiehash_i13 = $arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'];
					}
					// Google reCAPTCHA API secret key 
					$response = sanitize_text_field($arrdata['extensions']['i13-recaptcha-checkout-block']['i13_checkout_token_']);

					if (!I13_IS_ENTERPRISE_CAPTCHA) {

						// Verify the reCAPTCHA response 
						$verifyResponse = wp_remote_post(
								'https://www.' . esc_html(sanitize_text_field($this->i13_get_recaptcha_domain())) . '/recaptcha/api/siteverify',
								array(
									'method' => 'POST',
									'timeout' => 60,
									'body' => array(
										'secret' => $secret_key,
										'response' => $response
									)
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


									return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . __('Google reCAPTCHA verification failed, please try again later.', 'recaptcha-for-woocommerce'));
								} else {

									return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid);
								}
							} else {



								if ($responseData->score < $i13_recapcha_checkout_score_threshold_v3 || $responseData->action != $i13_recapcha_checkout_action_v3) {

									if ('yes' == $use_v2_along_v3) {
										set_transient('i13_' . $cookiehash_i13 . 'block_checkout', '1', $i13_recapcha_v2_timeout);
									}
									if ('' == trim($recapcha_error_msg_captcha_invalid)) {

										return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . __('Google reCAPTCHA verification failed, please try again later.', 'recaptcha-for-woocommerce'));
									} else {

										return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid);
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

								return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . __('Could not get response from reCAPTCHA server.', 'recaptcha-for-woocommerce'));
							} else {


								return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_no_response);
							}
						}
					} else {

						$site_key = get_option('wc_settings_tab_recapcha_site_key_v3');
						$api_key = get_option('i13_recapcha_google_cloud_api_key_v3');
						$project_id = get_option('i13_recapcha_google_cloud_project_id_v3');

						$data = array('event' => array('token' => $response, 'siteKey' => $site_key, 'expectedAction' => $i13_recapcha_checkout_action_v3));

						$url = I13_GRECAPTCHA_URL . $project_id . '/assessments?key=' . $api_key;

						$verifyResponse = wp_remote_post($url, [
							'timeout' => 60,
							'data_format' => 'body',
							'headers' => [
								'Accept' => 'application/json',
								'Content-Type' => 'application/json',
								'Referer' => I13_DOMAIN_REFERER
							],
							'body' => json_encode($data),
						]);

						if (is_array($verifyResponse) && !is_wp_error($verifyResponse) && isset($verifyResponse['body'])) {



							$responseData = json_decode($verifyResponse['body']);

							if (isset($responseData->tokenProperties) && isset($responseData->tokenProperties->valid) && $responseData->tokenProperties->valid) {


								if (( $responseData->riskAnalysis->score < $i13_recapcha_checkout_score_threshold_v3 ) || ( $responseData->tokenProperties->action != $i13_recapcha_checkout_action_v3 )) {


									if ('yes' == $use_v2_along_v3) {
										set_transient('i13_' . $cookiehash_i13 . 'block_checkout', '1', $i13_recapcha_v2_timeout);
									}
									if ('' == trim($recapcha_error_msg_captcha_invalid)) {

										return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . __('Google reCAPTCHA verification failed, please try again later.', 'recaptcha-for-woocommerce'));
									} else {

										return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid);
									}
								} else {

									if (0 != $i13_recapcha_checkout_timeout) {

										set_transient($nonce_value, 'yes', ( $i13_recapcha_checkout_timeout * 60 ));
									}
								}
							} else {


								if ('yes' == $use_v2_along_v3) {
									set_transient('i13_' . $cookiehash_i13 . 'block_checkout', '1', $i13_recapcha_v2_timeout);
								}
								if ('' == trim($recapcha_error_msg_captcha_invalid)) {


									return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . __('Google reCAPTCHA verification failed, please try again later.', 'recaptcha-for-woocommerce'));
								} else {

									return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid);
								}
							}
						} else {

							if ('yes' == $use_v2_along_v3) {
								set_transient('i13_' . $cookiehash_i13 . 'block_checkout', '1', $i13_recapcha_v2_timeout);
							}
							if ('' == trim($recapcha_error_msg_captcha_no_response)) {

								return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . __('Could not get response from reCAPTCHA server.', 'recaptcha-for-woocommerce'));
							} else {


								return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_no_response);
							}
						}
					}
				} else {

					if ('yes' == $use_v2_along_v3) {
						set_transient('i13_' . $cookiehash_i13 . 'block_checkout', '1', $i13_recapcha_v2_timeout);
					}
					if ('' == trim($recapcha_error_msg_captcha_blank)) {


						return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . __('Google reCAPTCHA token is missing.', 'recaptcha-for-woocommerce'));
					} else {

						return new \WP_Error('api-error', '<span id="g-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_blank);
					}
				}
			}
		}


		return true;
	}
		
		
		
	public function i13_checkout_check_turnstile_captcha($value) {
				
		$flg_fallback=false;
		$rawData = file_get_contents('php://input');
		$arrdata = json_decode($rawData, true);

		$cookiehash_i13 = uniqid();
		if (defined('COOKIEHASH')) {

			$cookiehash_i13 = COOKIEHASH;
		}

		$reCapcha_version = get_option('i13_turnstile_version');
		if ('' == $reCapcha_version) {
			$reCapcha_version = 'v2';
		}

		//check already created order
		$is_woo_pay = false;
		if (isset($arrdata['payment_data']) && is_array($arrdata['payment_data'])) {


			foreach ($arrdata['payment_data'] as $val_) {

				if (is_array($val_) && isset($val_['key']) && isset($val_['value'])) {


					if (false !== stripos($val_['key'], 'is-woopay-preflight-check') && '' != trim($val_['value'])) {

						$is_woo_pay = true;
						break;
					} else if (false !== stripos($val_['key'], 'is_woopay') && '' != trim($val_['value'])) {

						$is_woo_pay = true;
						break;
					}
				}
			}
			if ($is_woo_pay) {

				$cookiehash_i13 = uniqid();
				if (defined('COOKIEHASH')) {

					$cookiehash_i13 = COOKIEHASH;
				}
				$session_key = WC()->session ? WC()->session->get_customer_id() : $cookiehash_i13;
				$transient_key = 'woopay_recaptcha_v2_' . md5($session_key);
				$i13_checkout_token_ = get_transient($transient_key); // expires in 2 min
				if (false !== $i13_checkout_token_) {
					$arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'] = $cookiehash_i13;
					$arrdata['extensions']['i13-recaptcha-checkout-block']['cf-recaptcha-response-v2'] = $i13_checkout_token_;
				}
			}
		}
		$isv2_post = false;
		if (isset($arrdata['extensions']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']['cf-recaptcha-response-v2'])) {

			$isv2_post = true;
		}
		$use_v2_along_v3 = get_option('i13_turnstile_use_both_recaptcha');
		if ('yes' == $use_v2_along_v3 && $isv2_post) {

			$reCapcha_version = 'v2';
			$flg_fallback=true;
		}

		$i13_recapcha_v2_timeout = get_option('i13_turnstile_v2_timeout');
		if ('' == $i13_recapcha_v2_timeout) {
			$i13_recapcha_v2_timeout = 600;
		} else {

			$i13_recapcha_v2_timeout = $i13_recapcha_v2_timeout * 60;
		}

		if ('v2' == strtolower($reCapcha_version)) {


			$i13_recaptcha_v3_login_recpacha_for_req_btn = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn');
			$captcha_lable = get_option('i13_recapcha_guestcheckout_title');
			if ('' == trim($captcha_lable)) {

				$captcha_lable = 'captcha';
			}
			if ('' == $i13_recaptcha_v3_login_recpacha_for_req_btn) {
				$i13_recaptcha_v3_login_recpacha_for_req_btn = 'no';
			}
			$recapcha_error_msg_captcha_blank = get_option('wc_settings_tab_turnstile_error_msg_captcha_blank');
			$recapcha_error_msg_captcha_no_response = get_option('wc_settings_tab_turnstile_error_msg_captcha_no_response');
			$recapcha_error_msg_captcha_invalid = get_option('wc_settings_tab_turnstile_error_msg_captcha_invalid');
			$i13_recapcha_checkout_timeout = get_option('i13_recapcha_checkout_timeout');
			if (null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout) {

				$i13_recapcha_checkout_timeout = 3;
			}
			if (0 == $i13_recapcha_checkout_timeout) {
				$i13_recapcha_checkout_timeout = 0.5;
			}
			$secret_key = get_option('wc_settings_tab_turnstile_secret_key');
			$is_enabled = get_option('i13_recapcha_enable_on_guestcheckout');
			$i13_recapcha_enable_on_logincheckout = get_option('i13_recapcha_enable_on_logincheckout');

			$recapcha_error_msg_captcha_blank = str_replace('[captcha]', ucfirst($captcha_lable), $recapcha_error_msg_captcha_blank);
			$recapcha_error_msg_captcha_no_response = str_replace('[captcha]', $captcha_lable, $recapcha_error_msg_captcha_no_response);
			$recapcha_error_msg_captcha_invalid = str_replace('[captcha]', $captcha_lable, $recapcha_error_msg_captcha_invalid);

			$nonce_value = ( isset($arrdata['extensions'], $arrdata['extensions']['i13-recaptcha-checkout-block']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']['woo-checkout-nonce']) ) ? $arrdata['extensions']['i13-recaptcha-checkout-block']['woo-checkout-nonce'] : '';
			/* if (! wp_verify_nonce( $nonce_value, 'i13-woocommerce-process_checkout-block' ) ) {


			  return new \WP_Error( 'api-error', __('Could not verify request.', 'recaptcha-for-woocommerce'));

			  } */

			if ('' == $nonce_value) {

				$nonce_value = esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block'));
			}

			

			if (( ( $is_enabled && !is_user_logged_in() ) || ( $i13_recapcha_enable_on_logincheckout && is_user_logged_in() ) ) && isset($arrdata['payment_method']) && !$this->i13_is_payment_request_btn($arrdata, 'v2', $flg_fallback)) {



				if ('yes' == get_transient($nonce_value)) {
					
					return true;
				}



				if (isset($arrdata['extensions']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']['cf-recaptcha-response-v2'])) {



					if (isset($arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13']) && !empty($arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'])) {

						$cookiehash_i13 = $arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'];
					}
					// Google reCAPTCHA API secret key 
					$response = sanitize_text_field($arrdata['extensions']['i13-recaptcha-checkout-block']['cf-recaptcha-response-v2']);

					


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


								return new \WP_Error('api-error', __('Invalid captcha.', 'recaptcha-for-woocommerce'));
							} else {


								return new \WP_Error('api-error', __($recapcha_error_msg_captcha_invalid, 'recaptcha-for-woocommerce'));
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

							return new \WP_Error('api-error', __('Could not get response from turnstile server.', 'recaptcha-for-woocommerce'));
						} else {

							return new \WP_Error('api-error', $recapcha_error_msg_captcha_no_response);
						}
					}
					
				} else {




					if ('' == trim($recapcha_error_msg_captcha_blank)) {


						return new \WP_Error('api-error', __('Captcha is a required field.', 'recaptcha-for-woocommerce'));
					} else {

						return new \WP_Error('api-error', $recapcha_error_msg_captcha_blank);
					}
				}
			}
			
		} else {


						
			
			$i13_recapcha_checkout_action_v3 = get_option('i13_recapcha_checkout_action_v3');
			if ('' == $i13_recapcha_checkout_action_v3) {

				$i13_recapcha_checkout_action_v3 = 'checkout';
			}

			$recapcha_error_msg_captcha_blank = get_option('i13_turnstile_error_msg_captcha_blank_v3');
			$recapcha_error_msg_captcha_no_response = get_option('i13_turnstile_error_msg_captcha_no_response_v3');
			$recapcha_error_msg_captcha_invalid = get_option('i13_turnstile_error_msg_v3_invalid_captcha');
			$secret_key = get_option('wc_settings_tab_turnstile_secret_key_v3');
			$is_enabled = get_option('i13_recapcha_enable_on_guestcheckout');
			$i13_recapcha_enable_on_logincheckout = get_option('i13_recapcha_enable_on_logincheckout');

			$i13_recapcha_checkout_timeout = get_option('i13_recapcha_checkout_timeout');
			if (null == $i13_recapcha_checkout_timeout || '' == $i13_recapcha_checkout_timeout) {

				$i13_recapcha_checkout_timeout = 3;
			}
			if (0 == $i13_recapcha_checkout_timeout) {
				$i13_recapcha_checkout_timeout = 0.5;
			}

			$nonce_value = ( isset($arrdata['extensions'], $arrdata['extensions']['i13-recaptcha-checkout-block']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']['woo-checkout-nonce']) ) ? $arrdata['extensions']['i13-recaptcha-checkout-block']['woo-checkout-nonce'] : '';

			/* if (! wp_verify_nonce( $nonce_value, 'i13-woocommerce-process_checkout-block' ) ) {


			  return new \WP_Error( 'api-error', __('Could not verify request.', 'recaptcha-for-woocommerce'));

			  }
			 * 
			 */

			if ('' == $nonce_value) {

				$nonce_value = esc_html(wp_create_nonce('i13-woocommerce-process_checkout-block'));
			}



			if ($is_woo_pay) {

				$cookiehash_i13 = uniqid();
				if (defined('COOKIEHASH')) {

					$cookiehash_i13 = COOKIEHASH;
				}

				$session_key = WC()->session ? WC()->session->get_customer_id() : $cookiehash_i13;
				$transient_key = 'woopay_recaptcha_v3_' . md5($session_key);
				$transient_key_cookie_hash = 'woopay_cookiehash_i13_' . md5($session_key);
				$cookiehash_i13 = get_transient($transient_key_cookie_hash); // expires in 2 min
				$i13_checkout_token_ = get_transient($transient_key); // expires in 2 min

				$arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'] = $cookiehash_i13;
				$arrdata['extensions']['i13-recaptcha-checkout-block']['i13_checkout_token_v3_turnstile'] = $i13_checkout_token_;
			}


			if (( ( $is_enabled && !is_user_logged_in() ) || ( $i13_recapcha_enable_on_logincheckout && is_user_logged_in() ) ) && isset($arrdata['payment_method']) && !$this->i13_is_payment_request_btn($arrdata, 'v3', $flg_fallback)) {


				if ('yes' == get_transient($nonce_value)) {

					return true;
				}



				if (isset($arrdata['extensions']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']) && isset($arrdata['extensions']['i13-recaptcha-checkout-block']['i13_checkout_token_v3_turnstile'])) {


					if (isset($arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13']) && !empty($arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'])) {

						$cookiehash_i13 = $arrdata['extensions']['i13-recaptcha-checkout-block']['cookiehash_i13'];
					}
					// Google reCAPTCHA API secret key 
					$response = sanitize_text_field($arrdata['extensions']['i13-recaptcha-checkout-block']['i13_checkout_token_v3_turnstile']);

					

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


								return new \WP_Error('api-error', '<span id="cf-recaptcha_error_v3"></span>' . __('Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce'));
							} else {

								return new \WP_Error('api-error', '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid);
							}
						} else {



							if ($responseData->action != $i13_recapcha_checkout_action_v3) {

								if ('yes' == $use_v2_along_v3) {
									set_transient('i13_' . $cookiehash_i13 . 'block_checkout', '1', $i13_recapcha_v2_timeout);
								}
								if ('' == trim($recapcha_error_msg_captcha_invalid)) {

									return new \WP_Error('api-error', '<span id="cf-recaptcha_error_v3"></span>' . __('Captcha verification failed, please try again later.', 'recaptcha-for-woocommerce'));
								} else {

									return new \WP_Error('api-error', '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_invalid);
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

							return new \WP_Error('api-error', '<span id="cf-recaptcha_error_v3"></span>' . __('Could not get response from turnstile server.', 'recaptcha-for-woocommerce'));
						} else {


							return new \WP_Error('api-error', '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_no_response);
						}
					}
					
				} else {

					if ('yes' == $use_v2_along_v3) {
						set_transient('i13_' . $cookiehash_i13 . 'block_checkout', '1', $i13_recapcha_v2_timeout);
					}
					if ('' == trim($recapcha_error_msg_captcha_blank)) {


						return new \WP_Error('api-error', '<span id="cf-recaptcha_error_v3"></span>' . __('Turnstile token is missing.', 'recaptcha-for-woocommerce'));
					} else {

						return new \WP_Error('api-error', '<span id="cf-recaptcha_error_v3"></span>' . $recapcha_error_msg_captcha_blank);
					}
				}
			}
		}


		return true;
	}

	/**
	 * Get the file modified time as a cache buster if we're in dev mode.
	 *
	 * @param string $file Local path to the file.
	 * @return string The cache buster value to use for the given file.
	 */
	protected function get_file_version($file) {
		if (defined('SCRIPT_DEBUG') && SCRIPT_DEBUG && file_exists($file)) {
			return filemtime($file);
		}
		return RECAPTCHA_BLOCK_VERSION;
	}

	public function i13_get_recaptcha_domain() {

		$domain = 'google.com';
		$reCapcha_domain = get_option('i13_recapcha_domain');

		if ('yes' == $reCapcha_domain) {

			$domain = 'recaptcha.net';
		}

		return $domain;
	}

	public function i13_is_payment_request_btn($arrdata, $reCapVersion,$flg_fallback) {


 
	   
		if ('v2' == $reCapVersion) {

			$i13_recaptcha_login_recpacha_for_req_btn_cart_page = get_option('i13_recaptcha_login_recpacha_for_req_btn_cart_page');
			if ('' == $i13_recaptcha_login_recpacha_for_req_btn_cart_page) {
				$i13_recaptcha_login_recpacha_for_req_btn_cart_page = 'no';
			}

			$i13_recaptcha_login_recpacha_for_req_btn_product = get_option('i13_recaptcha_login_recpacha_for_req_btn');
			if ('' == $i13_recaptcha_login_recpacha_for_req_btn_product) {
				$i13_recaptcha_login_recpacha_for_req_btn_product = 'no';
			}

			if ('yes' == $i13_recaptcha_login_recpacha_for_req_btn_cart_page || 'yes' == $i13_recaptcha_login_recpacha_for_req_btn_product) {

				return false;
			} else {
				if ($flg_fallback) {
						
					$i13_recaptcha_login_recpacha_for_req_btn_cart_page = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page');
					if ('' == $i13_recaptcha_login_recpacha_for_req_btn_cart_page) {
						$i13_recaptcha_login_recpacha_for_req_btn_cart_page = 'no';
					}

					$i13_recaptcha_login_recpacha_for_req_btn_product = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn');
					if ('' == $i13_recaptcha_login_recpacha_for_req_btn_product) {
						$i13_recaptcha_login_recpacha_for_req_btn_product = 'no';
					}

					if ('yes' == $i13_recaptcha_login_recpacha_for_req_btn_cart_page || 'yes' == $i13_recaptcha_login_recpacha_for_req_btn_product) {

						return false;
					}
						
				}
				
			}
			
		} else {

			$i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page');
			if ('' == $i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page) {
				$i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page = 'no';
			}

			$i13_recaptcha_v3_login_recpacha_for_req_btn_product_page = get_option('i13_recaptcha_v3_login_recpacha_for_req_btn');
			if ('' == $i13_recaptcha_v3_login_recpacha_for_req_btn_product_page) {
				$i13_recaptcha_v3_login_recpacha_for_req_btn_product_page = 'no';
			}

			if ('yes' == $i13_recaptcha_v3_login_recpacha_for_req_btn_cart_page || 'yes' == $i13_recaptcha_v3_login_recpacha_for_req_btn_product_page) {

				return false;
			}
		}



		$is_pay_req_btn = false;
		if (isset($arrdata['payment_method'])) {

			if (stripos($arrdata['payment_method'], 'googlepay') !== false) {

				$is_pay_req_btn = true;
			} else if (stripos($arrdata['payment_method'], 'applepay') !== false) {

				$is_pay_req_btn = true;
			} else if (stripos($arrdata['payment_method'], 'wcpay') !== false) {

				$is_pay_req_btn = true;
			} else if (stripos($arrdata['payment_method'], 'paymentplugins_ppcp_express') !== false) {

				$is_pay_req_btn = true;
			}
		}

		return $is_pay_req_btn;
	}

	public function i13_save_recaptcha_token() {

		check_ajax_referer('save_recaptcha_token_nonce', 'nonce');

				 $captcha_provider = get_option('i13_captcha_provider', 'google');
		if ('google'==$captcha_provider) {
					
			$token = sanitize_text_field($_POST['i13_checkout_token_'] ?? '');
		} else if ('turnstile'==$captcha_provider) {

			$token = sanitize_text_field($_POST['i13_checkout_token_v3_turnstile'] ?? '');
		}
		
		$cookiehash_i13 = sanitize_text_field($_POST['cookiehash_i13'] ?? '');
		if (!empty($token)) {


			
			$session_key = WC()->session ? WC()->session->get_customer_id() : $cookiehash_i13;
			$transient_key = 'woopay_recaptcha_v3_' . md5($session_key);
			$transient_key_cookie_hash = 'woopay_cookiehash_i13_' . md5($session_key);
			set_transient($transient_key, $token, 2 * MINUTE_IN_SECONDS); // expires in 2 min
			set_transient($transient_key_cookie_hash, $cookiehash_i13, 2 * MINUTE_IN_SECONDS); // expires in 2 min

			wp_send_json_success('Token stored');
		} else {
			wp_send_json_error('No token');
		}
	}

	public function i13_save_recaptcha_tokenv2() {


		check_ajax_referer('save_recaptcha_tokenv2_nonce', 'nonce');

				
				$captcha_provider = get_option('i13_captcha_provider', 'google');
		if ('google'==$captcha_provider) {
					
			$token = sanitize_text_field($_POST['g-recaptcha-response-v2'] ?? '');
		} else if ('turnstile'==$captcha_provider) {

			$token = sanitize_text_field($_POST['cf-recaptcha-response-v2'] ?? '');
		}
				
		
		if (!empty($token)) {


			$cookiehash_i13 = uniqid();
			if (defined('COOKIEHASH')) {

				$cookiehash_i13 = COOKIEHASH;
			}

			
			$session_key = WC()->session ? WC()->session->get_customer_id() : $cookiehash_i13;
			$transient_key = 'woopay_recaptcha_v2_' . md5($session_key);
			set_transient($transient_key, $token, 2 * MINUTE_IN_SECONDS); // expires in 2 min

			wp_send_json_success('Token stored');
		} else {
			wp_send_json_error('No token');
		}
	}

	

	
   
	

}
