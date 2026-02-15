<?php
/**
 * Load admin view for titlebar.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\MoActionHandlerHandler;

// Build secure recharge URL.
$recharge_url = add_query_arg(
	'requestOrigin',
	'wp_otp_verification_basic_plan',
	trailingslashit( MOV_PORTAL ) . 'initializePayment'
);

echo '
<!-- Title Bar -->
<div>
	<div>
        <!--<img style="float:left;" src="' . esc_url( MOV_LOGO_URL ) . '"></div>-->
		<div class="mo-section-header">
			<h5 class="text-lg font-bold" style="flex: 1 1 0%;">' . esc_html__( 'OTP Verification', 'miniorange-otp-verification' ) . '</h5>';
echo '      
            <div class="mo-otp-help-button static">';
echo '<div class="flex text-white text-xs ' . esc_attr( $hidden ) . '">
    <div id="mo_check_transactions" class="mo-transaction-show ' . esc_attr( $active_class ) . '">';
echo esc_html( $mo_transactions );
echo '				<button class="mo-refresh-btn ' . esc_attr( $active_class ) . '">
						<svg width="18" height="18" viewBox="0 0 512 512">
							<path d="M320,146s24.36-12-64-12A160,160,0,1,0,416,294" style="fill:none;stroke:#000;stroke-linecap:square;stroke-miterlimit:10;stroke-width:32px"/>
							<polyline points="256 58 336 138 256 218" style="fill:none;stroke:#000;stroke-linecap:square;stroke-miterlimit:10;stroke-width:32px"/>
						</svg>
					</button>
				</div>
				<div> 
					<a href="' . esc_url( $recharge_url ) . '" target="_blank" rel="noopener noreferrer" type="button" class="mo-button recharge">' . esc_html__( 'Recharge', 'miniorange-otp-verification' ) . '</a>
				</div>
			</div>
        </div>
    </div>
	<form id="mo_check_transactions_form" style="display:none;" action="" method="post">';

			wp_nonce_field( 'mo_check_transactions_form', '_nonce' );
echo '<input type="hidden" name="option" value="mo_check_transactions" />
        </form></div>';

if ( isset( $should_show_low_txn_alert ) && $should_show_low_txn_alert ) {
	MoActionHandlerHandler::mo_check_transactions();
	show_low_transaction_alert( $remaining_sms, $remaining_email, $low_txn_threshold_key, $license_plan );
}

if ( isset( $show_sms_notice ) && $show_sms_notice ) {
	echo '<div  style="border: none;"
						class="notice mo_sms_notice is-dismissible font-normal rounded-smooth bg-blue-50 py-mo-3">
						<h2>' . esc_html__( 'Due to recent changes in the SMS Delivery rules by the government of some countries like Singapore, Vietnam, Italy etc., you might face issues with SMS Delivery. In this case, contact us at ', 'miniorange-otp-verification' ) . '<a style="cursor:pointer;" class="text-green-800 font-semibold" onclick="otpSupportOnClick(\'Hi! My target country is Singapore/ Italy/ Vietnam. Please share the process to enable OTPs for these countries.\');">otpsupport@xecurify.com</a>.</h2>
		  </div>';
}

// Selected Country Add-on reminder.
if ( isset( $should_show_sc ) && $should_show_sc && $is_logged_in && $is_activated && ! $addon_settings_page ) {
	show_selected_country_addon_alert( $addon_sc_url );
	return;
}
// Transaction Logs reminder.
if ( isset( $should_show_tl ) && $should_show_tl ) {
	show_transaction_logs_alert( $reporting_url );
}
