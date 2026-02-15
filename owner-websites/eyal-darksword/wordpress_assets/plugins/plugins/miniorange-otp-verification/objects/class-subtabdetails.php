<?php
/**Load Abstract Class SubTabDetails
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoUtility;
use OTP\Traits\Instance;

/**
 * Subtab details class.
 */
if ( ! class_exists( 'SubTabDetails' ) ) {
	/**
	 * SubTabDetails class
	 *
	 * This final class manages the configuration and details of subtabs
	 * for the plugin's admin interface. It handles settings, notifications,
	 * and general subtab configurations using the Singleton pattern.
	 */
	final class SubTabDetails {

		use Instance;

		/**
		 * Array of SubtabPageDetails Object detailing
		 * all the page menu options.
		 *
		 * @var array
		 */
		public $sub_tab_details;

		/**
		 * Array of SubtabPageDetails Object detailing
		 * all the page menu options.
		 *
		 * @var array
		 */
		public $settings_sub_tab_details;

		/**
		 * Array of SubtabPageDetails Object detailing
		 * all the page menu options.
		 *
		 * @var array
		 */
		public $notification_sub_tab_details;

		/**
		 * The parent menu slug
		 *
		 * @var string
		 */
		public $parent_slug;

		/**
		 * Private constructor to avoid direct object creation.
		 *
		 * Initializes the subtab configuration with settings and notification
		 * subtabs for various integrations like WooCommerce, Ultimate Member,
		 * Dokan, WCFM, and Forms.
		 *
		 * @return void
		 */
		private function __construct() {
			$registered        = MoUtility::micr();
			$this->parent_slug = 'mosettings';

			$this->settings_sub_tab_details = array(
				SubTabs::MO_GENERAL_SETTINGS => new SubtabPageDetails(
					'General Settings',
					__( 'General Settings', 'miniorange-otp-verification' ),
					__( 'General Settings', 'miniorange-otp-verification' ),
					'general-settings.php',
					'generalSettingsSubTab',
					'background:#D8D8D8'
				),
				SubTabs::MO_OTP_SETTINGS     => new SubtabPageDetails(
					'OTP Settings',
					__( 'OTP Settings', 'miniorange-otp-verification' ),
					__( 'OTP Settings', 'miniorange-otp-verification' ),
					'otpsettings.php',
					'otpSettingsSubTab',
					'background:#D8D8D8'
				),
				SubTabs::MO_MESSAGE_BOX      => new SubtabPageDetails(
					'OTP Verification - Messages',
					__( 'Edit Messages', 'miniorange-otp-verification' ),
					__( 'Edit Messages', 'miniorange-otp-verification' ),
					'messages.php',
					'messagesSubTab',
					'background:#D8D8D8'
				),
				SubTabs::MO_POPUP_DESIGN     => new SubtabPageDetails(
					'OTP Verification - Design',
					__( 'Pop-Up Design', 'miniorange-otp-verification' ),
					__( 'Pop-Up Design', 'miniorange-otp-verification' ),
					'design.php',
					'popDesignSubTab',
					'background:#D8D8D8'
				),
			);

			$this->notification_sub_tab_details = array(
				SubTabs::MO_WC_NOTIF    => new SubtabPageDetails(
					'MoNotifications',
					__( 'WooCommerce', 'miniorange-otp-verification' ),
					__( 'WooCommerce', 'miniorange-otp-verification' ),
					'sms-notifications.php',
					'MowcNotifSubTab',
					'background:#D8D8D8'
				),
				SubTabs::MO_UM_NOTIF    => new SubtabPageDetails(
					'MoNotifications',
					__( 'Ultimate Member', 'miniorange-otp-verification' ),
					__( 'Ultimate Member', 'miniorange-otp-verification' ),
					'sms-notifications.php',
					'MoumNotifSubTab',
					'background:#D8D8D8'
				),
				SubTabs::MO_DOKAN_NOTIF => new SubtabPageDetails(
					'Dokan Notifications',
					__( 'Dokan', 'miniorange-otp-verification' ),
					__( 'Dokan', 'miniorange-otp-verification' ),
					'sms-notifications.php',
					'dokanNotifSubTab',
					'background:#D8D8D8'
				),
				SubTabs::MO_WCFM_NOTIF  => new SubtabPageDetails(
					'WCFM Notifications',
					__( 'WCFM', 'miniorange-otp-verification' ),
					__( 'WCFM', 'miniorange-otp-verification' ),
					'sms-notifications.php',
					'wcfmNotifSubTab',
					'background:#D8D8D8'
				),
				SubTabs::MO_FORM_NOTIF  => new SubtabPageDetails(
					'MoNotifications',
					__( 'Forms', 'miniorange-otp-verification' ),
					__( 'Forms', 'miniorange-otp-verification' ),
					'sms-notifications.php',
					'formNotifSubTab',
					'background:#D8D8D8'
				),
			);

			$this->sub_tab_details = array(
				'otpsettings'     => $this->settings_sub_tab_details,
				'monotifications' => $this->notification_sub_tab_details,
			);
		}
	}
}
