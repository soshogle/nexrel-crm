<?php
/**Load Interface BaseAddOn
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * This abstract class is used to define the base class of the add-ons
 * created for the miniorange-otp-verification plugin. Defines the
 * hooks they will need to hook into and the functions that they
 * need to implement.
 */
if ( ! class_exists( 'BaseAddOn' ) ) {
	/**
	 * BaseAddOn class
	 */
	abstract class BaseAddOn implements AddOnInterface {

		/**
		 * Constructor
		 */
		public function __construct() {
			$this->initialize_helpers();
			$this->initialize_handlers();
			add_action( 'mo_otp_verification_add_on_controller', array( $this, 'show_addon_settings_page' ), 1, 1 );
		}
	}
}
