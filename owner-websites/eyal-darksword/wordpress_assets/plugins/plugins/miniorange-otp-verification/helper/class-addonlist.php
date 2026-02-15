<?php
/**
 * Load administrator changes for AddonList
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Objects\BaseAddOnHandler;
use OTP\Traits\Instance;

/**
 * This class lists down all the AddOns supported by the plugin
 */
if ( ! class_exists( 'AddOnList' ) ) {
	/**
	 * AddOnList class
	 */
	final class AddOnList {

		use Instance;

		/**
		 * Key value pair associative array. This holds all the
		 * form Object which is initialized.
		 *
		 * @var array
		 */
		private $add_ons;

		/**
		 * Constructor
		 */
		private function __construct() {
			$this->add_ons = array();
		}

		/**
		 * Add AddOn to the AddOn List
		 *
		 * @param string           $key    the form key.
		 * @param BaseAddOnHandler $form   the BaseAddOnHandler object of the AddOn.
		 */
		public function add( $key, $form ) {
			$this->add_ons[ $key ] = $form;
		}

		/**
		 * Return the AddonList
		 *
		 * @return array
		 */
		public function get_list() {
			return $this->add_ons;
		}
	}
}
