<?php
/**
 * Constants for the Easyship plugin.
 * These are defined in a class, instead of in the global context, to try and avoid global scope pollution.
 *
 * @package Easyship\Config
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * This class provides a set of constants for the Easyship plugin.
 */
final class Easyship_Constants {
	/**
	 * The plugin slug.
	 * This is the canonical plugin slug that should be running right now.
	 * It is up to the plugin to determine if the currently-running instance is the canonical one and, if not, display a warning to the backend user, alerting that it is recommended they instead start using the plugin with this canonical slug.
	 */
	public const PLUGIN_SLUG = 'easyship-woocommerce-shipping-rates';

	/**
	 * This plugin's version.
	 */
	public const PLUGIN_VERSION = '0.9.12';

	/**
	 * The Easyship API base URL.
	 */
	public const EASYSHIP_API_BASE_URL = 'https://api.easyship.com/';

	/**
	 * The Easyship Auth base URL.
	 */
	public const EASYSHIP_AUTH_BASE_URL = 'https://auth.easyship.com/';
}
