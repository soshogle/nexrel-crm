<?php
/**
 * Controller of Ultimate member SMS notifications.
 *
 * @package miniorange-otp-verification/Notifications/umsmsnotification/controllers
 */

namespace OTP\Notifications\UmSMSNotification\Controllers;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Notifications\UmSMSNotification\Helper\UltimateMemberNotificationsList;
use OTP\Helper\MoUtility;

if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
	return;
}

$notification_settings = get_umsn_option( 'notification_settings_option' );

if ( $notification_settings && is_serialized( $notification_settings ) ) {
	$notification_settings = maybe_unserialize( $notification_settings );
	if ( ! is_object( $notification_settings ) || ! method_exists( $notification_settings, 'get_um_new_customer_notif' ) ) {
		$notification_settings = UltimateMemberNotificationsList::mo_otp_get_instance();
	}
} else {
	$notification_settings = $notification_settings ? $notification_settings : UltimateMemberNotificationsList::mo_otp_get_instance();
}

$sms       = '';
$um_hidden = 'MoumNotifSubTab' === $subtab ? '' : 'hidden';

if ( defined( 'UMSN_DIR' ) && ! empty( UMSN_DIR ) ) {
	$view_file = UMSN_DIR . '/views/um-sms-notification.php';
	if ( ! MoUtility::mo_require_file( $view_file, UMSN_DIR ) ) {
		return;
	}
	require_once $view_file;
}



/**
 * This function is used to display rows in the notification table for the admin to get an
 * overview of all the SMS notifications that are going out because of the plugin. It displays
 * if the notification is enabled, who the recipient is, the type of SMS notification etc.
 *
 * @param UltimateMemberNotificationsList $notifications The list of all notifications for Ultimate Member.
 */
function mo_show_um_notifications_table( $notifications ) {

	if ( ! current_user_can( 'manage_options' ) || ! is_object( $notifications ) ) {
		return;
	}

	$form_options      = 'mo_um_sms_notif_settings';
	$um_new_customer   = $notifications->um_new_customer_notif;
	$um_new_user_admin = $notifications->um_new_user_admin_notif;

	$notification_objects = array(
		'um_new_customer_notif'   => $um_new_customer,
		'um_new_user_admin_notif' => $um_new_user_admin,
	);

	foreach ( $notification_objects as $notification => $property ) {
		if ( null === $property ) {
			continue;
		}

		if ( ! is_string( $notification ) || ! is_object( $property ) ) {
			continue;
		}
		echo '	<div style="display:flex;"><div>
					
					<tr >
						<td class="mo-wcnotif-table bg-white">
							<a class="mo-title text-primary text-blue-600">' . esc_html( isset( $property->title ) ? $property->title : '' ) . '</a>';

		echo '		    </td>

						<td class="msn-table-list-recipient" style="word-wrap: break-word;">
							' . esc_html( isset( $property->notification_type ) ? $property->notification_type : '' ) . '
						</td>
					

						<td class="msn-table-list-status-actions">
							<label class="mo-switch">
							  <input class="input" name="' . esc_attr( $notification ) . '" id="' . esc_attr( $notification ) . '" type="checkbox" ' . ( isset( $property->is_enabled ) && $property->is_enabled ? 'checked' : '' ) . '/>
							  <span class="mo-slider"></span>
							</label>
						</td>';

						$var = sanitize_text_field( $notification );

						$id    = 'sms-body-' . $var;
						$btnid = 'btn-' . $var;

		echo '           <td class="msn-table-edit-body mo_showcontainer">
							<button id="' . esc_attr( $btnid ) . '" type="button" class="mo-button secondary" onClick="edit_button(this)">Edit</button>

							<tr>
								<td colspan="4">
									<div id="' . esc_attr( $id ) . '" style="display:none;" class="p-mo-8">';

										$notif        = $var;
										$len_of_notif = strlen( $notif );
		for ( $i = 0; $i < $len_of_notif; $i++ ) {

			if ( '_' === $notif[ $i ] ) {
				$notif[ $i ] = '-';
			}
		}
		$path         = '/controllers/smsnotifications/' . $notif . '.php';
		$include_file = UMSN_DIR . $path;
		if ( MoUtility::mo_require_file( $include_file, UMSN_DIR ) ) {
			$notification_settings = $notifications;
			require_once $include_file;
		}
		echo '						</div>
								</td>
							</tr>
		            </tr>';

	}
}
