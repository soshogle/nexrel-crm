<?php
/**Load Interface AddOnInterface
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * AddOnInterface interface
 *
 * Interface for defining add-on functionality.
 * This interface defines the contract that all add-on
 * classes must implement, including methods for initializing
 * handlers, helpers, and displaying settings pages.
 */
interface AddOnInterface {

	/**
	 * Function to be defined by the form class extending this class
	 * to initialize handlers for the add-on.
	 *
	 * @return void
	 */
	public function initialize_handlers();

	/**
	 * Function to be defined by the form class extending this class
	 * to initialize helpers for the add-on.
	 *
	 * @return void
	 */
	public function initialize_helpers();

	/**
	 * Function to be defined by the form class extending this class
	 * to show the add-on settings page.
	 *
	 * @return void
	 */
	public function show_addon_settings_page();
}
