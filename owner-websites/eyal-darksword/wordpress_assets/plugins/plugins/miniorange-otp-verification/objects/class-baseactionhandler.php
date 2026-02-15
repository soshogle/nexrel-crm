<?php
/**Load Interface BaseActionHandler
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;
use OTP\Objects\BaseMessages;

if ( ! class_exists( 'BaseActionHandler' ) ) {
	/**
	 * This is the Base class
	 */
	class BaseActionHandler {

		/**Variable declaration
		 *
		 * @var string $nonce nonce value to check if a valid submission has been made */
		protected $nonce;

		/**
		 * Nonce Key Variable declaration
		 *
		 * @var string nonce-key value to check if a valid submission has been made
		 */
		protected $nonce_key;

		/**Constructor
		 **/
		protected function __construct() {}

		/** Getter for nonce value  */
		public function get_nonce_value() {
			return $this->nonce;
		}
	}
}
