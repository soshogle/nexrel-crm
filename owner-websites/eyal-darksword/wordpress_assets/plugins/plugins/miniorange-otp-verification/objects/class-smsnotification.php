<?php
/**Load Abstract Class SMSNotification
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoPHPSessions;

/**
 * This class is used to define the base class of the SMS Notifications.
 * Each of the SMS Notification class needs to extend this class. They
 * will have to implement the sendSMS function.
 */
if ( ! class_exists( 'SMSNotification' ) ) {
	/**
	 * SMSNotification class
	 *
	 * This abstract class provides the foundation for SMS notification functionality.
	 * It defines common properties and methods that all SMS notification classes
	 * must implement, including the abstract send_sms method.
	 */
	abstract class SMSNotification {

		/**
		 * The settings page associated with the class
		 *
		 * @var string
		 */
		public $page;

		/**
		 * If the notification is enabled or not
		 *
		 * @var bool
		 */
		public $is_enabled;

		/**
		 * The header of the tooltip in the table
		 *
		 * @var string
		 */
		public $tool_tip_header;

		/**
		 * The body of the tooltip in the table
		 *
		 * @var string
		 */
		public $tool_tip_body;

		/**
		 * The recipient of the SMS Notification
		 *
		 * @var string
		 */
		public $recipient;

		/**
		 * The text body of the SMS
		 *
		 * @var string
		 */
		public $sms_body;

		/**
		 * The template name of the WhatsApp SMS
		 *
		 * @var string
		 */
		public $template_name;

		/**
		 * The tags of the WhatsApp SMS
		 *
		 * @var string
		 */
		public $sms_tags;

		/**
		 * The default SMS Body set if no sms
		 * text is explicitly specified
		 *
		 * @var string
		 */
		public $default_sms_body;

		/**
		 * The Title of the page
		 *
		 * @var string
		 */
		public $title;

		/**
		 * The available Tags that can be placed
		 * in the SMS body to dynamically add
		 * values to the messages being sent
		 *
		 * @var string
		 */
		public $available_tags;

		/**
		 * The Header of the Page
		 *
		 * @var string
		 */
		public $page_header;

		/**
		 * The description of the page
		 *
		 * @var string
		 */
		public $page_description;

		/**
		 * This determines who the notification is for: customer / admin / vendor etc.
		 *
		 * @var string
		 */
		public $notification_type;

		/**
		 * Constructor.
		 *
		 * @return void
		 */
		public function __construct() {}

		/**
		 * Abstract method to send SMS
		 *
		 * @param array $args sms object.
		 * @return mixed
		 */
		abstract public function send_sms( array $args );

		/**
		 * Set notification in session
		 *
		 * @param object $notification_type notification object.
		 * @return void
		 */
		public function set_notif_in_session( $notification_type ) {
			MoPHPSessions::add_session_var( 'mo_addon_notif_type', $this->page );
		}

		/**
		 * Setter function for is_enabled variable
		 *
		 * @param mixed $is_enabled check if enabled.
		 * @return SMSNotification
		 */
		public function set_is_enabled( $is_enabled ) {
			$this->is_enabled = $is_enabled;
			return $this;
		}

		/**
		 * Setter function for recipient variable
		 *
		 * @param mixed $recipient sms recipient.
		 * @return SMSNotification
		 */
		public function set_recipient( $recipient ) {
			$this->recipient = $recipient;
			return $this;
		}

		/**
		 * Setter function for sms_body variable
		 *
		 * @param mixed $sms_body sms body.
		 * @return SMSNotification
		 */
		public function set_sms_body( $sms_body ) {
			$this->sms_body = $sms_body;
			return $this;
		}

		/**
		 * Setter function for template_name variable
		 *
		 * @param mixed $template_name template name.
		 * @return SMSNotification
		 */
		public function set_template_name( $template_name ) {
			$this->template_name = $template_name;
			return $this;
		}

		/**
		 * Setter function for sms_tags variable
		 *
		 * @param mixed $sms_tags sms tags.
		 * @return SMSNotification
		 */
		public function set_sms_tags( $sms_tags ) {
			$this->sms_tags = $sms_tags;
			return $this;
		}
	}
}
