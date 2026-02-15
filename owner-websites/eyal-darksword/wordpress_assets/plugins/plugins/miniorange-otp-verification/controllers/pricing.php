<?php
/**
 * Controller for pricing tab.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\MoConstants;
use OTP\Helper\MoUtility;

// Validate admin handler exists before accessing.
if ( ! isset( $admin_handler ) || ! is_object( $admin_handler ) || ! method_exists( $admin_handler, 'get_nonce_value' ) ) {
	return;
}

// Validate and sanitize portal URL.
$portal_base = defined( 'MOV_PORTAL' ) && is_string( MOV_PORTAL ) ? esc_url_raw( MOV_PORTAL ) : '';
if ( empty( $portal_base ) ) {
	return;
}
$portal_host = esc_url_raw( trailingslashit( $portal_base ) . 'initializePayment' );
$vl          = MoUtility::mclv() && ! MoUtility::is_mg();

$nonce = $admin_handler->get_nonce_value();
// Validate nonce is not empty.
if ( empty( $nonce ) || ! is_string( $nonce ) ) {
	return;
}

$miniorange_gateway_plan_features = array(
	__( 'Unlimited Validity on Transactions.', 'miniorange-otp-verification' ),
	__( 'The SMS/Email transactions will be purchased from miniOrange', 'miniorange-otp-verification' ),
	__( 'OTP Verification on 30+ forms', 'miniorange-otp-verification' ),
	__( 'Validate phone number length based on country.', 'miniorange-otp-verification' ),
	__( 'Transaction Report', 'miniorange-otp-verification' ),
);

$custom_gateway_plan_features = array(
	__( 'Support HTTP based custom SMS/Email gateways.', 'miniorange-otp-verification' ),
	__( 'The SMS/Email transactions need to be purchased from your SMS/Email gateway.', 'miniorange-otp-verification' ),
	__( 'Email template customization', 'miniorange-otp-verification' ),
	__( 'miniOrange Gateway Supported.', 'miniorange-otp-verification' ),
);

$twilio_gateway_plan_features = array(
	__( 'OTP & Notifications Via WhatsApp', 'miniorange-otp-verification' ),
	__( 'Twilio SMS gateway supported.', 'miniorange-otp-verification' ),
	__( 'SMS, Email, or WhatsApp transactions must be purchased separately from the provider configured in the plugin (e.g., Twilio, Meta, etc.)', 'miniorange-otp-verification' ),
	__( 'miniOrange Gateway Support.', 'miniorange-otp-verification' ),
	__( 'All features from Custom Gateway Plan included.', 'miniorange-otp-verification' ),
);

$enterprise_plan_features = array(
	sprintf(
		'<b>%s</b>',
		esc_html__( 'All features from Custom & Twilio Gateway Plan', 'miniorange-otp-verification' )
	),
	__( 'Elementor Form Support', 'miniorange-otp-verification' ),
	__( 'Fluent Conversational Form Support', 'miniorange-otp-verification' ),
	__( 'WCFM Form Support', 'miniorange-otp-verification' ),
	__( 'Location based country code dropdown', 'miniorange-otp-verification' ),
	__( 'WooCommerce Password Reset OTP', 'miniorange-otp-verification' ),
	__( 'Backup Code/Master OTP', 'miniorange-otp-verification' ),
);

$woocommerce_plan_features = array(
	sprintf(
		'<b>%s</b>',
		esc_html__( 'All features from Enterprise Plan', 'miniorange-otp-verification' )
	),
	__( 'WooCommerce order status & Stock Notifications.', 'miniorange-otp-verification' ),
	sprintf(
		'<b><a href="https://plugins.miniorange.com/register-login-account-phone-miniorange-otp" target="_blank">%s</a></b>',
		esc_html__( 'Registration & Login using only Phone', 'miniorange-otp-verification' )
	),
	__( 'WCFM Vendor Notifications.', 'miniorange-otp-verification' ),
	__( 'Dokan Vendor Notifications.', 'miniorange-otp-verification' ),
	__( 'Dokan Customer/Vendor Registration Form Support.', 'miniorange-otp-verification' ),
);

// Premium supprted forms.
	$premium_forms_custom_gateway = array(
		__( '50+ popular WordPress Forms and Themes supported', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Registration & Login using only Phone', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'WooCommerce Login/Registration Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Gravity Forms', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Ninja Forms', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Elementor Pro', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'WP Everest User Registration', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Tutor LMS Login & Registration Forms', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Jet Engine Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Checkout WC Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'WooCommerce Frontend Manager Registration Form (WCFM)', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'JetFormBuilder by Crocoblock', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'WS Pro Contact Forms', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Fluent Conversational Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Dokan Registration Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'Houzez Registration Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
	);

	$premium_forms_mo_gateway = array(
		__( '50+ popular WordPress Forms and Themes supported', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'WooCommerce Login/Registration Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Registration & Login using only Phone', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'Gravity Forms', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Ninja Forms', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Elementor Pro', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'WP Everest User Registration', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Tutor LMS Login & Registration Forms', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Jet Engine Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Checkout WC Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'WooCommerce Frontend Manager Registration Form (WCFM)', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'JetFormBuilder by Crocoblock', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'WS Pro Contact Forms', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Fluent Conversational Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Dokan Registration Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'Houzez Registration Form', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
	);

	$premium_features_mo = array(
		__( 'OTP & Notifications Via WhatsApp', 'miniorange-otp-verification' )        => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'WooCommerce Order Status SMS Notifications', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'WooCommerce Stock Notifications', 'miniorange-otp-verification' )         => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'Ultimate Member SMS Notifications', 'miniorange-otp-verification' )       => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'WooCommerce Password Reset OTP', 'miniorange-otp-verification' )          => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Enable Country Code Dropdown', 'miniorange-otp-verification' )            => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Custom SMS & Email Template', 'miniorange-otp-verification' )             => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Custom OTP Length & Validity', 'miniorange-otp-verification' )            => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Block Email Domains & Phone Numbers', 'miniorange-otp-verification' )     => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'OTP Over Call - Twilio', 'miniorange-otp-verification' )                  => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'WooCommerce Frontend Manager Notifications', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'Dokan Vendor Notifications', 'miniorange-otp-verification' )              => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'Enable Alphanumeric OTP Format', 'miniorange-otp-verification' )          => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Geolocation Based Country Code Dropdown Addon', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Globally Banned Phone Numbers Blocking', 'miniorange-otp-verification' )  => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Validate Phone number length based on Country', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark' ) ),
	);

	$gateways_supported = array(
		__( 'miniOrange SMS Gateway', 'miniorange-otp-verification' )         => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Custom SMS/SMTP Gateway', 'miniorange-otp-verification' )        => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Twilio SMS Gateway', 'miniorange-otp-verification' )             => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'MSG-91 Gateway', 'miniorange-otp-verification' )                 => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'AWS SNS Gateway', 'miniorange-otp-verification' )                => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Test SMS Gateway Configuration', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Backup SMS Gateway', 'miniorange-otp-verification' )             => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
	);

	$gateways_supported_mo = array(
		__( 'miniOrange SMS Gateway', 'miniorange-otp-verification' )         => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Custom SMS/SMTP Gateway', 'miniorange-otp-verification' )        => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Twilio SMS Gateway', 'miniorange-otp-verification' )             => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'MSG-91 Gateway', 'miniorange-otp-verification' )                 => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'AWS SNS Gateway', 'miniorange-otp-verification' )                => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Test SMS Gateway Configuration', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Backup SMS Gateway', 'miniorange-otp-verification' )             => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark' ) ),
	);

	$premium_features = array(
		__( 'OTP & Notifications Via WhatsApp', 'miniorange-otp-verification' )        => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'WooCommerce Order Status SMS Notifications', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'WooCommerce Stock Notifications', 'miniorange-otp-verification' )         => array( 'feature' => array( 'red_cross', 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'Ultimate Member SMS Notifications', 'miniorange-otp-verification' )       => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'WooCommerce Password Reset OTP', 'miniorange-otp-verification' )          => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Enable Country Code Dropdown', 'miniorange-otp-verification' )            => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Custom SMS & Email Template', 'miniorange-otp-verification' )             => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Custom OTP Length & Validity', 'miniorange-otp-verification' )            => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'Block Email Domains & Phone Numbers', 'miniorange-otp-verification' )     => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'OTP Over Call - Twilio', 'miniorange-otp-verification' )                  => array( 'feature' => array( 'red_cross', 'checkmark', 'checkmark', 'checkmark' ) ),
		__( 'WooCommerce Frontend Manager Notifications', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'Dokan Vendor Notifications', 'miniorange-otp-verification' )              => array( 'feature' => array( 'red_cross', 'red_cross', 'red_cross', 'checkmark' ) ),
		__( 'Enable Alphanumeric OTP Format', 'miniorange-otp-verification' )          => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Geolocation Based Country Code Dropdown Addon', 'miniorange-otp-verification' ) => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Globally Banned Phone Numbers Blocking', 'miniorange-otp-verification' )  => array( 'feature' => array( 'red_cross', 'red_cross', 'checkmark', 'checkmark' ) ),
		__( 'Validate Phone number length based on Country', 'miniorange-otp-verification' ) => array( 'feature' => array( 'checkmark', 'checkmark', 'checkmark', 'checkmark' ) ),
	);

	$whatsapp_plugin_features1 = array(
		sprintf(
			'%s <a class="mo_links" href="https://plugins.miniorange.com/otp-verification-forms" target="_blank">%s</a>',
			esc_html__( 'OTP Verification on', 'miniorange-otp-verification' ),
			esc_html__( ' 60+ Forms', 'miniorange-otp-verification' )
		),
		__( 'WooCommerce Order Status Notifications to Admin, Customer, Vendors', 'miniorange-otp-verification' ),
		__( 'Use your own Facebook Meta Business account', 'miniorange-otp-verification' ),
		__( 'miniOrange Business Account Supported', 'miniorange-otp-verification' ),
	);
	$whatsapp_plugin_features2 = array(
		__( 'Fallback to SMS for non-WhatsApp numbers', 'miniorange-otp-verification' ),
		__( 'miniOrange Login and Registration form', 'miniorange-otp-verification' ),
		__( 'Custom Redirection on Login Form & Registration Form', 'miniorange-otp-verification' ),
		__( 'Use your own WhatsApp Business Service Provider', 'miniorange-otp-verification' ),
		__( 'WhatsApp Transaction Logs', 'miniorange-otp-verification' ),
	);

	// Validate file path using MoUtility::mo_require_file() before including.
	$view_file = MOV_DIR . 'views/pricing.php';
	if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
		return;
	}
	require $view_file;
