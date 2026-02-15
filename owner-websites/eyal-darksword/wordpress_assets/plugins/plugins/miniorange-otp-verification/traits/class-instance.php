<?php
/**
 * To use global instance varible for all classes.
 *
 * @package miniorange-otp-verification/traits
 */

namespace OTP\Traits;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
trait Instance {
	/** Global object declaration
	 *
	 * @var instance to use global instance varible for all classes.
	 **/
	private static $instance = null;
	/** Function to delcare defination of instance as triats
	 */
	public static function instance() {
		if ( is_null( self::$instance ) ) {
			self::$instance = new self();
		}
		return self::$instance;
	}
}
