<?php // phpcs:ignore WordPress.Files.FileName.NotHyphenatedLowercase
/**
 * Plugin Name: miniOrange OTP Login, Verification and SMS Notifications
 * Plugin URI: http://miniorange.com
 * Description: Email & SMS OTP verification on 60+ forms, SMS notifications for WooCommerce, passwordless login, Login with phone, support for external OTP gateways.
 * Version: 5.4.8
 * Author: miniOrange
 * Author URI: https://miniorange.com
 * Text Domain: miniorange-otp-verification
 * Domain Path: /lang
 * WC requires at least: 2.0.0
 * WC tested up to: 8.2.1
 * License: Expat
 * License URI: https://plugins.miniorange.com/mit-license
 *
 * @package miniorange-otp-verification
 */

use OTP\MoInit;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
define( 'MOV_PLUGIN_NAME', plugin_basename( __FILE__ ) );
$dir_name = substr( MOV_PLUGIN_NAME, 0, strpos( MOV_PLUGIN_NAME, '/' ) );
define( 'MOV_NAME', $dir_name );

/**
 * WooCommerce hook to show that the plugin is compatible with the HPOS functionality.
 */
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

add_action( 'in_plugin_update_message-' . MOV_PLUGIN_NAME, 'mo_otp_plugin_update_message', 10, 2 );
/**
 * Show important notice on plugin update screen.
 *
 * @param array $data     Plugin data.
 * @param array $response Response data.
 *
 * @return void
 */
function mo_otp_plugin_update_message( $data, $response ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
	$message  = '<div class="mo-otp-update-message" style="background:#ffecec; margin:10px 0 0; padding:10px;">';
	$message .= '<strong>' . esc_html__( 'Important:', 'miniorange-otp-verification' ) . '</strong> ';
	$message .= esc_html__( 'This plugin contains major changes. Please back up your current plugin before updating. You can reach out to us at otpsupport@xecurify.com for any issues.', 'miniorange-otp-verification' );
	$message .= '</div>';

	echo wp_kses_post( $message );
}

/**
 * Update the notification settings option with proper sanitization.
 *
 * @param string $option_name The name of the notification settings option.
 *
 * @return void
 */
function mo_update_notification_settings_option( $option_name ) {
	$option_name          = sanitize_key( $option_name );
	$updated_option_name  = $option_name . '_option';
	$updated_option_value = get_option( $updated_option_name );
	$option_value         = get_option( $option_name );
	if ( empty( $updated_option_value ) && ! empty( $option_value ) ) {
		$notification_details = (array) $option_value;
		if ( isset( $notification_details['__PHP_Incomplete_Class_Name'] ) ) {
			unset( $notification_details['__PHP_Incomplete_Class_Name'] );
		}
		$notif_data = array();

		foreach ( $notification_details as $notification_name => $property ) {
			$new_property = (array) $property;
			if ( isset( $new_property['__PHP_Incomplete_Class_Name'] ) ) {
				unset( $new_property['__PHP_Incomplete_Class_Name'] );
			}
			$notif_data[ sanitize_key( $notification_name ) ] = $new_property;
		}
		update_option( $option_name, $notif_data );
	}
}

mo_update_notification_settings_option( 'mo_wc_sms_notification_settings' );
mo_update_notification_settings_option( 'mo_um_sms_notification_settings' );

$license_autoloader_path = plugin_dir_path( __FILE__ ) . 'lib/license/autoloader.php';
$license_autoloader_path = realpath( $license_autoloader_path );
$base_dir                = realpath( plugin_dir_path( __FILE__ ) . 'lib/license/' );
if ( false !== $license_autoloader_path && 0 === strpos( $license_autoloader_path, realpath( $base_dir ) ) ) {
	require_once $license_autoloader_path;
}
$autoload_path = plugin_dir_path( __FILE__ ) . 'autoload.php';
$autoload_path = realpath( $autoload_path );
$base_dir      = realpath( plugin_dir_path( __FILE__ ) );
if ( false !== $autoload_path && 0 === strpos( $autoload_path, realpath( $base_dir ) ) ) {
	require_once $autoload_path;
}
MoInit::instance(); // initialize the main class.
