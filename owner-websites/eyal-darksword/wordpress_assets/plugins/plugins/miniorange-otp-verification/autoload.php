<?php
/**
 * Initializes plugin data.
 * Contains defination of common functions.
 *
 * @package miniorange-otp-verification
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\FormList;
use OTP\Helper\FormSessionData;
use OTP\Helper\MoUtility;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\MoOTPSplClassLoader;
use OTP\LicenseLibrary\Classes\Mo_License_Library;
use OTP\Helper\MoConstants;

define( 'MOV_DIR', plugin_dir_path( __FILE__ ) );
define( 'MOV_URL', plugin_dir_url( __FILE__ ) );

$package_data = json_decode( initialize_package_json() );

define( 'MOV_VERSION', $package_data->version );
define( 'MOV_TYPE', $package_data->type );
define( 'MOV_HOST', $package_data->hostname );
define( 'MOV_PORTAL', $package_data->portal );
define( 'MOV_DEFAULT_CUSTOMERKEY', $package_data->dcustomerkey );
define( 'MOV_DEFAULT_APIKEY', $package_data->dapikey );
define( 'MOV_SSL_VERIFY', $package_data->sslverify );
define( 'MOV_CSS_URL', MOV_URL . 'includes/css/mo_customer_validation_style.css?version=' . MOV_VERSION );
define( 'MOV_FORM_CSS', MOV_URL . 'includes/css/mo_forms_css.css?version=' . MOV_VERSION );
define( 'MO_INTTELINPUT_CSS', MOV_URL . 'includes/css/intlTelInput.min.css?version=' . MOV_VERSION );
define( 'MOV_JS_URL', MOV_URL . 'includes/js/settings.js?version=' . MOV_VERSION );
define( 'MOV_FEEDBACK_JS', MOV_URL . 'includes/js/mo_feedback.js?version=' . MOV_VERSION );
define( 'VALIDATION_JS_URL', MOV_URL . 'includes/js/formValidation.js?version=' . MOV_VERSION );
define( 'MO_INTTELINPUT_JS', MOV_URL . 'includes/js/intlTelInput.min.js?version=' . MOV_VERSION );
define( 'MO_DROPDOWN_JS', MOV_URL . 'includes/js/dropdown.js?version=' . MOV_VERSION );
define( 'MOV_LOADER_URL', MOV_URL . 'includes/images/loader.gif' );
define( 'MOV_DONATE', MOV_URL . 'includes/images/donate.png' );
define( 'MOV_PAYPAL', MOV_URL . 'includes/images/paypal.png' );
define( 'MOV_WHATSAPP', MOV_URL . 'includes/images/tourIcons/whatsApp.svg' );
define( 'MOV_NETBANK', MOV_URL . 'includes/images/netbanking.png' );
define( 'MOV_CARD', MOV_URL . 'includes/images/card.png' );
define( 'MOV_LOGO_URL', MOV_URL . 'includes/images/logo.png' );
define( 'MOV_ICON', MOV_URL . 'includes/images/miniorange_icon.png' );
define( 'MOV_ICON_GIF', MOV_URL . 'includes/images/mo_icon.gif' );
define( 'MO_CUSTOM_FORM', MOV_URL . 'includes/js/customForm.js?version=' . MOV_VERSION );
define( 'MOV_ADDON_DIR', MOV_DIR . 'addons/' );
define( 'MOV_USE_POLYLANG', true );
define( 'MO_TEST_MODE', $package_data->testmode );
define( 'MO_FAIL_MODE', $package_data->failmode );
define( 'MOV_SESSION_TYPE', $package_data->session );
define( 'MOV_MAIL_LOGO', MOV_URL . 'includes/images/mo_support_icon.png' );
define( 'MOV_OFFERS_LOGO', MOV_URL . 'includes/images/mo_sale_icon.png' );
define( 'MOV_FEATURES_GRAPHIC', MOV_URL . 'includes/images/mo_features_graphic.png' );
define( 'MOV_TYPE_PLAN', $package_data->typeplan );
define( 'MOV_LICENSE_NAME', $package_data->licensename );
define( 'MOV_CSS', MOV_URL . 'includes/css/mo_feedback_notice.css?version=' . MOV_VERSION );
define( 'MOV_MAIN_CSS', MOV_URL . 'includes/css/mo-main.css?version=' . MOV_VERSION );

$target = realpath( __DIR__ . '/class-mootpsplclassloader.php' );
if ( false !== $target && 0 === strpos( $target, realpath( MOV_DIR ) ) ) {
	require $target;
}

$idp_class_loader = new MoOTPSplClassLoader( 'OTP', realpath( __DIR__ . DIRECTORY_SEPARATOR . '..' ) );
$idp_class_loader->register();
$common_elements_path = realpath( __DIR__ . '/views/common-elements.php' );
if ( false !== $common_elements_path && 0 === strpos( $common_elements_path, realpath( MOV_DIR ) ) ) {
	require $common_elements_path;
}

if ( file_exists( MOV_DIR . MoConstants::LICENCE_SERVICE_FILE ) ) {
	new Mo_License_Library();
}


/**
 * Initializes handlers of forms.
 *
 * @return void
 */
