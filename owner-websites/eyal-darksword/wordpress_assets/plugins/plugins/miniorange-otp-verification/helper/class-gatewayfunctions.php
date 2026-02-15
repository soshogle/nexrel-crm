<?php
/**
 * Load administrator changes for GatewayFunctions
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Objects\IGatewayFunctions;
use OTP\Objects\NotificationSettings;
use OTP\Traits\Instance;

/**
 * This is the GatewayFunctions class. This class handles all the
 * functionality related to Gateway functionality of the plugin. It
 * implements the IGatewayFunctions class to implement some much needed functions.
 */
if ( ! class_exists( 'GatewayFunctions' ) ) {
	/**
	 * GatewayFunctions class
	 */
	class GatewayFunctions implements IGatewayFunctions {

		use Instance;

		/** Global Variable
		 *
		 * @var IGatewayFunctions
		 * This will be the object of the plugin specific functions
		 * from where plugin specific functions can be called out.
		 */
		private $gateway;

		/**Global Variable
		 *
		 * @var array
		 * Plugin Type to Class Map
		 */
		private $plugin_type_to_class = array(
			'MiniOrangeGateway'           => 'OTP\Helper\MiniOrangeGateway',
			'CustomGatewayWithAddons'     => 'OTP\Helper\CustomGatewayWithAddons',
			'CustomGatewayWithoutAddons'  => 'OTP\Helper\CustomGatewayWithoutAddons',
			'TwilioGatewayWithAddons'     => 'OTP\Helper\TwilioGatewayWithAddons',
			'EnterpriseGatewayWithAddons' => 'OTP\Helper\EnterpriseGatewayWithAddons',
			'WooCommerceWithAddons'       => 'OTP\Helper\WooCommerceWithAddons',
		);

		/**
		 * Constructor to declare variables of the class on initialization
		 **/
		public function __construct() {
			$plugin_type = $this->plugin_type_to_class[ MOV_TYPE ];
			if ( class_exists( $plugin_type ) ) {
				$this->gateway = $plugin_type::instance();
			} else {
				wp_die( esc_attr( MoMessages::showMessage( MoMessages::INVALID_OP ) ) );
			}
		}

		/**
		 * Checks if the current plugin is MiniOrangeGateway Plugin
		 *
		 * @return bool
		 */
		public function is_mg() {
			return $this->gateway->is_mg();
		}

		/**
		 * Calls the Gateway Specific LoaddAddOn function
		 *
		 * @param string $folder LoadAddOns Directory.
		 */
		public function loadAddons( $folder ) {
			$this->gateway->loadAddons( $folder );
		}

		/** Calls the Gateway specific register_addons function */
		public function register_addons() {
			$this->gateway->register_addons();
		}

		/** Calls the Gateway specific show_addon_list function */
		public function show_addon_list() {
			$this->gateway->show_addon_list();
		}

		/** Calls the Gateway specific hourly_sync function */
		public function hourly_sync() {
			$this->gateway->hourly_sync();
		}

		/**
		 * Calls the Gateway specific custom_wp_mail_from_name function
		 *
		 * @param string $original_email_from From Address in the email going out.
		 * @return String From Email Address in the email going out.
		 */
		public function custom_wp_mail_from_name( $original_email_from ) {
			return $this->gateway->custom_wp_mail_from_name( $original_email_from );
		}

		/** Calls the Gateway specific flush_cache function */
		public function flush_cache() {
			$this->gateway->flush_cache();
		}

		/**
		 * Calls the Gateway specific vlk function
		 *
		 * @param string $post simply $_POST array.
		 */
		public function vlk( $post ) {
			$this->gateway->vlk( $post );
		}

		/**
		 * Calls the Gateway specific mo_configure_sms_template function
		 *
		 * @param string $posted simply the $_POST array.
		 */
		public function mo_configure_sms_template( $posted ) {
			return $this->gateway->mo_configure_sms_template( $posted );
		}

		/**
		 * Calls the Gateway specific mo_configure_gateway function
		 *
		 * @param string $posted simply the $_POST array.
		 */
		public function mo_configure_gateway( $posted ) {
			$this->gateway->mo_configure_gateway( $posted );
		}

		/**
		 * Calls the Gateway specific mo_configure_email_template function
		 *
		 * @param string $posted simply the $_POST array.
		 */
		public function mo_configure_email_template( $posted ) {
			$this->gateway->mo_configure_email_template( $posted );
		}

		/**
		 * Calls the Gateway specific mo_send_otp_token function
		 *
		 * @param string $auth_type  OTP Type - EMAIL or SMS.
		 * @param string $email     Email Address of the user.
		 * @param string $phone     Phone Number of the user.
		 * @param array  $data      data submitted by the user.
		 * @return array
		 */
		public function mo_send_otp_token( $auth_type, $email, $phone, $data = array() ) {
			return $this->gateway->mo_send_otp_token( $auth_type, $email, $phone, $data );
		}

		/**
		 * Calls the Gateway specific mclv function
		 *
		 * @return bool
		 */
		public function mclv() {
			return $this->gateway->mclv();
		}


		/**
		 * Calls the Gateway specific is_gateway_config function
		 *
		 * @return bool
		 */
		public function is_gateway_config() {
			return $this->gateway->is_gateway_config();
		}


		/**
		 * Calls the Gateway specific show_configuration_page function
		 *
		 * @param string $disabled variable.
		 */
		public function show_configuration_page( $disabled ) {
			$this->gateway->show_configuration_page( $disabled );
		}

		/**
		 * Calls the Gateway specific show_configuration_page function
		 *
		 * @param string $disabled variable.
		 */
		public function template_configuration_page( $disabled ) {
			$this->gateway->template_configuration_page( $disabled );
		}

		/**
		 * Calls the Gateway specific mo_validate_otp_token
		 *
		 * @param string $tx_id Transaction ID from session.
		 * @param string $otp_token OTP Token to validate.
		 * @param string $otp_type Type of OTP Verification.
		 * @return array
		 */
		public function mo_validate_otp_token( $tx_id, $otp_token, $otp_type ) {
			return $this->gateway->mo_validate_otp_token( $tx_id, $otp_token, $otp_type );
		}

		/**
		 * Calls the Gateway specific mo_send_notif
		 *
		 * @param NotificationSettings $settings object.
		 * @return string
		 */
		public function mo_send_notif( NotificationSettings $settings ) {
			return $this->gateway->mo_send_notif( $settings );
		}

		/**Application name
		 *
		 * @return string
		 */
		public function get_application_name() {
			return $this->gateway->get_application_name();
		}

		/**Config Page
		 *
		 * @return mixed
		 */
		public function get_config_page_pointers() {
			return $this->gateway->get_config_page_pointers();
		}
	}
}
