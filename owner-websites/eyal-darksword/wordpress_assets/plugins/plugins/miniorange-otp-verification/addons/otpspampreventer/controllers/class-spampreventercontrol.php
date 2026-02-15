<?php
/**
 * OTP Spam Preventer Controller
 *
 * @package otpspampreventer/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OSP\Handler\MoOtpSpamStorage;
use OTP\Helper\MoUtility;

$storage  = MoOtpSpamStorage::instance();
$settings = $storage->mosp_get_settings();

if ( ! MoUtility::mo_require_file( MO_OSP_DIR . 'views/spampreventer.php', MO_OSP_DIR ) ) {
	return;
}
require MO_OSP_DIR . 'views/spampreventer.php';
