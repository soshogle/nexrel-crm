<?php
/**
 * Load admin view for Ultimate Member SMS Notification addon.
 *
 * @package miniorange-otp-verification/notifications/umsmsnotification/handler
 */

namespace OTP\Notifications\UmSMSNotification\Handler;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Notifications\UmSMSNotification\Helper\UltimateMemberNotificationsList;
use OTP\Objects\BaseAddOnHandler;
use OTP\Helper\MoMessages;
use OTP\Objects\BaseMessages;
use OTP\Helper\MoConstants;
use OTP\Traits\Instance;
use OTP\Helper\MoFormDocs;
use OTP\Helper\MoUtility;

/**
 * The class is used to handle all Ultimate Member Notifications related functionality.
 * This class hooks into all the available notification hooks and filters of
 * Ultimate Member to provide the possibility of SMS notifications.
 */
if ( ! class_exists( 'UltimateMemberSMSNotificationsHandler' ) ) {
	/**
	 * UltimateMemberSMSNotificationsHandler class
	 */
	class UltimateMemberSMSNotificationsHandler extends BaseAddOnHandler {

		use Instance;

		/**
		 * Instance of the UltimateMemberNotificationList Class.
		 *
		 * @var UltimateMemberNotificationsList instance of the UltimateMemberNotificationsList Class */
		private $notification_settings;


		/**
		 * Constructor checks if add-on has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make the add-on functionality work.
		 */
		public function __construct() {
			parent::__construct();
			if ( ! $this->moAddOnV() ) {
				return;
			}
			add_action( 'init', array( $this, 'mo_otp_old_notification_settings' ) );
			add_action( 'um_registration_complete', array( $this, 'mo_send_new_customer_sms_notif' ), 1, 2 );
			add_action( 'admin_init', array( $this, 'check_um_notifications_options' ) );
		}

		/**
		 * This function is used to get the old notification settings.
		 *
		 * @return void
		 */
		public function mo_otp_old_notification_settings() {
			$notification_settings = get_umsn_option( 'notification_settings_option' );
			if ( empty( $notification_settings ) || ! is_object( $notification_settings ) ) {
				$notification_settings = UltimateMemberNotificationsList::mo_otp_get_instance();
			}
			if ( empty( get_umsn_option( 'notification_settings_option' ) ) && ! empty( get_umsn_option( 'notification_settings' ) ) ) {
				$old_notification_settings = get_option( 'mo_um_sms_notification_settings' );
				foreach ( $old_notification_settings as $notification_name => $property ) {
					$notification_name = sanitize_key( $notification_name );
					if ( empty( $notification_name ) || ! is_array( $property ) ) {
						continue;
					}
					if ( ! property_exists( $notification_settings, $notification_name ) ) {
						continue;
					}
					$sms_settings             = $notification_settings->$notification_name;
					$sms_settings->is_enabled = ! empty( $property['is_enabled'] );
					$sms_settings->sms_body   = isset( $property['sms_body'] ) ? sanitize_textarea_field( wp_unslash( $property['sms_body'] ) ) : '';
					$sms_settings->recipient  = isset( $property['recipient'] ) ? sanitize_text_field( wp_unslash( $property['recipient'] ) ) : '';
				}
				update_umsn_option( 'notification_settings_option', $notification_settings );
			}
		}


		/**
		 * This function hooks into the um_send_registration_notification hook
		 * to send an SMS notification to the user when he successfully creates an
		 * account using the checkout or registration page.
		 *
		 * @param mixed $user_id  user id of the user created.
		 * @param array $args     the extra arguments passed by the hook.
		 */
		public function mo_send_new_customer_sms_notif( $user_id, $args = array() ) {
			if ( ! is_numeric( $user_id ) || $user_id <= 0 ) {
				return;
			}
			if ( ! is_array( $args ) ) {
				$args = array();
			}
			$notification_settings = get_umsn_option( 'notification_settings_option' );
			if ( empty( $notification_settings ) || ! is_object( $notification_settings ) ) {
				$notification_settings = UltimateMemberNotificationsList::mo_otp_get_instance();
			}
			$cust_notif  = isset( $notification_settings->um_new_customer_notif ) ? $notification_settings->um_new_customer_notif : null;
			$admin_notif = isset( $notification_settings->um_new_user_admin_notif ) ? $notification_settings->um_new_user_admin_notif : null;
			$payload     = array_merge( array( 'customer_id' => $user_id ), $args );
			if ( is_object( $cust_notif ) && method_exists( $cust_notif, 'send_sms' ) ) {
				$cust_notif->send_sms( $payload );
			}
			if ( is_object( $admin_notif ) && method_exists( $admin_notif, 'send_sms' ) ) {
				$admin_notif->send_sms( $payload );
			}
		}

		/**
		 * Checks and updates the notification options.
		 */
		public function check_um_notifications_options() {
			if ( ! ( isset( $_POST['option'] ) && 'mo_um_sms_notif_settings' === sanitize_text_field( wp_unslash( $_POST['option'] ) ) ) ) {
				return;
			}
			if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'mo_admin_actions' ) ) {
				wp_die( esc_attr( MoMessages::showMessage( MoMessages::INVALID_OP ) ) );
			}
			$_this_notification_settings = get_umsn_option( 'notification_settings_option' );
			if ( ! is_object( $_this_notification_settings ) ) {
				$_this_notification_settings = UltimateMemberNotificationsList::mo_otp_get_instance();
			}
			foreach ( $_this_notification_settings as $notification_name => $notification_setting ) {
				$textarea_tag    = $notification_name . '_smsbody';
				$recipient_tag   = $notification_name . '_recipient';
				$notification    = $_this_notification_settings->$notification_name;
				$textar_tag      = isset( $_POST [ $textarea_tag ] ) ? sanitize_textarea_field( wp_unslash( $_POST [ $textarea_tag ] ) ) : null;
				$sms             = MoUtility::is_blank( $textar_tag ) ? $notification->default_sms_body : $textar_tag;
				$recipient_value = isset( $_POST[ $recipient_tag ] ) ? sanitize_text_field( wp_unslash( $_POST[ $recipient_tag ] ) ) : '';
				$notification    = $_this_notification_settings->$notification_name;
				$notification->set_is_enabled( isset( $_POST[ $notification_name ] ) );
				$notification->set_recipient( $recipient_value );
				$notification->set_sms_body( $sms );
			}
			update_umsn_option( 'notification_settings_option', $_this_notification_settings );
		}



		/**
		 * Unhook all the emails that we will be sending sms notifications for.
		 */
		private function unhook() {
			remove_action( 'um_registration_complete', 'um_send_registration_notification' );
		}


		/** Set Addon Key */
		public function set_addon_key() {
		}

		/** Set AddOn Desc */
		public function set_add_on_desc() {
		}

		/** Set an AddOnName */
		public function set_add_on_name() {
		}

		/** Set an Addon Docs link */
		public function set_add_on_docs() {
			$this->add_on_docs = MoFormDocs::ULTIMATEMEMBER_SMS_NOTIFICATION_LINK['guideLink'];
		}

		/** Set an Addon Video link */
		public function set_add_on_video() {
			$this->add_on_video = MoFormDocs::ULTIMATEMEMBER_SMS_NOTIFICATION_LINK['videoLink'];
		}
		/** Set Settings Page URL */
		public function set_settings_url() {
			$request_uri = '';
			if ( isset( $_SERVER['REQUEST_URI'] ) && is_string( $_SERVER['REQUEST_URI'] ) ) {
				$request_uri = esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) );
			}
		}
	}
}
