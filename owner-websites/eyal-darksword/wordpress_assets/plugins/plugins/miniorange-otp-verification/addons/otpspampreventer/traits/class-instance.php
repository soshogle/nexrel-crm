<?php
/**
 * Instance trait for OTP Spam Preventer addon
 *
 * @package otpspampreventer/traits
 */

namespace OSP\Traits;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Singleton pattern trait
 */
trait Instance {

	/**
	 * Instance variable
	 *
	 * @var self
	 */
	private static $instance;

	/**
	 * Get instance of the class
	 *
	 * @return self
	 */
	public static function instance() {
		if ( ! isset( self::$instance ) ) {
			self::$instance = new self();
		}
		return self::$instance;
	}
}
