<?php
/**Load Interface TabDetails
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoUtility;
use OTP\Traits\Instance;

if ( ! class_exists( 'TabDetails' ) ) {
	/**
	 * TabDetails class
	 *
	 * This final class is used to define the tab details interface functions
	 * that need to be implemented. It manages the main navigation tabs for
	 * the plugin's admin interface, including forms, notifications, settings,
	 * gateway configuration, reporting, WhatsApp integration, add-ons, account
	 * management, and pricing/licensing.
	 */
	final class TabDetails {

		use Instance;

		/**
		 * Array of PluginPageDetails Object detailing
		 * all the page menu options.
		 *
		 * @var array<PluginPageDetails> $tab_details
		 */
		public $tab_details;

		/**
		 * The parent menu slug
		 *
		 * @var string $parent_slug
		 */
		public $parent_slug;

		/**
		 * Private constructor to avoid direct object creation
		 *
		 * Initializes the tab details with all main navigation tabs including
		 * forms, notifications, OTP settings, gateway configuration, reporting,
		 * WhatsApp integration, add-ons, account management, and pricing.
		 *
		 * @return void
		 */
		private function __construct() {
			$registered        = MoUtility::micr();
			$this->parent_slug = 'mosettings';
			$url               = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
			$request_uri       = remove_query_arg( 'addon', $url );

			$this->tab_details = array(
				Tabs::FORMS         => new PluginPageDetails(
					'OTP Verification - Forms',
					$this->parent_slug,
					__( 'Forms', 'miniorange-otp-verification' ),
					__( 'Forms', 'miniorange-otp-verification' ),
					'M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2zm12 1.5H6a.5.5 0 00-.5.5v3h13V6a.5.5 0 00-.5-.5zm.5 5H10v8h8a.5.5 0 00.5-.5v-7.5zm-10 0h-3V18a.5.5 0 00.5.5h2.5v-8z',
					$request_uri,
					'settings.php',
					'MoForms',
					'background:#D8D8D8'
				),
				Tabs::NOTIFICATIONS => new PluginPageDetails(
					'Notifications',
					'monotifications',
					__( 'Notifications', 'miniorange-otp-verification' ),
					__( 'Notifications', 'miniorange-otp-verification' ),
					'M4.455 13.88l-.571-.486.571.486zm.88-2.042l-.745-.084.745.085zm13.33 0l.745-.084-.745.085zm.88 2.042l.571-.486-.572.486zM18.32 8.794l-.745.084.745-.084zm-12.64 0l.745.084-.745-.084zm10.022 10.47a.75.75 0 10-1.404-.527l1.404.526zm-6-.527a.75.75 0 10-1.404.526l1.404-.526zm8.468-2.487H5.83v1.5h12.34v-1.5zm-.595-7.372l.345 3.045 1.49-.169-.344-3.044-1.49.168zM6.08 11.923l.345-3.045-1.49-.168-.345 3.044 1.49.169zm-1.053 2.443c.585-.688.95-1.54 1.053-2.443l-1.49-.169a3.067 3.067 0 01-.706 1.64l1.143.972zm12.893-2.443a4.568 4.568 0 001.053 2.443l1.143-.972a3.066 3.066 0 01-.706-1.64l-1.49.169zM5.83 16.25c-.887 0-1.45-1.122-.803-1.884l-1.143-.972c-1.42 1.67-.306 4.356 1.946 4.356v-1.5zm12.34 1.5c2.252 0 3.365-2.685 1.946-4.356l-1.143.972c.648.762.084 1.884-.803 1.884v1.5zm.896-9.04C18.65 5.045 15.628 2.25 12 2.25v1.5c2.83 0 5.242 2.187 5.575 5.128l1.49-.168zm-12.641.168C6.758 5.937 9.17 3.75 12 3.75v-1.5c-3.628 0-6.65 2.795-7.066 6.46l1.49.168zm7.873 9.859c-.323.86-1.213 1.513-2.298 1.513v1.5c1.685 0 3.152-1.017 3.702-2.487l-1.404-.526zM12 20.25c-1.085 0-1.975-.652-2.298-1.513l-1.404.526c.55 1.47 2.017 2.487 3.702 2.487v-1.5z',
					$request_uri,
					'sms-notifications.php',
					'MoNotifications',
					'background:#D8D8D8'
				),
				Tabs::OTP_SETTINGS  => new PluginPageDetails(
					'OTP Verification - OTP Settings',
					'otpsettings',
					__( 'Settings', 'miniorange-otp-verification' ),
					__( 'Settings', 'miniorange-otp-verification' ),
					'M7.114 8.5H4V7h3.114a2.501 2.501 0 014.772 0H20v1.5h-8.114a2.501 2.501 0 01-4.772 0zM4 17h8.114a2.501 2.501 0 004.771 0H20v-1.5h-3.114a2.501 2.501 0 00-4.771 0H4V17z',
					$request_uri,
					'mosettings.php',
					'MoGeneralSettingsTab',
					'background:#D8D8D8'
				),
				Tabs::GATEWAY       => new PluginPageDetails(
					'OTP Verification - Gateway',
					'mogateway',
					__( 'Gateway Settings', 'miniorange-otp-verification' ),
					__( 'Gateway Settings', 'miniorange-otp-verification' ),
					'M4 20h8v-1.5H4V20zM18.9 3.5c-.6-.6-1.5-.6-2.1 0l-7.2 7.2c-.4-.1-.7 0-1.1.1-.5.2-1.5.7-1.9 2.2-.4 1.7-.8 2.2-1.1 2.7-.1.1-.2.3-.3.4l-.6 1.1H6c2 0 3.4-.4 4.7-1.4.8-.6 1.2-1.4 1.3-2.3 0-.3 0-.5-.1-.7L19 5.7c.5-.6.5-1.6-.1-2.2zM9.7 14.7c-.7.5-1.5.8-2.4 1 .2-.5.5-1.2.8-2.3.2-.6.4-1 .8-1.1.5-.1 1 .1 1.3.3.2.2.3.5.2.8 0 .3-.1.9-.7 1.3z',
					$request_uri,
					'configuration.php',
					'MoGatewayTab',
					'background:#D8D8D8'
				),
				Tabs::REPORTING     => new PluginPageDetails(
					'OTP Verification - Reporting',
					'moreporting',
					__( 'Transaction Report', 'miniorange-otp-verification' ),
					__( 'Transaction Logs', 'miniorange-otp-verification' ),
					'M9.1343 1.02397C9.69638 0.83755 10.3036 0.83755 10.8657 1.02397C11.1583 1.12101 11.4089 1.27492 11.6567 1.4591C11.8931 1.63482 12.1628 1.86604 12.4839 2.14122L12.4839 2.14122L12.503 2.15765C13.0495 2.62605 13.2022 2.74578 13.3557 2.81065C13.5522 2.89369 13.7667 2.92506 13.9788 2.90176C14.1444 2.88356 14.325 2.81257 14.9828 2.52026L17.6954 1.31464C17.9274 1.21153 18.1958 1.23279 18.4087 1.37113C18.6216 1.50947 18.75 1.74612 18.75 2V11.25H18.8H18.8304C19.3646 11.25 19.8104 11.25 20.1747 11.2797C20.5546 11.3108 20.9112 11.3779 21.2485 11.5497C21.7659 11.8134 22.1866 12.2341 22.4503 12.7515C22.6221 13.0888 22.6892 13.4454 22.7203 13.8253C22.75 14.1896 22.75 14.6354 22.75 15.1696V15.2V20C22.75 21.5188 21.5188 22.75 20 22.75H8.4H8.36698C7.27484 22.75 6.40935 22.75 5.71173 22.693C4.99835 22.6347 4.39472 22.5131 3.84355 22.2323C2.94978 21.7769 2.22312 21.0502 1.76772 20.1565C1.48688 19.6053 1.36527 19.0017 1.30699 18.2883C1.24999 17.5907 1.24999 16.7252 1.25 15.633V15.633V15.6V2C1.25 1.74612 1.37844 1.50947 1.59132 1.37113C1.80419 1.23279 2.07261 1.21153 2.3046 1.31464L5.01725 2.52026C5.67495 2.81257 5.85557 2.88356 6.0212 2.90176C6.23327 2.92506 6.44777 2.89369 6.64429 2.81065C6.79777 2.74578 6.9505 2.62605 7.49696 2.15765L7.5161 2.14125C7.83714 1.86606 8.1069 1.63483 8.34333 1.4591C8.59113 1.27492 8.84172 1.12101 9.1343 1.02397ZM20 21.25C20.6904 21.25 21.25 20.6904 21.25 20V15.2C21.25 14.6276 21.2494 14.2434 21.2252 13.9475C21.2018 13.6604 21.1599 13.5231 21.1138 13.4325C20.9939 13.1973 20.8027 13.0061 20.5675 12.8862C20.4769 12.8401 20.3396 12.7982 20.0525 12.7748C19.7566 12.7506 19.3724 12.75 18.8 12.75H18.75V20C18.75 20.6904 19.3096 21.25 20 21.25ZM17.5499 21.25H8.4C7.26752 21.25 6.46327 21.2494 5.83388 21.198C5.21325 21.1473 4.829 21.0509 4.52453 20.8958C3.913 20.5842 3.41582 20.087 3.10423 19.4755C2.94909 19.171 2.85271 18.7867 2.80201 18.1661C2.75058 17.5367 2.75 16.7325 2.75 15.6V3.15407L4.40804 3.89098L4.50051 3.93213C5.02099 4.16393 5.42922 4.34575 5.85739 4.39279C6.32394 4.44405 6.79584 4.37504 7.22818 4.19234C7.62494 4.02467 7.96403 3.73357 8.39634 3.36244L8.47315 3.29654C8.81834 3.00066 9.04856 2.80388 9.23813 2.66298C9.421 2.52706 9.52574 2.47449 9.6065 2.44771C9.86199 2.36297 10.138 2.36297 10.3935 2.44771C10.4743 2.47449 10.579 2.52706 10.7619 2.66298C10.9514 2.80388 11.1817 3.00066 11.5269 3.29654L11.6037 3.36244C12.036 3.73357 12.3751 4.02467 12.7718 4.19234C13.2042 4.37504 13.6761 4.44405 14.1426 4.39279C14.5708 4.34575 14.979 4.16393 15.4995 3.93213L15.592 3.89098L17.25 3.15407V12V20C17.25 20.4501 17.3581 20.875 17.5499 21.25ZM6.25 9C6.25 8.58579 6.58579 8.25 7 8.25H11C11.4142 8.25 11.75 8.58579 11.75 9C11.75 9.41421 11.4142 9.75 11 9.75H7C6.58579 9.75 6.25 9.41421 6.25 9ZM9.25 13C9.25 12.5858 9.58579 12.25 10 12.25H13C13.4142 12.25 13.75 12.5858 13.75 13C13.75 13.4142 13.4142 13.75 13 13.75H10C9.58579 13.75 9.25 13.4142 9.25 13ZM10 16.25C9.58579 16.25 9.25 16.5858 9.25 17C9.25 17.4142 9.58579 17.75 10 17.75H13C13.4142 17.75 13.75 17.4142 13.75 17C13.75 16.5858 13.4142 16.25 13 16.25H10ZM8 13C8 13.5523 7.55229 14 7 14C6.44772 14 6 13.5523 6 13C6 12.4477 6.44772 12 7 12C7.55229 12 8 12.4477 8 13ZM7 18C7.55229 18 8 17.5523 8 17C8 16.4477 7.55229 16 7 16C6.44772 16 6 16.4477 6 17C6 17.5523 6.44772 18 7 18Z',
					$request_uri,
					'moreport.php',
					'MoReportTab',
					'background:#d4e21ee0'
				),
				Tabs::WHATSAPP      => new PluginPageDetails(
					'OTP Verification - WhatsApp',
					'mowhatsapp',
					__( 'WhatsApp', 'miniorange-otp-verification' ),
					__( 'WhatsApp', 'miniorange-otp-verification' ),
					'M12 3a9 9 0 00-9 9c0 1.75.51 3.37 1.37 4.75l-1.08 3.53c-.08.27 0 .55.19.75.19.2.49.27.75.19l3.78-1.16.006-.002A8.962 8.962 0 0012 21a9 9 0 000-18zM6.01 16.5c-.41-.55-.76-1.15-1.01-1.81v-.02c-.33-.83-.5-1.74-.5-2.68C4.5 7.86 7.86 4.5 12 4.5c4.14 0 7.5 3.36 7.5 7.5 0 4.14-3.36 7.5-7.5 7.5a7.6 7.6 0 01-1.59-.19l-.015.005a7.375 7.375 0 01-2.215-.875v-.01l-1.84.56-1.21.37.36-1.16.52-1.7zm2.14-8.54a.89.89 0 01.63-.27l.01-.02c.083 0 .163.003.24.005.072.003.142.005.21.005.17.01.35.02.52.4.11.241.289.688.438 1.06.123.305.225.56.252.61.05.11.09.24.01.39l-.028.054c-.063.12-.107.202-.212.316-.04.043-.081.09-.122.137a3.417 3.417 0 01-.247.262c-.108.107-.228.227-.101.451.13.22.59.96 1.27 1.57a6.162 6.162 0 001.692 1.072c.07.032.127.057.168.078.23.12.37.1.51-.05.13-.14.59-.64.75-.86.16-.22.32-.18.53-.1.21.08 1.35.64 1.58.76l.133.068c.155.078.26.13.307.202.05.09.04.54-.16 1.06-.21.52-1.17 1.01-1.6 1.04a5.012 5.012 0 00-.124.01c-.397.038-.893.085-2.666-.62-2.2-.876-3.617-2.986-3.889-3.39a2.432 2.432 0 00-.051-.074c-.144-.195-.92-1.246-.9-2.316.019-1.035.56-1.565.807-1.808l.043-.042z',
					$request_uri,
					'mowhatsapp.php',
					'MoWhatsAppTab',
					'background:#a2ec3b'
				),
				Tabs::ADD_ONS       => new PluginPageDetails(
					'OTP Verification - Add Ons',
					'addon',
					__( 'AddOns', 'miniorange-otp-verification' ),
					__( 'AddOns', 'miniorange-otp-verification' ),
					'M6 5.5h3a.5.5 0 01.5.5v3a.5.5 0 01-.5.5H6a.5.5 0 01-.5-.5V6a.5.5 0 01.5-.5zM4 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm11-.5h3a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5V6a.5.5 0 01.5-.5zM13 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V6zm5 8.5h-3a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5zM15 13a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2v-3a2 2 0 00-2-2h-3zm-9 1.5h3a.5.5 0 01.5.5v3a.5.5 0 01-.5.5H6a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5zM4 15a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3z',
					$request_uri,
					'add-on.php',
					'MoAddOnsTab',
					'background:orange'
				),
				Tabs::ACCOUNT       => new PluginPageDetails(
					'OTP Verification - Accounts',
					'otpaccount',
					! $registered ? 'Account Setup' : 'User Profile',
					! $registered ? 'Account Setup' : 'Profile',
					'M7.25 16.437a6.5 6.5 0 119.5 0V16A2.75 2.75 0 0014 13.25h-4A2.75 2.75 0 007.25 16v.437zm1.5 1.193a6.47 6.47 0 003.25.87 6.47 6.47 0 003.25-.87V16c0-.69-.56-1.25-1.25-1.25h-4c-.69 0-1.25.56-1.25 1.25v1.63zM4 12a8 8 0 1116 0 8 8 0 01-16 0zm10-2a2 2 0 11-4 0 2 2 0 014 0z',
					$request_uri,
					'account.php',
					'MoAccount',
					'',
				),
				Tabs::PRICING       => new PluginPageDetails(
					'OTP Verification - License',
					'mootppricing',
					"<span style='color:#97b6e5;font-weight:bold'>" . __( 'Licensing Plans', 'miniorange-otp-verification' ) . '</span>',
					__( 'Licensing Plans', 'miniorange-otp-verification' ),
					'M9.519 8.783a.25.25 0 00.188-.137l2.069-4.192a.25.25 0 01.448 0l2.069 4.192a.25.25 0 00.188.137l4.626.672a.25.25 0 01.139.426l-3.348 3.263a.25.25 0 00-.072.222l.79 4.607a.25.25 0 01-.362.263l-4.138-2.175a.25.25 0 00-.232 0l-4.138 2.175a.25.25 0 01-.363-.263l.79-4.607a.25.25 0 00-.071-.222L4.754 9.881a.25.25 0 01.139-.426l4.626-.672zM12 14.533c.28 0 .56.066.814.2l1.896.997-.362-2.11a1.75 1.75 0 01.503-1.55l1.534-1.495-2.12-.308a1.75 1.75 0 01-1.317-.957L12 7.39v7.142z',
					$request_uri,
					'pricing.php',
					'upgradeTab',
					'background:#D8D8D8',
					false
				),
			);
		}
	}
}
