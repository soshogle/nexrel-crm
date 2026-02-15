<?php
/**
 * Load admin view for WooCommerce Checkout Form form.
 *
 * @package miniorange-otp-verification/handler/forms
 */

namespace OTP\Handler\Forms;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\FormSessionVars;
use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;
use OTP\Helper\MoFormDocs;
use OTP\Helper\MoPHPSessions;
use OTP\Helper\MoUtility;
use OTP\Helper\SessionUtils;
use OTP\Objects\BaseMessages;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Objects\VerificationType;
use OTP\Traits\Instance;
use OTP\Helper\Templates\DefaultPopup;
use ReflectionException;
use Automattic\WooCommerce\Blocks\WC_Blocks_Utils;
use WC_Checkout;
use WP_Error;

/**
 * This is the WooCommerce CheckOut form class. This class handles all the
 * functionality related to WooCommerce CheckOut form. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 *
 * @todo scripts needs to be better managed
 * @todo disable autologin after checkout needs to be better managed
 */
if ( ! class_exists( 'WooCommerceCheckOutForm' ) ) {
	/**
	 * WooCommerceCheckOutForm class
	 */
	class WooCommerceCheckOutForm extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Should OTP Verification be applied only
		 * for guest users
		 *
		 * @var bool
		 */
		private $guest_check_out_only;

		/**
		 * Should OTP Verification be applied only
		 * for guest users
		 *
		 * @var bool
		 */
		private $show_button;

		/**
		 * Should show a popUp for verifying the OTP
		 * sent instead of fields on the page
		 *
		 * @var boolean
		 */
		private $popup_enabled;

		/**
		 * The array of all the available payment
		 * options
		 *
		 * @var array
		 */
		private $payment_methods;

		/**
		 * Option to enable/disable OTP Verification based
		 * on payment type
		 *
		 * @var bool
		 */
		private $selective_payment;

		/**
		 * Option to enable/disable Auto Login After checkout
		 *
		 * @var bool
		 */
		private $disable_auto_login;

		/**
		 * The array of all the category on which otp is enabled
		 *
		 * @var array
		 */
		private $mo_special_category_list;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = true;
			$this->form_session_var        = FormSessionVars::WC_CHECKOUT;
			$this->type_phone_tag          = 'mo_wc_phone_enable';
			$this->type_email_tag          = 'mo_wc_email_enable';
			$this->phone_form_id           = 'input[name=billing_phone]';
			$this->form_key                = 'WC_CHECKOUT_FORM';
			$this->form_name               = 'WooCommerce Checkout Form';
			$this->is_form_enabled         = get_mo_option( 'wc_checkout_enable' );
			$this->button_text             = get_mo_option( 'wc_checkout_button_link_text' );
			$this->button_text             = ! MoUtility::is_blank( $this->button_text ) ? $this->button_text : '';
			$this->form_documents          = MoFormDocs::WC_CHECKOUT_LINK;
			parent::__construct();
		}

		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 *
		 * @throws ReflectionException .
		 */
		public function handle_form() {
			if ( ! function_exists( 'is_plugin_active' ) ) {
				include_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			if ( ! is_plugin_active( 'woocommerce/woocommerce.php' ) ) {
				return;
			}

			if ( mo_is_block_based_checkout() ) {
				return; // Block-based checkout logic.
			}

			// check for WooCommerce selected category addon.
			if ( file_exists( MOV_DIR . 'addons/wcselectedcategory' ) ) {
				add_action( 'woocommerce_checkout_before_customer_details', array( $this, 'webroom_check_if_product_category_in_cart' ) );
			}

			$this->disable_auto_login   = get_mo_option( 'wc_checkout_disable_auto_login' );
			$this->payment_methods      = maybe_unserialize( get_mo_option( 'wc_checkout_payment_type' ) );
			$this->popup_enabled        = get_mo_option( 'wc_checkout_popup' );
			$this->guest_check_out_only = get_mo_option( 'wc_checkout_guest' );
			$saved_button               = get_option( 'mo_customer_validation_wc_checkout_button' );
			if ( false === $saved_button ) {
				$this->show_button = true; // Default for new installs.
			} else {
				$this->show_button = ( '1' === $saved_button ); // Respect legacy setting.
			}
			if ( function_exists( 'WC' ) ) {
				$gateways = WC()->payment_gateways();

				if ( isset( $gateways, $gateways->payment_gateways ) ) {
					$this->payment_methods = $this->payment_methods ? $this->payment_methods : $gateways->payment_gateways();
				}
			}
			$this->otp_type            = get_mo_option( 'wc_checkout_type' );
			$this->selective_payment   = get_mo_option( 'wc_checkout_selective_payment' );
			$this->restrict_duplicates = get_mo_option( 'wc_checkout_restrict_duplicates' );

			if ( $this->popup_enabled ) {
				add_action( 'woocommerce_review_order_after_submit', array( $this, 'add_custom_button' ), 1, 1 );
				add_action( 'woocommerce_after_checkout_validation', array( $this, 'mo_checkout_validation' ), 99, 2 );
			} else {
				add_action( 'woocommerce_after_checkout_billing_form', array( $this, 'my_custom_checkout_field' ), 99 );
				add_action( 'woocommerce_after_checkout_validation', array( $this, 'my_custom_checkout_field_process' ), 99, 2 );
			}

			if ( $this->disable_auto_login ) {
				add_action( 'woocommerce_thankyou', array( $this, 'disable_auto_login_after_checkout' ), 1, 1 );
			}

			add_filter( 'woocommerce_checkout_posted_data', array( $this, 'billing_phone_process' ), 99, 1 );
			add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_script_on_page' ) );
			$this->routeData();
		}

		/**
		 * This function adds true in the session if the otp is enabled on
		 * the category of the product.
		 */
		public function webroom_check_if_product_category_in_cart() {
			MoPHPSessions::add_session_var( 'specialproductexist', 'false' );
			/**
				* Contains the list of all the product categories enabled.
				*
				*  @var array $mo_special_category_list */
			$this->mo_special_category_list = maybe_unserialize( get_mo_option( 'mo_wcsc_sms_wc_selected_category' ) );
			foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
				$category_id      = $cart_item['product_id'];
				$product_category = wp_get_post_terms( $category_id, 'product_cat' );
				$product_category = (array) $product_category;

				$term_names = wp_list_pluck( (array) $product_category, 'name' );
				foreach ( $term_names as $name ) {
					if ( in_array( $name, (array) $this->mo_special_category_list, true ) ) {
							MoPHPSessions::add_session_var( 'specialproductexist', 'true' );
							break;
					}
				}
			}
		}

		/**
		 * This function hooks too WooCommerce hook to edit posted Phone Number
		 * before saving in database. It saves phone number in general format.
		 *
		 * @param  array $data  contains posted data for order.
		 * @return array
		 */
		public function billing_phone_process( $data ) {
			if ( file_exists( MOV_DIR . 'addons/wcselectedcategory' ) && MoPHPSessions::get_session_var( 'specialproductexist' ) !== 'true' ) {
				return $data;
			}
			$data['billing_phone'] = MoUtility::process_phone_number( $data['billing_phone'] );
			return $data;
		}

		/**
		 * This function hooks into WooCommerce Thankyou hook to Logout users
		 * that are autoLogged in after checkout.
		 *
		 * @param  string $order Order number.
		 * @todo Figure out a better way to handle this.
		 */
		public function disable_auto_login_after_checkout( $order ) {
			MoPHPSessions::add_session_var( 'specialproductexist', 'false' );

			if ( is_user_logged_in() ) {
				wp_logout();
				// Validate redirect URL is internal; prevent open redirects.
				$redirect_url = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
				if ( ! $redirect_url || ! wp_validate_redirect( $redirect_url, home_url() ) ) {
					$redirect_url = home_url();
				}
				wp_safe_redirect( $redirect_url );
				exit();
			}
		}

		/**
		 * This function checks what kind of OTP Verification needs to be done
		 * and starts the otp verification process with appropriate parameters.
		 *
		 * @throws ReflectionException .
		 */
		private function routeData() {
			$option = MoUtility::get_current_page_parameter_value( 'option', '' );

			if ( empty( $option ) ) {
				return;
			}
			if ( strcasecmp( trim( $option ), 'miniorange-woocommerce-checkout' ) === 0 ) {
				$this->handle_woocommerce_checkout_form();
			}
			if ( strcasecmp( trim( $option ), 'miniorange_wc_otp_validation' ) === 0 ) {
				$this->process_wc_form_and_validate_otp();
			}
		}


		/**
		 * This functions checks if Verification was started and handles
		 * what needs to be done if verification process was not started
		 * and user is trying to submit the form.
		 *
		 * @throws ReflectionException .
		 */
		private function handle_woocommerce_checkout_form() {
			// Security: Use hardcoded nonce action 'form_nonce' instead of variable.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
				return;
			}
			$data       = MoUtility::mo_sanitize_array( $_POST );
			$user_email = isset( $data['user_email'] ) ? $data['user_email'] : '';
			$user_phone = isset( $data['user_phone'] ) ? $data['user_phone'] : '';
			$user_phone = MoUtility::process_phone_number( $user_phone );

			MoUtility::initialize_transaction( $this->form_session_var );
			if ( strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ) {
				$this->check_phone_validity( $data );
				SessionUtils::add_phone_verified( $this->form_session_var, $user_phone );
				$this->send_challenge(
					'test',
					$user_email,
					null,
					$user_phone,
					VerificationType::PHONE
				);
			} else {
				SessionUtils::add_email_verified( $this->form_session_var, $user_email );
				$this->send_challenge(
					'test',
					$user_email,
					null,
					$user_phone,
					VerificationType::EMAIL
				);
			}
		}


		/**
		 * Checks if the phone is valid and not a duplicate
		 * if admin has enabled the restrictDuplicate option
		 *
		 * @param array $get_data    $_GET data.
		 */
		private function check_phone_validity( $get_data ) {
			$phone = isset( $get_data['user_phone'] ) ? sanitize_text_field( $get_data['user_phone'] ) : '';
			if ( $phone && $this->restrict_duplicates && $this->is_phone_number_already_in_use( $phone ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::PHONE_EXISTS ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}


		/**
		 * Checks if the Phone number is already associated with any other account.
		 *
		 * @param string $phone Phone number in the checkout form.
		 * @return boolean
		 */
		private function is_phone_number_already_in_use( $phone ) {
			$phone = MoUtility::process_phone_number( $phone );
			$key   = 'billing_phone';

			// Create cache key based on phone number and meta key.
			$cache_key   = 'mo_wc_phone_in_use_' . md5( $phone . '_' . $key );
			$cache_group = 'mo_wc_checkout';

			// Try to get from cache first.
			$cached_result = wp_cache_get( $cache_key, $cache_group );
			if ( false !== $cached_result ) {
				return (bool) $cached_result;
			}

			// Query database if not in cache.
			$args = array(
				'meta_query' => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Necessary to check for duplicate phone numbers. Caching implemented above.
					array(
						'key'     => $key,
						'value'   => $phone,
						'compare' => '=',
					),
				),
				'number'     => 1,
				'fields'     => 'ID',
			);

			$users = get_users( $args );

			// Check if any users were found.
			$is_in_use = ! empty( $users );

			// Store in cache for 15 minutes (900 seconds).
			wp_cache_set( $cache_key, $is_in_use, $cache_group, 900 );
			return $is_in_use;
		}


		/**
		 * This function checks if verification codes was entered in the form
		 * by the user and handles what needs to be done if verification code
		 * was not entered by the user.
		 */
		private function check_if_verification_not_started() {

			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				if ( function_exists( 'wc_add_notice' ) ) {
					wc_add_notice( MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE ), MoConstants::ERROR_JSON_TYPE );
				}
				return true;
			}
			return false;
		}


		/**
		 * Checks if the verification code was not entered by the user.
		 * If no verification code was entered then throw an error to the user.
		 *
		 * @param array $data Posted checkout data.
		 */
		private function check_if_verification_code_not_entered( $data ) {
			if ( array_key_exists( 'order_verify', $data ) && ! MoUtility::is_blank( $data['order_verify'] ) ) {
				return false;
			}

			if ( function_exists( 'wc_add_notice' ) ) {

				if ( strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ) {
					wc_add_notice(
						MoMessages::showMessage( MoMessages::ENTER_PHONE_CODE ),
						MoConstants::ERROR_JSON_TYPE
					);
				} else {
					wc_add_notice(
						MoMessages::showMessage( MoMessages::ENTER_EMAIL_CODE ),
						MoConstants::ERROR_JSON_TYPE
					);
				}
			}
			return true;
		}


		/**
		 * Adds the popup HTML and scripts on the checkout page for OTP Verification.
		 *
		 * @param string $order_id order id passed by the hook.
		 * @todo Make the script here more readable.
		 */
		public function add_custom_button( $order_id ) {
			if ( file_exists( MOV_DIR . 'addons/wcselectedcategory' ) && MoPHPSessions::get_session_var( 'specialproductexist' ) !== 'true' ) {
				return;
			}
			if ( $this->guest_check_out_only && is_user_logged_in() ) {
				return;
			}
			$this->show_validation_button_or_text( 'miniorange_wc_popup_send_otp_token' );
		}

		/**
		 * Show validation button or text on the checkout form based on the settings
		 * done by the Admin.
		 *
		 * @param object $checkout checkout check the value.
		 */
		public function my_custom_checkout_field( $checkout ) {
			if ( file_exists( MOV_DIR . 'addons/wcselectedcategory' ) && MoPHPSessions::get_session_var( 'specialproductexist' ) !== 'true' ) {
				return;
			}
			if ( $this->guest_check_out_only && is_user_logged_in() ) {
				return;
			}
			echo '<div id="mo_validation_wrapper">';
			$this->show_validation_button_or_text( 'miniorange_otp_token_submit' );

			echo '<div id="mo_message" style="display:none;"></div>';

			if ( function_exists( 'woocommerce_form_field' ) ) {
				woocommerce_form_field(
					'order_verify',
					array(
						'type'        => 'text',
						'class'       => array( 'form-row-wide' ),
						'label'       => __( 'Verify Code', 'miniorange-otp-verification' ),
						'required'    => true,
						'placeholder' => __( 'Enter Verification Code', 'miniorange-otp-verification' ),
					),
					$checkout->get_value( 'order_verify' )
				);
			}
			echo '</div>';
		}


		/**
		 * Show Text link on the checkout form which user can click to start the
		 * OTP Verification process.
		 *
		 *  @param string $button_id ID of the button.
		 */
		private function show_validation_button_or_text( $button_id ) {
			if ( $this->show_button ) {
				$this->mo_showButtonOnPage( $button_id );
			} else {
				$this->showTextLinkOnPage( $button_id );
			}
		}

		/**
		 * Show Text link on the checkout form which user can click to start the
		 * OTP Verification process.
		 *
		 * @param string $button_id ID of the button.
		 */
		private function showTextLinkOnPage( $button_id ) {
			if ( strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ) {
				echo '<div style = "margin-bottom: 15px;" title="' . esc_attr( __( 'Please Enter a Phone Number to enable this link', 'miniorange-otp-verification' ) ) . '">
						<a  href="#" style="text-align:center;color:grey;pointer-events:initial;display:none;" 
							id="' . esc_attr( $button_id ) . '" 
							class="" >' . esc_html( $this->button_text ) . '
						</a>
				   </div>';
			} else {
					echo '<div style = "margin-bottom: 15px;" title="' . esc_attr( __( 'Please Enter an Email Address to enable this link', 'miniorange-otp-verification' ) ) . '">
						<a  href="#" 
							style="text-align:center;color:grey;pointer-events:initial;display:none;" 
							id="' . esc_attr( $button_id ) . '" 
							class="" >' . esc_html( $this->button_text ) . '
						</a>
				   </div>';
			}
		}

		/**
		 * Show Button on the checkout form which user can click to start the
		 * OTP Verification process.
		 *
		 * @param string $button_id ID of the button.
		 */
		private function mo_showButtonOnPage( $button_id ) {
			if ( strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ) {
				echo '<input type="button" class="button alt" style="'
				. ( $this->popup_enabled ? 'float: right;line-height: 1;margin-right: 2em;padding: 1em 2em; display:none;' : 'display:none;width:100%;margin-bottom: 15px;' )
				. '" id="' . esc_attr( $button_id ) . '" title="'
				. esc_attr( __( 'Please Enter a Phone Number to enable this.', 'miniorange-otp-verification' ) ) . '" value="';
			} else {
				echo '<input type="button" class="button alt" style="'
				. ( $this->popup_enabled ? 'float: right;line-height: 1;margin-right: 2em;padding: 1em 2em; display:none;' : 'display:none;width:100%;margin-bottom: 15px;' )
				. '" id="' . esc_attr( $button_id ) . '" title="'
				. esc_attr( __( 'Please Enter an Email Address to enable this.', 'miniorange-otp-verification' ) ) . '" value="';
			}
			echo esc_attr( $this->button_text ) . '"></input>';
		}




		/**
		 * Process form and Validate OTP.
		 */
		public function process_wc_form_and_validate_otp() {
			// Security: Use hardcoded nonce action 'form_nonce' instead of variable.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
				return;
			}
			$sanitized_data = MoUtility::mo_sanitize_array( $_POST );
			$this->checkIfOTPSent();
			$this->checkIntegrityAndValidateOTP( $sanitized_data );
		}

		/**
		 * Checks whether OTP sent or not.
		 */
		private function checkIfOTPSent() {
			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}

		/**
		 * Check Integrity and validate OTP.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function checkIntegrityAndValidateOTP( $data ) {
			$this->checkIntegrity( $data );
			$otp_token = isset( $data['otp_token'] ) ? $data['otp_token'] : '';
			if ( empty( $otp_token ) && isset( $data['order_verify'] ) ) {
				$otp_token = $data['order_verify'];
			}
			$this->validate_challenge( $data['otpType'], null, $otp_token );
		}

		/**
		 * Checks Integrity.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function checkIntegrity( $data ) {
			if ( 'phone' === $data['otpType'] ) {
				if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, MoUtility::process_phone_number( $data['user_phone'] ) ) ) {
					wp_send_json(
						MoUtility::create_json(
							MoMessages::showMessage( MoMessages::PHONE_MISMATCH ),
							MoConstants::ERROR_JSON_TYPE
						)
					);
				}
			} elseif ( ! SessionUtils::is_email_verified_match( $this->form_session_var, $data['user_email'] ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::EMAIL_MISMATCH ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}

		/**
		 * Validate checkout OTP state during WooCommerce after-checkout validation.
		 *
		 * Adds a notice if OTP has not been validated yet. If validation is already
		 * successful for the current OTP type, clears OTP-related sessions.
		 *
		 * Hook: woocommerce_after_checkout_validation
		 *
		 * @param array    $data   Posted checkout data.
		 * @param WP_Error $errors Validation errors object.
		 * @return bool|void Returns true when adding a notice to classic checkout; otherwise void.
		 */
		public function mo_checkout_validation( $data, $errors ) {
			// Respect guest-only and existing WC errors.
			if ( $this->guest_check_out_only && is_user_logged_in() ) {
				return;
			}
			if ( ! MoUtility::is_blank( $errors->get_error_messages() ) ) {
				return;
			}
			// Respect selective payment setting.
			if ( ! $this->is_payment_verification_needed( $data ) ) {
				return;
			}
			$otp_type = strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ? 'phone' : 'email';
			if ( ! SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $otp_type ) ) {
				if ( function_exists( 'wc_add_notice' ) ) {
					wc_add_notice( MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE ), MoConstants::ERROR_JSON_TYPE );
				}
				return;
			}
			$this->unset_otp_session_variables();
		}

		/**
		 * Process the checkout form being submitted. Validate if
		 * OTP has been sent and the form has been submitted with an OTP.
		 *
		 * @param array    $data   The data submitted by the form.
		 * @param WP_Error $errors Validation errors.
		 */
		public function my_custom_checkout_field_process( $data, $errors ) {
			$wc_nonce = isset( $_POST['woocommerce-process-checkout-nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['woocommerce-process-checkout-nonce'] ) ) : '';
			if ( empty( $wc_nonce ) || ! wp_verify_nonce( $wc_nonce, 'woocommerce-process_checkout' ) ) {
				if ( function_exists( 'wc_add_notice' ) ) {
					wc_add_notice( MoMessages::showMessage( MoMessages::INVALID_OP ), MoConstants::ERROR_JSON_TYPE );
				}
				return;
			}
			$data = MoUtility::mo_sanitize_array( $_POST );
			if ( file_exists( MOV_DIR . 'addons/wcselectedcategory' ) && MoPHPSessions::get_session_var( 'specialproductexist' ) !== 'true' ) {
				return;
			}
			if ( ! MoUtility::is_blank( $errors->get_error_messages() ) ) {
				return;
			}
			if ( $this->guest_check_out_only && is_user_logged_in() ) {
				return;
			}
			if ( ! $this->is_payment_verification_needed( $data ) ) {
				return;
			}
			if ( $this->check_if_verification_not_started() ) {
				return;
			}
			if ( $this->check_if_verification_code_not_entered( $data ) ) {
				return;
			}
			$this->handle_otp_token_submitted( $data );
		}


		/**
		 * Validate if the phone number or email OTP was sent to and
		 * that the phone or email in the final submission matches.
		 *
		 * @param array $data Posted checkout data.
		 */
		private function handle_otp_token_submitted( $data ) {
			if ( strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ) {
				$error = $this->mo_process_phone( $data['billing_phone'] );
			} else {
				$error = $this->processEmail( $data['billing_email'] );
			}
			if ( ! $error ) {
				$otp_token = isset( $data['order_verify'] ) ? $data['order_verify'] : null;
				$this->validate_challenge( $this->get_verification_type(), 'order_verify', $otp_token );
			}
		}

		/**
		 * Checks if OTP Verification is enabled for the current payment method.
		 *
		 * @param array $data Posted checkout data.
		 * @return bool
		 */
		private function is_payment_verification_needed( $data ) {
			$payment_method = isset( $data['payment_method'] ) ? $data['payment_method'] : '';
			return $this->selective_payment ? array_key_exists( $payment_method, $this->payment_methods ) : true;
		}


		/**
		 * Check that the phone number OTP was sent to matches the final submitted phone.
		 *
		 * @param string $phone Phone number from the checkout form.
		 * @return bool
		 */
		private function mo_process_phone( $phone ) {
			$phone = MoUtility::process_phone_number( $phone );
			if ( strcasecmp( MoPHPSessions::get_session_var( 'phone_number_mo' ), $phone ) !== 0 ) {
				if ( function_exists( 'wc_add_notice' ) ) {
					wc_add_notice( MoMessages::showMessage( MoMessages::PHONE_MISMATCH ), MoConstants::ERROR_JSON_TYPE );
				}
				return true;
			}
			return false;
		}


		/**
		 * Check that the email address OTP was sent to matches the final submitted email.
		 *
		 * @param string $billing_email Email address from the checkout form.
		 * @return bool
		 */
		private function processEmail( $billing_email ) {
			if ( strcasecmp( MoPHPSessions::get_session_var( 'user_email' ), $billing_email ) !== 0 ) {
				if ( function_exists( 'wc_add_notice' ) ) {
					wc_add_notice( MoMessages::showMessage( MoMessages::EMAIL_MISMATCH ), MoConstants::ERROR_JSON_TYPE );
				}
				return true;
			}
			return false;
		}


		/**
		 * This function hooks into the otp_verification_failed hook. This function
		 * details what is done if the OTP verification fails.
		 *
		 * @param string $user_login the username posted by the user.
		 * @param string $user_email the email posted by the user.
		 * @param string $phone_number the phone number posted by the user.
		 * @param string $otp_type the verification type.
		 */
		public function handle_failed_verification( $user_login, $user_email, $phone_number, $otp_type ) {

			if ( $this->popup_enabled ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_OTP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} elseif ( function_exists( 'wc_add_notice' ) ) {
					wc_add_notice( MoUtility::get_invalid_otp_method(), MoConstants::ERROR_JSON_TYPE );
			}
		}


		/**
		 * This function hooks into the otp_verification_successful hook. This function is
		 * details what needs to be done if OTP Verification is successful.
		 *
		 * @param string $redirect_to the redirect to URL after new user registration.
		 * @param string $user_login the username posted by the user.
		 * @param string $user_email the email posted by the user.
		 * @param string $password the password posted by the user.
		 * @param string $phone_number the phone number posted by the user.
		 * @param string $extra_data any extra data posted by the user.
		 * @param string $otp_type the verification type.
		 */
		public function handle_post_verification( $redirect_to, $user_login, $user_email, $password, $phone_number, $extra_data, $otp_type ) {
			SessionUtils::add_status( $this->form_session_var, self::VALIDATED, $otp_type );
			MoPHPSessions::unset_session( 'specialproductexist' );

			if ( $this->popup_enabled ) {
				wp_send_json(
					MoUtility::create_json(
						MoConstants::SUCCESS_JSON_TYPE,
						MoConstants::SUCCESS_JSON_TYPE
					)
				);
			} else {
				$this->unset_otp_session_variables();
			}
		}


		/**
		 * This function is used to enqueue script on the frontend to facilitate
		 * OTP Verification for the FormCraft form. This function
		 * also localizes certain values required by the script.
		 */
		public function enqueue_script_on_page() {
			if ( file_exists( MOV_DIR . 'addons/wcselectedcategory' ) && MoPHPSessions::get_session_var( 'specialproductexist' ) !== 'true' ) {
				return;
			}
			$script_url = MOV_URL . 'includes/js/wccheckout.js?version=' . MOV_VERSION;
			wp_register_script( 'wccheckout', $script_url, array( 'jquery' ), MOV_VERSION, true );

			// Build popup HTML for classic checkout when popup is enabled.
			$popup_html = '';
			if ( $this->popup_enabled ) {
				$default_popup_handler = DefaultPopup::instance();
				$message               = '<div id="mo_message_wc_pop_up"></div>';
				$otp_type              = strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ? 'phone' : 'email';
				$from_both             = 'from_both';
				$template_content      = apply_filters( 'mo_template_build', '', $default_popup_handler->get_template_key(), $message, $otp_type, $from_both );
				$popup_html            = '<div id="popup_wc_mo" style="display:none">' . $template_content . '</div>';
			}
			wp_localize_script(
				'wccheckout',
				'mowccheckout',
				array(
					'paymentMethods'          => $this->payment_methods,
					'selectivePaymentEnabled' => $this->selective_payment,
					'popupEnabled'            => $this->popup_enabled,
					'popupHtml'               => $popup_html,
					'sendUrl'                 => esc_url( site_url() ) . '/?option=miniorange-woocommerce-checkout',
					'isLoggedIn'              => $this->guest_check_out_only && is_user_logged_in(),
					'otpType'                 => strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ? 'phone' : 'email',
					'otp_length_mo'           => get_mo_option( 'otp_length' ) ? get_mo_option( 'otp_length' ) : 5,
					'siteURL'                 => esc_url( site_url() ) . '/?option=miniorange_wc_otp_validation',
					'nonce'                   => wp_create_nonce( $this->nonce ),
				)
			);
			wp_enqueue_script( 'wccheckout' );
		}


		/**
		 * Unset all the session variables so that a new form submission starts
		 * a fresh process of OTP verification.
		 */
		public function unset_otp_session_variables() {
			SessionUtils::unset_session( array( $this->tx_session_id, $this->form_session_var ) );
		}

		/**
		 * This function is called by the filter mo_phone_dropdown_selector
		 * to return the Jquery selector of the phone field. The function will
		 * push the formID to the selector array if OTP Verification for the
		 * form has been enabled.
		 *
		 * @param  array $selector the Jquery selector to be modified.
		 * @return array
		 */
		public function get_phone_number_selector( $selector ) {

			if ( $this->is_form_enabled() && ( $this->otp_type === $this->type_phone_tag ) ) {
				array_push( $selector, $this->phone_form_id );
			}
			return $selector;
		}


		/**
		 * Handles saving all the woocommerce checkout form related options by the admin.
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'wc_checkout_enable' ) ) {
				return;
			}
			if ( ! function_exists( 'is_plugin_active' ) ) {
				include_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			if ( $this->sanitize_form_post( 'wc_checkout_enable' ) && ! is_plugin_active( 'woocommerce/woocommerce.php' ) ) {
				$message = MoMessages::showMessage( MoMessages::PLUGIN_INSTALL, array( 'formname' => $this->form_name ) );
				do_action( 'mo_registration_show_message', $message, MoConstants::ERROR );
				return;
			}
			$payment_methods = array();
			$wc_payment      = $this->sanitize_form_post( 'wc_payment', '' );
			if ( ! empty( $wc_payment ) ) {
				foreach ( $wc_payment as $selected ) {
					$payment_methods[ $selected ] = $selected;
				}
			}

			$this->is_form_enabled      = $this->sanitize_form_post( 'wc_checkout_enable' );
			$this->otp_type             = $this->sanitize_form_post( 'wc_checkout_type' );
			$this->guest_check_out_only = $this->sanitize_form_post( 'wc_checkout_guest' );
			$this->popup_enabled        = $this->sanitize_form_post( 'wc_checkout_popup' );
			$this->selective_payment    = $this->sanitize_form_post( 'wc_checkout_selective_payment' );
			$this->button_text          = $this->sanitize_form_post( 'wc_checkout_button_link_text' );
			$this->payment_methods      = $payment_methods;
			$this->restrict_duplicates  = $this->sanitize_form_post( 'wc_checkout_restrict_duplicates' );

			if ( $this->basic_validation_check( BaseMessages::WC_CHECKOUT_CHOOSE ) ) {
				update_mo_option( 'wc_checkout_restrict_duplicates', $this->restrict_duplicates );
				update_mo_option( 'wc_checkout_enable', $this->is_form_enabled );
				update_mo_option( 'wc_checkout_type', $this->otp_type );
				update_mo_option( 'wc_checkout_guest', $this->guest_check_out_only );
				update_mo_option( 'wc_checkout_popup', $this->popup_enabled );
				update_mo_option( 'wc_checkout_selective_payment', $this->selective_payment );
				update_mo_option( 'wc_checkout_button_link_text', $this->button_text );
				update_mo_option( 'wc_checkout_payment_type', maybe_serialize( $payment_methods ) );
			}
		}

		/*
		|--------------------------------------------------------------------------------------------------------
		| Getters
		|--------------------------------------------------------------------------------------------------------
		*/

		/**
		 * Getter for guest checkout option
		 *
		 * @return bool
		 */
		public function isGuestCheckoutOnlyEnabled() {
			return $this->guest_check_out_only; }

		/**
		 * Getter for showing button instead of text for checkout form
		 *
		 * @return bool
		 */
		public function showButtonInstead() {
			return $this->show_button; }

		/**
		 * Getter for is popup enabled for otp verification during wc checkout
		 *
		 * @return bool
		 */
		public function isPopUpEnabled() {
			return $this->popup_enabled; }

		/**
		 * Getter for payment methods for which OTP Verification has been enabled
		 *
		 * @return array
		 */
		public function getPaymentMethods() {
			return $this->payment_methods; }

		/**
		 * Getter for is selective payment enabled (based on payment methods)
		 *
		 * @return bool
		 */
		public function isSelectivePaymentEnabled() {
			return $this->selective_payment; }

		/**
		 * Getter for disable_auto_login
		 *
		 * @return bool
		 */
		public function isAutoLoginDisabled() {
			return $this->disable_auto_login; }
	}
}
