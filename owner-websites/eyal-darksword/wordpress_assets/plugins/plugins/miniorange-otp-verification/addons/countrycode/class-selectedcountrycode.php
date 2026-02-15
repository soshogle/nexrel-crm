<?php
/**
 * Initializer functions for addon files.
 *
 * @package miniorange-otp-verification/addons/countrycode
 */

namespace OTP\Addons\CountryCode;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\AddOnList;
use OTP\Objects\AddOnInterface;
use OTP\Objects\BaseAddOn;
use OTP\Traits\Instance;
use OTP\Addons\CountryCode\Handler\SelectedCountry;
use OTP\Helper\MoUtility;

$autoload_file = plugin_dir_path( __FILE__ ) . 'autoload.php';
if ( ! MoUtility::mo_require_file( $autoload_file, __DIR__ ) ) {
	return;
}
require_once $autoload_file;

/**
 * This class is used to initialize all the Handlers, Helpers, Controllers,
 * Styles and Scripts of the addon.
 */
if ( ! class_exists( 'SelectedCountryCode' ) ) {
	/**
	 * SelectedCountryCode class
	 */
	final class SelectedCountryCode extends BaseAddOn implements AddOnInterface {

		use Instance;

		/** Declare Default variables */
		public function __construct() {
			add_action( 'mo_otp_verification_delete_addon_options', array( $this, 'mo_sc_delete_addon' ), 1 );

			parent::__construct();
		}
		/**
		 * Initialize all handlers associated with the addon
		 */
		public function initialize_handlers() {
			/** Initialize instance for addon list handler
				 *
				 *  @var AddOnList $list
				 */
			$list    = AddOnList::instance();
			$handler = SelectedCountry::instance();
			$list->add( $handler->getAddOnKey(), $handler );
		}

		/**
		 * Initialize all helper associated with the addon
		 */
		public function initialize_helpers() {
			SelectedCountry::instance();
		}

		/**
		 * This function hooks into the mo_otp_verification_add_on_controller
		 */
		public function show_addon_settings_page() {
			$controller_path = plugin_dir_path( __FILE__ ) . 'controllers/main-controller.php';
			if ( file_exists( $controller_path ) ) {
				require_once $controller_path;
			}
		}
		/**
		 * Function is called during deletion of the plugin to delete any options
		 * related to the add-on. This function hooks into the 'mo_otp_verification_delete_addon_options'
		 * hook of the OTP verification plugin.
		 */
		public function mo_sc_delete_addon() {
			delete_site_option( 'mo_sc_code_countrycode_enable' );
			delete_site_option( 'mo_sc_code_selected_country_list' );
		}
	}
}
