<?php
/**
 * Load administrator changes for MoUtility
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Traits\Instance;
use OTP\Objects\BaseMessages;
use OTP\MoInit;

/**
 * This class is to enable Visual Tour and all its functions
 */
if ( ! class_exists( 'MOVisualTour' ) ) {
	/**
	 * MOVisualTour class
	 */
	class MOVisualTour {

		use Instance;

		/** Variable declaration
		 *
		 * @var $nonce
		 */
		protected $nonce;
		/** Variable declaration
		 *
		 * @var $nonce_key
		 */
		protected $nonce_key;
		/** Variable declaration
		 *
		 * @var $tour_ajax_action
		 */
		protected $tour_ajax_action;

		/**Constructor
		 **/
		protected function __construct() {
			$this->nonce            = 'mo_admin_actions';
			$this->nonce_key        = 'security';
			$this->tour_ajax_action = 'miniorange-tour-taken';
			add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_visual_tour_script' ) );
			add_action( "wp_ajax_{$this->tour_ajax_action}", array( $this, 'update_tour_taken' ) );
		}

		/**
		 * Adds TourTaken variable in Options for the page that has tour completed
		 *
		 * @return void
		 */
		public function update_tour_taken() {
			// Security: Use hardcoded nonce action 'mo_admin_actions' instead of variable.
			if ( ! check_ajax_referer( 'mo_admin_actions', 'security', false ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( BaseMessages::INVALID_OP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
			if ( ! current_user_can( 'manage_options' ) ) {
				return;
			}
			$page_id   = isset( $_POST['pageID'] ) ? sanitize_text_field( wp_unslash( $_POST['pageID'] ) ) : null;
			$done_tour = isset( $_POST['pageID'] ) ? sanitize_text_field( wp_unslash( $_POST['pageID'] ) ) : null;

			update_mo_option( 'tourTaken_' . $page_id, $done_tour );
		}

		/**
		 * Checks if the request made is a valid ajax request or not.
		 * Only checks the none value for now.
		 *
		 * @return void
		 */
		protected function validate_ajax_request() {
			// Security: Use hardcoded nonce action 'mo_admin_actions' and key 'security' instead of variables.
			if ( ! check_ajax_referer( 'mo_admin_actions', 'security', false ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_OP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}

		/**
		 * Function called by Enqueue Hook to register and localize the script and
		 * script variables.
		 *
		 * @return void
		 */
		public function enqueue_visual_tour_script() {
			wp_register_script( 'tourScript', MOV_URL . 'includes/js/visualTour.js?version=' . MOV_VERSION, array( 'jquery' ), MOV_VERSION, false );
			$page        = MoUtility::get_current_page_parameter_value( 'page', '' );
			$path        = ! empty( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
			$query_str   = wp_parse_url( $path, PHP_URL_QUERY );
			$current_get = array();
			if ( $query_str ) {
				parse_str( $query_str, $query_params );
				$current_get = MoUtility::mo_sanitize_array( $query_params );
				unset( $query_params );
			}
			wp_localize_script(
				'tourScript',
				'moTour',
				array(
					'siteURL'     => wp_ajax_url(),
					'currentPage' => $current_get,
					'tnonce'      => wp_create_nonce( $this->nonce ),
					'pageID'      => $page,
					'tourData'    => $this->get_tour_data( $page ),
					'tourTaken'   => get_mo_option( 'tourTaken_' . $page ),
					'ajaxAction'  => $this->tour_ajax_action,
					'nonceKey'    => wp_create_nonce( $this->nonce_key ),
				)
			);
			wp_enqueue_script( 'tourScript' );
			wp_enqueue_style( 'mo_visual_tour_style', MOV_URL . 'includes/css/mo-card.css', '', MOV_VERSION );
		}

		/**
		 * Tour Data Template
		 *
		 * @param string $target_e        -   jQuery Selector for the target element.
		 * @param string $point_to_sale    -   the direction to point. place the card on the other side.
		 * @param string $titile_html      -   Title of the card, can be string, HTML or empty.
		 * @param string $content_html    -   Description of the card, can be string, HTML or empty.
		 * @param string $button_html     -   text on the Next Button.
		 * @param string $img            -   image name.
		 * @param int    $size           -    size of the card, 0=small, 1=medium, 2=big.
		 * @return array    -   Tour card array
		 */
		public function tour_template( $target_e, $point_to_sale, $titile_html, $content_html, $button_html, $img, $size ) {
			$card_size = array( 'small', 'medium', 'big' );
			return array(
				'targetE'     => $target_e,
				'pointToSide' => $point_to_sale,
				'titleHTML'   => $titile_html,
				'contentHTML' => $content_html,
				'buttonText'  => $button_html,
				'img'         => $img ? MOV_URL . 'includes/images/tourIcons/' . $img : $img,
				'cardSize'    => $card_size[ $size ],
			);
		}


		/**
		 * This functions return the array containing the tour elements for the current page
		 *
		 * @param  string $page_id  current page/tab.
		 * @return array tour data for current tab.
		 */
		public function get_tour_data( $page_id ) {

			$tour_data = array(
				'mosettings'      => $this->get_main_page_pointers(),
				'otpsettings'     => $this->get_general_settings_pointers(),
				'monotifications' => $this->get_notification_settings_pointers(),
				'mogateway'       => $this->get_gateway_settings_pointers(),
				'moreporting'     => $this->get_reporting_pointers(),
				'addon'           => $this->get_addon_page_pointers(),
				'mootppricing'    => $this->get_pricing_page_pointers(),
			);

			$tabs = $this->get_tabs_pointers();
			if ( ! get_mo_option( 'tourTaken_mosettings' ) ) {
				$tour_data['mosettings'] = array_merge( $tour_data['mosettings'], $tabs );
			}
			return MoUtility::sanitize_check( $page_id, $tour_data );
		}

		/**
		 * This functions return the array containing the tab details for the current page
		 *
		 * @return array tab data for current tab.
		 */
		private function get_tabs_pointers() {
			return array(
				$this->tour_template(
					'MoNotifications',
					'left',
					'<h1>' . esc_html__( 'Notifications', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to enable SMS Notifications.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'emailSmsTemplate.svg',
					1
				),

				$this->tour_template(
					'MoGeneralSettingsTab',
					'left',
					'<h1>' . esc_html__( 'Settings', 'miniorange-otp-verification' ) . '</h1>',
					wp_kses_post(
						sprintf(
							/* translators: 1: <br> tag */
							__( 'Click here to update settings like: OTP Settings, %1$s Comman Messages, etc.', 'miniorange-otp-verification' ),
							'<br>'
						)
					),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'settingsTab.svg',
					1
				),

				$this->tour_template(
					'MoGatewayTab',
					'left',
					'<h1>' . esc_html__( 'Gateway Settings', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to setup your SMS or Email Gateway.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'help.svg',
					1
				),

				$this->tour_template(
					'MoReportTab',
					'left',
					'<h1>' . esc_html__( 'Transaction Logs', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to check the SMS and Email transactions logs', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'drop-down-list.svg',
					1
				),

				$this->tour_template(
					'MoWhatsAppTab',
					'left',
					'<h1>' . esc_html__( 'WhatsApp', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to check the WhatsApp OTP & Notification integrations.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'whatsApp.svg',
					1
				),

				$this->tour_template(
					'MoAddOnsTab',
					'left',
					'<h1>' . esc_html__( 'AddOns', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Check out our cool AddOns here.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'addOnSetting.svg',
					1
				),

				$this->tour_template(
					'MoAccount',
					'left',
					'<h1>' . esc_html__( 'Profile', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Register/Login here to get started.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'profile.svg',
					1
				),

				$this->tour_template(
					'LicensingPlanButton',
					'left',
					'<h1>' . esc_html__( 'Licensing Plans', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Check our cool Plans for everyone here.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'upgrade.svg',
					1
				),

				$this->tour_template(
					'faqButton',
					'left',
					'<h1>' . esc_html__( 'Any Questions?', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Check our FAQ page for more information.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'faq.svg',
					1
				),

				$this->tour_template(
					'demoButton',
					'left',
					'<h1>' . esc_html__( 'Need a Demo?', 'miniorange-otp-verification' ) . '</h1>',
					wp_kses_post(
						sprintf(
							/* translators: 1: <br> tag */
							__( 'Facing difficulty while using the plugin?%1$s Click here to request a demo of the plugin. ', 'miniorange-otp-verification' ),
							'<br>'
						)
					),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'help.svg',
					1
				),

				$this->tour_template(
					'mo_contact_us',
					'down',
					'<h1>' . esc_html__( 'Any Queries?', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to leave us an email.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'help.svg',
					1
				),

				$this->tour_template(
					'restart_tour_button',
					'right',
					'<h1>' . esc_html__( 'Thank You!', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to Restart the Tour for current tab.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'replay.svg',
					1
				),
			);
		}

		/**
		 * This functions return the array containing the main page details
		 *
		 * @return array tab data for starting page.
		 */
		private function get_main_page_pointers() {
			return array(
				$this->tour_template(
					'',
					'',
					'<h1>' . esc_html__( 'WELCOME!', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Fasten your seat belts for a quick ride.', 'miniorange-otp-verification' ),
					esc_html__( 'Let\'s Go!', 'miniorange-otp-verification' ),
					'startTour.svg',
					2
				),

				$this->tour_template(
					'MoForms',
					'left',
					'<br>',
					wp_kses_post(
						sprintf(
							/* translators: 1: <br> tag */
							__( 'This is the Form settings page.%1$sEnable/Disable OTP verification for your forms here.', 'miniorange-otp-verification' ),
							'<br>'
						)
					),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'formSettings.svg',
					1
				),

				$this->tour_template(
					'searchForm',
					'up',
					'<br>',
					wp_kses_post(
						sprintf(
							/* translators: 1: <br> tag, 2: <br> tag */
							__( 'Type here to find your form.%1$s', 'miniorange-otp-verification' ),
							'<br>'
						)
					),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'searchForm.svg',
					1
				),

				$this->tour_template(
					'formList',
					'right',
					'<br>',
					wp_kses_post(
						sprintf(
							/* translators: 1: <br> tag */
							__( 'Select your form from the list%1$s', 'miniorange-otp-verification' ),
							'<br>'
						)
					),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'choose.svg',
					1
				),
			);
		}

		/**
		 * This functions return the array containing the General otp settings page details
		 *
		 * @return array tab data for otp settings page.
		 */
		private function get_general_settings_pointers() {
			return array(

				$this->tour_template(
					'generalSettingsSubTab',
					'up',
					'<h1>' . esc_html__( 'General Settings', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to Enable general settings.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'settingsTab.svg',
					1
				),

				$this->tour_template(
					'otpSettingsSubTab',
					'up',
					'<h1>' . esc_html__( 'OTP Settings', 'miniorange-otp-verification' ) . '</h1>',
					wp_kses_post(
						sprintf(
							/* translators: 1: <br> tag, 2: <br> tag */
							__( 'Click here to enable OTP settings like %1$s SMS/Email Templates %2$s OTP Properties.', 'miniorange-otp-verification' ),
							'<br>',
							'<br>'
						)
					),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'emailSmsTemplate.svg',
					1
				),

				$this->tour_template(
					'messagesSubTab',
					'up',
					'<h1>' . esc_html__( 'Edit Messages', 'miniorange-otp-verification' ) . '</h1>',
					wp_kses_post(
						sprintf(
							/* translators: 1: <br> tag, 2: <br> tag */
							__( 'Click here to edit common messages like %1$s SMS/Email sent message %2$s Invalid OTP message.', 'miniorange-otp-verification' ),
							'<br>',
							'<br>'
						)
					),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'allMessages.svg',
					1
				),

				$this->tour_template(
					'popDesignSubTab',
					'up',
					'<h1>' . esc_html__( 'Pop-up Design', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to edit the Pop-up in the plugin.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'design.svg',
					1
				),

				$this->tour_template(
					'country_code_settings',
					'up',
					'<h1>' . esc_html__( 'Country Code', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Set your default Country Code here.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'flag.svg',
					1
				),

				$this->tour_template(
					'dropdownEnable',
					'up',
					'<br>',
					esc_html__( 'Enable this to show country code drop down in the Phone field of the Form.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'drop-down-list.svg',
					1
				),

				$this->tour_template(
					'blockedEmailList',
					'right',
					'<h1>' . esc_html__( 'Blocked Email Domains', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Add the list of Email Ids you wish to block.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'blockedEmail.svg',
					1
				),

				$this->tour_template(
					'blockedPhoneList',
					'right',
					'<h1>' . esc_html__( 'Blocked Phone Numbers', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Add the list of Phone numbers you wish to block.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'blockPhone.svg',
					1
				),

				$this->tour_template(
					'globallyBannedPhone',
					'right',
					'<h1>' . esc_html__( 'Block Globally Banned Phone Numbers', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Enable this to block the Globally banned Phone Numbers.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'blockPhone.svg',
					1
				),
			);
		}


		/**
		 * This functions return the array containing the Notification settings page details
		 *
		 * @return array tab data for Notification settings page.
		 */
		private function get_notification_settings_pointers() {
			return array(
				$this->tour_template(
					'MowcNotifSubTab',
					'up',
					'<h1>' . esc_html__( 'WooCommerce Notifications', 'miniorange-otp-verification' ) . '</h1>',
					'<br>' . esc_html__( 'Enable WooCommerce Notifications for the Order status updates', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'messages.svg',
					1
				),

				$this->tour_template(
					'MoumNotifSubTab',
					'up',
					'<h1>' . esc_html__( 'Ultimate Member Notifications', 'miniorange-otp-verification' ) . '</h1>',
					'<br>' . esc_html__( 'Enable Ultimate Member Notifications for Admins and Customers', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'messages.svg',
					1
				),

				$this->tour_template(
					'dokanNotifSubTab',
					'up',
					'<h1>' . esc_html__( 'Dokan Notifications', 'miniorange-otp-verification' ) . '</h1>',
					'<br>' . esc_html__( 'Enable Dokan Vendor Notifications here.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'messages.svg',
					1
				),

				$this->tour_template(
					'wcfmNotifSubTab',
					'up',
					'<h1>' . esc_html__( 'WCFM Notifications', 'miniorange-otp-verification' ) . '</h1>',
					'<br>' . esc_html__( 'Enable WCFM (WooCommerce Frontend Manager Plugins) Notifications here.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'messages.svg',
					1
				),

				$this->tour_template(
					'formNotifSubTab',
					'up',
					'<h1>' . esc_html__( 'Forms Notifications', 'miniorange-otp-verification' ) . '</h1>',
					'<br>' . esc_html__( 'Enable Notifications on submission of forms.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'messages.svg',
					1
				),

				$this->tour_template(
					'customMsgSubTab',
					'up',
					'<h1>' . esc_html__( 'Quick Send', 'miniorange-otp-verification' ) . '</h1>',
					'<br>' . esc_html__( 'Send Custom SMS & Email Notifications to your customers.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'messages.svg',
					1
				),
			);
		}



		/**
		 * This functions return the array containing the gateway page pointers
		 *
		 * @return array tab data for gateway settings page.
		 */
		private function get_gateway_settings_pointers() {
			$gateway_fn = GatewayFunctions::instance();
			return $gateway_fn->get_config_page_pointers();
		}

		/**
		 * This functions return the array containing the Transaction log page pointers
		 *
		 * @return array tab data for transaction log page.
		 */
		private function get_reporting_pointers() {
			return array(
				$this->tour_template(
					'mo_transaction_report',
					'right',
					'<h1>' . esc_html__( 'Generate Report', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to Generate the report within selected date range.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'notepad.svg',
					1
				),
				$this->tour_template(
					'mo_delete_transaction_report',
					'up',
					'<h1>' . esc_html__( 'Clear Database', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to delete the previous database entries for the Transaction logs.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'delete.svg',
					1
				),
				$this->tour_template(
					'mo_download_transaction_report',
					'up',
					'<h1>' . esc_html__( 'Download Report', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to download the transaction reports.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'downloadFile.svg',
					1
				),
			);
		}

		/**
		 * This functions return the array containing the WhatsApp page pointers
		 *
		 * @return array tab data for WhatsApp page.
		 */
		private function get_whatsapp_pointers() {
			return array(
				$this->tour_template(
					'test_whatsapp_otp',
					'right',
					'<h1>' . esc_html__( 'Test WhatsApp', 'miniorange-otp-verification' ) . '</h1>',
					wp_kses_post(
						sprintf(
							/* translators: 1: <br> tag, 2: <br> tag */
							__( 'Click here to test the WhatsApp OTP.%1$s%2$sYou must be registered with miniOrange account to test the WhatsApp OTP.', 'miniorange-otp-verification' ),
							'<br>',
							'<br>'
						)
					),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'mowhatsapp.png',
					1
				),
				$this->tour_template(
					'whatsapp_pricing_plans',
					'up',
					'<h1>' . esc_html__( 'WhatsApp Plans', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Check out our WhatsApp plans and feature list here.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'downloadFile.svg',
					1
				),
			);
		}


		/**
		 * This functions return the array containing the Pricing page pointers
		 *
		 * @return array tab data for pricing page.
		 */
		private function get_pricing_page_pointers() {
			return array(
				$this->tour_template(
					'mo_select_gateway_type_div',
					'down',
					'<h1>' . esc_html__( 'Gateway', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Choose the SMS Gateway you wish to use and select the best suitable plan for you.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'choose.svg',
					1
				),
				$this->tour_template(
					'pricing_plans_div',
					'down',
					'<h1>' . esc_html__( 'Pricing Plans', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Check out our cool pricing plans based on your gateway selelction here.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'upgrade.svg',
					1
				),
			);
		}

		/**
		 * This functions return the array containing the addon settings page pointers
		 *
		 * @return array tab data for addon settings page.
		 */
		private function get_addon_page_pointers() {
			return array(
				$this->tour_template(
					'addOnsTable',
					'right',
					'<h1>' . esc_html__( 'AddOns', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Check out our cool AddOns here.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'addOns.svg',
					1
				),
			);
		}

		/**
		 * This functions return the array containing the account settings page pointers
		 *
		 * @return array tab data for account settings page.
		 */
		private function gte_account_page_pointers() {
			return array(
				$this->tour_template(
					'check_btn',
					'right',
					'<h1>' . esc_html__( 'Check Licence', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( "Don't forget to check your Licence here After Upgrade.", 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'account.svg',
					2
				),
				$this->tour_template(
					'remove_accnt',
					'right',
					'<h1>' . esc_html__( 'Log Out', 'miniorange-otp-verification' ) . '</h1>',
					esc_html__( 'Click here to Logout your current account.', 'miniorange-otp-verification' ),
					esc_html__( 'Next', 'miniorange-otp-verification' ),
					'account.svg',
					2
				),
			);
		}
	}
}
