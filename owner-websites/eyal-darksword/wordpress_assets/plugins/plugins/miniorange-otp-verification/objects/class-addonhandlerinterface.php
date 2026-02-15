<?php
/**Load Interface AddOnHandlerInterface
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * AddOnHandlerInterface interface
 *
 * Interface for defining add-on handler functionality.
 * This interface defines the contract that all add-on handler
 * classes must implement, including methods for setting add-on
 * properties like key, description, name, settings URL, docs link,
 * and video link.
 */
interface AddOnHandlerInterface {

	/**
	 * Function to be defined by the form class extending this class
	 * to force add-ons to set a form key.
	 *
	 * @return void
	 */
	public function set_addon_key();

	/**
	 * To force add-ons to set a add-on description.
	 *
	 * @return void
	 */
	public function set_add_on_desc();

	/**
	 * To force add-ons to set a name.
	 *
	 * @return void
	 */
	public function set_add_on_name();

	/**
	 * To force add-ons to set a settings page URL.
	 *
	 * @return void
	 */
	public function set_settings_url();

	/**
	 * To force add-ons to set a docs link.
	 *
	 * @return void
	 */
	public function set_add_on_docs();

	/**
	 * To force add-ons to set a video link.
	 *
	 * @return void
	 */
	public function set_add_on_video();
}
