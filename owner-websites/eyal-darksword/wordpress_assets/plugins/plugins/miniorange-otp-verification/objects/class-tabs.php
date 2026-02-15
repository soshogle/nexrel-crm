<?php
/**Load Tabs
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'Tabs' ) ) {
	/**
	 * Tabs class
	 *
	 * This final class defines URL identifiers for the plugin's main navigation tabs.
	 */
	final class Tabs {

		/**
		 * Forms tab identifier
		 *
		 * @var string
		 */
		const FORMS = 'forms';

		/**
		 * Notifications tab identifier
		 *
		 * @var string
		 */
		const NOTIFICATIONS = 'notifications';

		/**
		 * Account tab identifier
		 *
		 * @var string
		 */
		const ACCOUNT = 'account';

		/**
		 * OTP Settings tab identifier
		 *
		 * @var string
		 */
		const OTP_SETTINGS = 'otp_settings';

		/**
		 * SMS/Email Configuration tab identifier
		 *
		 * @var string
		 */
		const SMS_EMAIL_CONFIG = 'sms_email_config';

		/**
		 * Messages tab identifier
		 *
		 * @var string
		 */
		const MESSAGES = 'messages';

		/**
		 * Gateway tab identifier
		 *
		 * @var string
		 */
		const GATEWAY = 'gateway';

		/**
		 * Contact Us tab identifier
		 *
		 * @var string
		 */
		const CONTACT_US = 'contact_us';

		/**
		 * Pricing tab identifier
		 *
		 * @var string
		 */
		const PRICING = 'pricing';

		/**
		 * Add-ons tab identifier
		 *
		 * @var string
		 */
		const ADD_ONS = 'addons';


		/**
		 * WhatsApp tab identifier
		 *
		 * @var string
		 */
		const WHATSAPP = 'whatsapp';


		/**
		 * Reporting tab identifier
		 *
		 * @var string
		 */
		const REPORTING = 'transaction_report';

		/**
		 * Custom Message tab identifier
		 *
		 * @var string
		 */
		const CUSTOM_MSG = 'custom_message';
	}
}
