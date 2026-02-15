<?php
/**Load Interface SubTabs
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Subtabs class.
 */
if ( ! class_exists( 'SubTabs' ) ) {
	/**
	 * SubTabs class
	 *
	 * This final class defines constants for various subtab identifiers
	 * used throughout the plugin's admin interface. It provides a centralized
	 * location for managing subtab names and ensures consistency across
	 * the plugin's navigation system.
	 */
	final class SubTabs {

		/**
		 * OTP settings subtab identifier
		 *
		 * @var string
		 */
		const MO_OTP_SETTINGS = 'otp_settings';

		/**
		 * General settings subtab identifier
		 *
		 * @var string
		 */
		const MO_GENERAL_SETTINGS = 'general_settings';

		/**
		 * Message box subtab identifier
		 *
		 * @var string
		 */
		const MO_MESSAGE_BOX = 'message_box';

		/**
		 * Popup design subtab identifier
		 *
		 * @var string
		 */
		const MO_POPUP_DESIGN = 'popup_design';

		/**
		 * Ultimate Member notification subtab identifier
		 *
		 * @var string
		 */
		const MO_UM_NOTIF = 'um_notification';

		/**
		 * WooCommerce notification subtab identifier
		 *
		 * @var string
		 */
		const MO_WC_NOTIF = 'wc_notification';

		/**
		 * Reporting subtab identifier
		 *
		 * @var string
		 */
		const MO_REPORTING = 'reporting';

		/**
		 * Dokan vendor notifications subtab identifier
		 *
		 * @var string
		 */
		const MO_DOKAN_NOTIF = 'dokan_vendor_notifications';

		/**
		 * WCFM vendor notifications subtab identifier
		 *
		 * @var string
		 */
		const MO_WCFM_NOTIF = 'wcfm_vendor_notifications';

		/**
		 * Form notification subtab identifier
		 *
		 * @var string
		 */
		const MO_FORM_NOTIF = 'form_notification';
	}
}
