<?php
/**Load Interface IMoSessions
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

interface IMoSessions {

	/**
	 * Sets session values.
	 *
	 * @param string $key key value.
	 * @param mixed  $val value of key pair.
	 * @return void
	 */
	public static function add_session_var( $key, $val );

	/**
	 * Return the value stored in session.
	 *
	 * @param string $key - key against the value is stored.
	 * @return mixed
	 */
	public static function get_session_var( $key );

	/**
	 * Unsets the session values as per the type set for.
	 *
	 * @param string $key - key to unset.
	 * @return void
	 */
	public static function unset_session( $key );

	/**
	 * Checks if session started or not. Initiates session of not already initialized.
	 *
	 * @return void
	 */
	public static function check_session();
}
