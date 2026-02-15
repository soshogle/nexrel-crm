<?php
/**
 * View file to show SMS Notifications List
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Notifications\WcSMSNotification\Helper\MoWcAddOnUtility;
use OTP\Notifications\UmSMSNotification\Helper;

echo '		<div>
				<div class="">';
echo '
					<form name="f" method="post" action="" id="wc_sms_notif_settings">
';
					wp_nonce_field( 'mo_admin_nonce' );
echo '						<input type="hidden" name="option" value="wc_sms_notif_settings" />
						<div class="mo-header">
							<p class="mo-heading flex-1">' . esc_html( __( 'Notification Settings', 'miniorange-otp-verification' ) ) . '</p>
							<input type="submit" name="save" id="save" 
										class="mo-button primary" value="' . esc_attr( __( 'Save Settings', 'miniorange-otp-verification' ) ) . '">
						</div>
						<div>
						<div class=" w-full gap-mo-4 flex">
								<div class="flex-1 pl-mo-8 pt-mo-4">
									<h3 class="py-mo-1.5 font-heading font-semibold  text-md justify-center text-gray-900">' . esc_html__( 'WooCommerce SMS Notifications', 'miniorange-otp-verification' ) . '</h3>
								</div>
							</div>
							<table class="mo-wcnotif-table bg-white">
								<thead>
									<tr>
										<th>' . esc_html__( 'SMS Type', 'miniorange-otp-verification' ) . '</th>
										<th>' . esc_html__( 'Recipient', 'miniorange-otp-verification' ) . '</th>
										<th></th>
										<th>' . esc_html__( 'SMS Body', 'miniorange-otp-verification' ) . '</th>			
									</tr>
								</thead>
								<tbody>';
									show_wc_notifications_table( $notification_settings );
echo '							</tbody>
							</table>
						</div>
						<div class=" w-full gap-mo-4 flex">
								<div class="flex-1 pl-mo-8 pt-mo-4">
									<h3 class="py-mo-1.5 font-heading font-semibold  text-md justify-center text-gray-900">' . esc_html__( 'Ultimate Member SMS Notifications', 'miniorange-otp-verification' ) . '</h3>
								</div>
							</div>
							<table class="mo-wcnotif-table bg-white">
								<thead>
									<tr>
										<th>' . esc_html__( 'SMS Type', 'miniorange-otp-verification' ) . '</th>
										<th>' . esc_html__( 'Recipient', 'miniorange-otp-verification' ) . '</th>
										<th></th>
										<th>' . esc_html__( 'SMS Body', 'miniorange-otp-verification' ) . '</th>			
									</tr>
								</thead>
								<tbody>';
									show_um_notifications_table( $notification_settings );
echo '							</tbody>
							</table>
						</div>
					</form>	
				</div>
			</div>';
