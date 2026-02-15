<?php
/**Load Interface BaseAddOnHandler
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoUtility;
use OTP\Objects\AddOnHandlerInterface;

/**
 * This abstract class is used to define the base handler class of the add-ons
 * created for the miniorange-otp-verification plugin. Defines the
 * functions that they need to implement.
 */
if ( ! class_exists( 'BaseAddOnHandler' ) ) {
	/**
	 * BaseAddOnHandler class
	 */
	abstract class BaseAddOnHandler extends BaseActionHandler implements AddOnHandlerInterface {

		/**
		 * Variable declaration
		 *
		 * @var string $add_on_key unique key for the addon
		 */
		protected $add_on_key;

		/**
		 * Variable declaration
		 *
		 * @var string $add_on_desc add-on description
		 */
		protected $add_on_desc;

		/**
		 * Variable declaration
		 *
		 * @var string $addon_name add-on name
		 */
		protected $addon_name;

		/**
		 * Variable declaration
		 *
		 * @var string $settings_url add-on settings URL
		 */
		protected $settings_url;

		/**
		 * Variable declaration
		 *
		 * @var string $add_on_docs add-on documentation
		 */
		protected $add_on_docs;

		/**
		 * Variable declaration
		 *
		 * @var string $add_on_video add-on video
		 */
		protected $add_on_video;

		/**
		 * Constructor
		 */
		public function __construct() {
			parent::__construct();
			$this->initialize_addon_properties();
		}

		/**
		 * This function is used to initialize the addon properties.
		 */
		public function initialize_addon_properties() {
			$this->set_addon_key();
			$this->set_add_on_desc();
			$this->set_add_on_name();
			$this->set_settings_url();
			$this->set_add_on_docs();
			$this->set_add_on_video();
		}

		/**
		 * Return the Addon Key
		 *
		 * @return string
		 */
		public function getAddOnKey() {
			return $this->add_on_key;
		}

		/**
		 * Return the Addon Description
		 *
		 * @return string
		 */
		public function getAddOnDesc() {
			return $this->add_on_desc;
		}

		/**
		 * Return AddOn Name
		 *
		 * @return string
		 */
		public function get_add_on_name() {
			// custom_comment To load addon tab.
			return $this->addon_name;
		}

		/**
		 * Return Addon Docs link
		 *
		 * @return string
		 */
		public function getAddOnDocs() {
			return $this->add_on_docs;
		}

		/**
		 * Return Addon Video link
		 *
		 * @return string
		 */
		public function getAddOnVideo() {
			return $this->add_on_video;
		}

		/**
		 * Return Settings URL
		 *
		 * @return string
		 */
		public function getSettingsUrl() {
			return $this->settings_url;
		}

		/**
		 * Checks if the customer has finished their account setup
		 *
		 * @return bool
		 */
		public function moAddOnV() {
			return MoUtility::micr() && MoUtility::mclv();
		}
	}
}
