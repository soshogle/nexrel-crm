<?php
/**
 * Load view for SMS Notifications List
 *
 * @package miniorange-otp-verification/Notifications/wcsmsnotification/controllers
 */

namespace OTP\Notifications\WcSMSNotification\Controllers;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoMessages;
use OTP\Notifications\WcSMSNotification\Helper\MoWcAddOnMessages;
use OTP\Notifications\WcSMSNotification\Helper\WooCommerceNotificationsList;
use OTP\Helper\MoUtility;

// Access control check - only administrators can access SMS notification settings.
if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}

$notification_settings = get_wc_option( 'notification_settings_option' );

// Secure deserialization with validation and PHP 5.6 compatibility.
if ( $notification_settings && is_serialized( $notification_settings ) ) {
	$notification_settings = maybe_unserialize( $notification_settings );
	// Validate that deserialization resulted in expected object type.
	if ( ! is_object( $notification_settings ) || ! method_exists( $notification_settings, 'get_wc_customer_note_notif' ) ) {
		$notification_settings = WooCommerceNotificationsList::mo_otp_get_instance();
	}
} else {
	$notification_settings = $notification_settings ? $notification_settings : WooCommerceNotificationsList::mo_otp_get_instance();
}

$sms       = '';
$wc_hidden = 'MowcNotifSubTab' === $subtab ? '' : 'hidden';

// Secure file inclusion with path validation.
if ( defined( 'MSN_DIR' ) && ! empty( MSN_DIR ) ) {
	$view_file = MSN_DIR . '/views/wc-sms-notification.php';
	if ( ! MoUtility::mo_require_file( $view_file, MSN_DIR ) ) {
		return;
	}
	require $view_file;
}

/**
 * This function is used to display rows in the notification table for the admin to get an
 * overview of all the SMS notifications that are going out because of the plugin. It displays
 * if the notification is enabled, who the recipient is, the type of SMS notification etc.
 *
 * @param WooCommerceNotificationsList $notifications The list of all notifications for WooCommerce.
 */
function mo_show_wc_notifications_table( $notifications ) {
	// Access control check within function.
	if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
	}

	// Input validation for notifications object.
	if ( ! is_object( $notifications ) ) {
		wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
	}

	$form_options = 'mo_wc_sms_notif_settings';

	foreach ( $notifications as $notification => $property ) {
		if ( ! $property || ! is_object( $property ) ) {
			continue;
		}

		// Validate and sanitize notification key.
		$notification_key = sanitize_key( $notification );
		if ( empty( $notification_key ) ) {
			continue;
		}

		// Validate property object has required properties.
		if ( ! isset( $property->title ) || ! isset( $property->notification_type ) || ! isset( $property->is_enabled ) ) {
			continue;
		}

		echo '<div style="display:flex;"><div>
				<tr>
					<td class="mo-wcnotif-table bg-white">
						<a class="mo-title text-primary text-blue-600">' . esc_html( $property->title ) . '</a>
					</td>
					<td class="msn-table-list-recipient" style="word-wrap: break-word;">
						' . esc_html( $property->notification_type ) . '
					</td>
					<td class="msn-table-list-status-actions">
						<label class="mo-switch">
							<input class="input" name="' . esc_attr( $notification_key ) . '" id="' . esc_attr( $notification_key ) . '" type="checkbox" ' . ( $property->is_enabled ? 'checked' : '' ) . '/>
							<span class="mo-slider"></span>
						</label>
					</td>';

		$var   = $notification_key;
		$id    = 'sms-body-' . esc_attr( $var );
		$btnid = 'btn-' . esc_attr( $var );

		echo '<td class="msn-table-edit-body mo_showcontainer">
				<button id="' . esc_attr( $btnid ) . '" type="button" class="mo-button secondary" onClick="edit_button(this)">Edit</button>
				<tr>
					<td colspan="4">
						<div id="' . esc_attr( $id ) . '" style="display:none;" class="p-mo-8">';

		// Secure file inclusion with whitelist validation.
		$allowed_notifications = array(
			'wc_new_customer_notif',
			'wc_customer_note_notif',
			'wc_order_on_hold_notif',
			'wc_order_processing_notif',
			'wc_order_completed_notif',
			'wc_order_refunded_notif',
			'wc_order_cancelled_notif',
			'wc_order_failed_notif',
			'wc_order_pending_notif',
			'wc_admin_order_status_notif',
			'wc_product_is_in_low_stock_notif',
			'wc_product_is_out_of_stock_notif',
		);

		// Convert underscores to hyphens for filename.
		$notif_filename = str_replace( '_', '-', $var );

		// Validate notification is in whitelist.
		if ( ! in_array( $var, $allowed_notifications, true ) ) {
			echo '<p>' . esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) . '</p>';
		} elseif ( defined( 'MSN_DIR' ) && ! empty( MSN_DIR ) ) {
			// Secure file inclusion with path validation.
			$include_file = plugin_dir_path( __FILE__ ) . 'smsnotifications/' . $notif_filename . '.php';
			if ( ! MoUtility::mo_require_file( $include_file, MSN_DIR ) ) {
				return;
			}
			require_once $include_file;
		}

		echo '</div>
			</td>
		</tr>
	</td>
</div></div>';
	}
}
