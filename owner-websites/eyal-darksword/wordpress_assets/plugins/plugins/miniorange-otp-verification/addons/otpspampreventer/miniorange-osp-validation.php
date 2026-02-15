<?php
/**
 * Plugin Name: OTP Spam Preventer addon
 * Plugin URI: http://miniorange.com
 * Description: Prevents OTP request spamming based on phone number, email, IP address, and browser fingerprint.
 * Version: 1.0.0
 * Author: miniOrange
 * Author URI: http://miniorange.com
 * Text Domain: miniorange-otp-verification
 * License: Expat
 * License URI: https://plugins.miniorange.com/mit-license
 *
 * @package otpspampreventer
 */

use OTP\MoInit;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MO_OSP_PLUGIN_NAME', plugin_basename( __FILE__ ) );
$dir_name = substr( MO_OSP_PLUGIN_NAME, 0, strpos( MO_OSP_PLUGIN_NAME, '/' ) );
if ( 'otpspampreventer' !== $dir_name ) {
	$dir_name = 'otpspampreventer';
}
define( 'MO_OSP_NAME', $dir_name );
require_once 'osp_autoload.php';
