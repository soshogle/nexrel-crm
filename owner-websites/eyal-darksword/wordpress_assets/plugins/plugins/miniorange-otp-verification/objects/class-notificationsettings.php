<?php
/**Load Interface NotificationSettings
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'NotificationSettings' ) ) {
	/**
	 * This class is used to generate notification settings
	 * specific to email or sms settings. These settings are then passed
	 * to the cURL function to send notifications.
	 */
	class NotificationSettings {

		/**
		 * Variable declaration
		 *
		 * @var string
		 */
		public $send_sms;

		/**
		 * Variable declaration
		 *
		 * @var string
		 */
		public $send_email;

		/**
		 * Variable declaration
		 *
		 * @var string
		 */
		public $phone_number;

		/**
		 * Variable declaration
		 *
		 * @var string
		 */
		public $from_email;

		/**
		 * Variable declaration
		 *
		 * @var string
		 */
		public $from_name;

		/**
		 * Variable declaration
		 *
		 * @var string
		 */
		public $to_email;

		/**
		 * Variable declaration
		 *
		 * @var string
		 */
		public $to_name;

		/**
		 * Variable declaration
		 *
		 * @var string
		 */
		public $subject;

		/**
		 * Variable declaration
		 *
		 * @var string
		 */
		public $bcc_email;

		/**
		 * Variable declaration
		 *
		 * @var string
		 */
		public $message;

		/**
		 * Constructor.
		 *
		 * @param string $phone_number Phone number for SMS notifications.
		 * @param string $message Message content for SMS notifications.
		 * @param string $from_email From email for email notifications.
		 * @param string $from_name From name for email notifications.
		 * @param string $to_email To email for email notifications.
		 */
		public function __construct( $phone_number = '', $message = '', $from_email = '', $from_name = '', $to_email = '' ) {
			if ( ! empty( $phone_number ) && ! empty( $message ) ) {
				$this->create_sms_notification_settings( $phone_number, $message );
			} elseif ( ! empty( $from_email ) && ! empty( $from_name ) && ! empty( $to_email ) ) {
				$this->create_email_notification_settings(
					$from_email,
					$from_name,
					$to_email,
					'',
					$message
				);
			}
		}

		/**
		 * Create Phone notification settings
		 *
		 * @param string $phone_number phone number.
		 * @param string $message message to send.
		 * @return void
		 */
		public function create_sms_notification_settings( $phone_number, $message ) {
			$this->send_sms     = true;
			$this->phone_number = $phone_number;
			$this->message      = $message;
		}

		/**
		 * Create Email notification settings
		 *
		 * @param string $from_email from email param.
		 * @param string $from_name from name param.
		 * @param string $to_email to email param.
		 * @param string $subject subject of notification.
		 * @param string $message message content.
		 * @return void
		 */
		public function create_email_notification_settings( $from_email, $from_name, $to_email, $subject, $message ) {
			$this->send_email = true;
			$this->from_email = $from_email;
			$this->from_name  = $from_name;
			$this->to_email   = $to_email;
			$this->to_name    = $to_email;
			$this->subject    = $subject;
			$this->bcc_email  = '';
			$this->message    = $message;
		}
	}
}