function mo_initialize_forms() {
	$forms_dir  = MOV_DIR . 'handler/forms';
	$forms_path = realpath( $forms_dir );

	if ( false === $forms_path || 0 !== strpos( $forms_path, realpath( MOV_DIR ) ) ) {
		return;
	}

	$iterator = new RecursiveIteratorIterator(
		new RecursiveDirectoryIterator( $forms_path, RecursiveDirectoryIterator::SKIP_DOTS ),
		RecursiveIteratorIterator::LEAVES_ONLY
	);

	$handler_list      = FormList::instance();
	$is_block_checkout = mo_is_block_based_checkout();

	foreach ( $iterator as $it ) {
		$filename = $it->getFilename();
		$filename = sanitize_file_name( str_replace( 'class-', '', $filename ) );

		if ( 'mowccheckoutnew.php' === $filename || 'woocommercecheckoutform.php' === $filename ) {
			// Load only one WooCommerce checkout handler based on whether block-based checkout is enabled.
			$selected_file = $is_block_checkout ? 'mowccheckoutnew.php' : 'woocommercecheckoutform.php';

			// If the current file is not the selected handler, skip it to avoid duplicate registration.
			if ( $filename !== $selected_file ) {
				continue;
			}

			$class_name = 'OTP\\Handler\\Forms\\' . str_replace( '.php', '', $selected_file );
		} else {
			$class_name = 'OTP\\Handler\\Forms\\' . str_replace( '.php', '', $filename );
		}

		if ( class_exists( $class_name ) && method_exists( $class_name, 'instance' ) ) {
			$form_handler = $class_name::instance();
			$handler_list->add( $form_handler->get_form_key(), $form_handler );
		}
	}
}

/**
 * Returns if block checkout is enabled.
 *
 * This version does not rely on WooCommerce Blocks PHP classes being loaded.
 * Instead, it inspects the WooCommerce Checkout page content for the
 * `woocommerce/checkout` block, so it can be safely called early (e.g. in
 * constructors) without depending on plugin load order.
 *
 * @return bool
 */
function mo_is_block_based_checkout() {
	if ( ! function_exists( 'is_plugin_active' ) ) {
		include_once ABSPATH . 'wp-admin/includes/plugin.php';
	}

	if ( ! is_plugin_active( 'woocommerce/woocommerce.php' ) ) {
		return false;
	}

	// Get the Checkout page ID directly from WooCommerce options.
	$checkout_page_id = (int) get_option( 'woocommerce_checkout_page_id' );
	if ( $checkout_page_id <= 0 ) {
		return false;
	}

	$checkout_page = get_post( $checkout_page_id );
	if ( ! $checkout_page || empty( $checkout_page->post_content ) ) {
		return false;
	}

	// Prefer core has_block() if available (WP 5+).
	if ( function_exists( 'has_block' ) ) {
		return has_block( 'woocommerce/checkout', $checkout_page );
	}

	// Fallback: simple string search for the block name in post content.
	return ( false !== strpos( $checkout_page->post_content, 'woocommerce/checkout' ) );
}

