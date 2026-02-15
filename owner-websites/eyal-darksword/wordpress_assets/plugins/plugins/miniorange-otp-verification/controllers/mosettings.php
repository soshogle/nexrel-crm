<?php
/**
 * Load admin view for settings tab.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;

// Validate admin handler exists before accessing.
if ( ! isset( $admin_handler ) || ! is_object( $admin_handler ) || ! method_exists( $admin_handler, 'get_nonce_value' ) ) {
	return;
}

$nonce = $admin_handler->get_nonce_value();
// Validate nonce is not empty.
if ( empty( $nonce ) || ! is_string( $nonce ) ) {
	return;
}

// Sanitize and validate $subtab from GET parameter.
$subtab = MoUtility::get_current_page_parameter_value( 'subpage', 'generalSettingsSubTab' );

// Validate $controller variable exists and is a string.
if ( ! isset( $controller ) || ! is_string( $controller ) || empty( $controller ) ) {
	return;
}

// List of allowed controller files to include (whitelist).
$allowed_files = array(
	'general-settings.php',
	'otpsettings.php',
	'messages.php',
	'design.php',
);

// Validate and require each file using MoUtility::mo_require_file() for security.
foreach ( $allowed_files as $file ) {
	$file_path = $controller . $file;
	if ( ! MoUtility::mo_require_file( $file_path, $controller ) ) {
		continue; // Skip invalid files.
	}

	require $file_path;
}
