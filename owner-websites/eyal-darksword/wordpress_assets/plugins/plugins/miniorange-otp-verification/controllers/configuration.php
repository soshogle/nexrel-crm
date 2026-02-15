<?php
/**
 * Load admin view for gateway configuration.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\GatewayFunctions;

$gateway = GatewayFunctions::instance();
$gateway->show_configuration_page( $disabled );