/**
 * Returns admin post url.
 *
 * @return string
 */
function admin_post_url() {
	return admin_url( 'admin-post.php' ); }

/**
 * Returns wp ajax url.
 *
 * @return string
 */
function wp_ajax_url() {
	return admin_url( 'admin-ajax.php' ); }

/**
 * Escapes a string based on the type.
 *
 * @param string $string_value - string to be escaped.
 * @param string $type - type of escaping to apply.
 * @return string
 */
function mo_esc_string( $string_value, $type ) {
	if ( 'attr' === $type ) {
		return esc_attr( $string_value );
	} elseif ( 'url' === $type ) {
		return esc_url( $string_value );
	}

	return esc_attr( $string_value );
}

/**
 * Retrieves the value of the option from the wp_option table.
 *
 * @param string $string_value - option name to be retrieved.
 * @param string $prefix - prefix of the option.
 * @return mixed
 */
function get_mo_option( $string_value, $prefix = null ) {
	$string_value = ( null === $prefix ? 'mo_customer_validation_' : $prefix ) . $string_value;
	return apply_filters( 'get_mo_option', get_site_option( $string_value ) );
}

/**
 * Updates the option set in the wp_option table.
 *
 * @param string $string_value - option name to be deleted.
 * @param string $value - value of the option.
 * @param string $prefix - prefix of the option.
 */
function update_mo_option( $string_value, $value, $prefix = null ) {
	$string_value = ( null === $prefix ? 'mo_customer_validation_' : $prefix ) . $string_value;
	update_site_option( $string_value, apply_filters( 'update_mo_option', $value, $string_value ) );
}

/**
 * Deletes the option set in the wp_option table.
 *
 * @param string $string_value - option name to be deleted.
 * @param string $prefix - prefix of the option.
 */
function delete_mo_option( $string_value, $prefix = null ) {
	$string_value = ( null === $prefix ? 'mo_customer_validation_' : $prefix ) . $string_value;
	delete_site_option( $string_value );
}

/**
 * Returns the class name without namespace.
 *
 * @param object $obj - object of the class.
 * @return string
 */
function get_mo_class( $obj ) {
	$namespace_class = get_class( $obj );
	return substr( $namespace_class, strrpos( $namespace_class, '\\' ) + 1 );
}

/**
 * To check if package.json file can be found through WP site URL or not.
 * BuildScript.php updates the package.json file content in the below function instead of package.json to be used further in autoload.php
 * example package.json string ["name"=>"miniorange-otp-verification","version"=>"5.4.8","type"=>"MiniOrangeGateway","testMode"=>false,"failMode"=>false,"hostname"=>"https:\/\/login.xecurify.com","dCustomerKey"=>"16555","dApiKey"=>"fFd2XcvTGDemZvbw1bcUesNJWEqKbbUq","sslVerify"=>true,"session"=>"SESSION"]
 *
 * @return string
 */
function initialize_package_json() {
	$package = wp_json_encode(
		array(
			'name'         => 'miniorange-otp-verification',
			'version'      => '5.4.8',
			'type'         => 'MiniOrangeGateway',
			'testmode'     => false,
			'failmode'     => false,
			'hostname'     => 'https://login.xecurify.com',
			'portal'       => 'https://portal.miniorange.com',
			'dcustomerkey' => '16555',
			'dapikey'      => 'fFd2XcvTGDemZvbw1bcUesNJWEqKbbUq',
			'sslverify'    => true,
			'session'      => 'SESSION',
			'typeplan'     => 'wp_otp_verification_basic_plan',
			'licensename'  => 'WP_OTP_VERIFICATION_PLUGIN',
		)
	);
	return $package;
}
