<?php
/**
 * Loads the tab view and initializes other controllers.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\MoActionHandlerHandler;
use OTP\Helper\MoUtility;
use OTP\Objects\TabDetails;
use OTP\Objects\SubTabDetails;
use OTP\Helper\MoConstants;

// Security check: Only administrators can access admin controllers.
if ( ! current_user_can( 'manage_options' ) ) {
	return;
}

$registered           = MoUtility::micr();
$activated            = MoUtility::mclv();
$gatewayconfigured    = MoUtility::is_gateway_config();
$plan                 = MoUtility::micv();
$mle                  = Moutility::mllc();
$disabled             = ( ( ( $registered && $activated ) || ( strcmp( MOV_TYPE, 'MiniOrangeGateway' ) === 0 ) ) && ! $mle['STATUS'] ) ? '' : 'disabled';
$mo_current_user      = wp_get_current_user();
$email                = get_mo_option( 'admin_email' );
$phone                = get_mo_option( 'admin_phone' );
$controller           = MOV_DIR . 'controllers/';
$admin_handler        = MoActionHandlerHandler::instance();
$is_sms_notice_closed = get_mo_option( 'mo_hide_sms_notice' );


$tab_details = TabDetails::instance();

$sub_tab_details = SubTabDetails::instance();

echo '
<div id="mo-main-outer-div">';

$titlebar_file = $controller . 'titlebar.php';
if ( ! MoUtility::mo_require_file( $titlebar_file, $controller ) ) {
	return;
}
require $titlebar_file;

echo "  
    <div class='w-full flex'>";
$navbar_file = $controller . 'navbar.php';
if ( ! MoUtility::mo_require_file( $navbar_file, $controller ) ) {
	return;
}
require $navbar_file;
echo '  <div class="flex-1 p-mo-sm">';
$admin_messagebar_file = $controller . 'admin-messagebar.php';
if ( ! MoUtility::mo_require_file( $admin_messagebar_file, $controller ) ) {
	return;
}
require $admin_messagebar_file;
echo '      <div class="bg-mo-primary-bg rounded-mo-smooth mo-main-content">
                <div id="moblock" class="mo_customer_validation-modal-backdrop dashboard">' .
					'<img src="' . esc_url( MOV_LOADER_URL ) . '">' .
				'</div>';

$subtabs_file = $controller . 'subtabs.php';
if ( ! MoUtility::mo_require_file( $subtabs_file, $controller ) ) {
	return;
}
require $subtabs_file;

echo '          <div>';
$current_page = MoUtility::get_current_page_parameter_value( 'page', '' );
if ( ! empty( $current_page ) ) {

	foreach ( $tab_details->tab_details as $mo_tabs ) {
		if ( $current_page === $mo_tabs->menu_slug ) {
			$tab_view_file = $controller . $mo_tabs->view;
			if ( ! MoUtility::mo_require_file( $tab_view_file, $controller ) ) {
				return;
			}
			require $tab_view_file;
		}
	}
	do_action( 'mo_otp_verification_add_on_controller' );
}
echo '           </div>
            </div>
        </div>
    </div>
</div>';
$contactus_file = $controller . 'contactus.php';
if ( ! MoUtility::mo_require_file( $contactus_file, $controller ) ) {
	return;
}
require $contactus_file;
