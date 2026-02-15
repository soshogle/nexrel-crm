<?php
/**Load Class WooCommerce Premium Tags
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'WcPremiumTags' ) ) {
	/**
	 * WcPremiumTags class
	 *
	 * Class for defining WooCommerce premium tags used in the plugin.
	 * This class contains constants that represent various WooCommerce
	 * billing and shipping field identifiers for OTP verification
	 * and SMS notification purposes.
	 */
	class WcPremiumTags {

		/**
		 * Billing first name field identifier
		 *
		 * @var string
		 */
		const BILLING_FIRST_NAME = 'billing-firstName';

		/**
		 * Billing phone field identifier
		 *
		 * @var string
		 */
		const BILLING_PHONE = 'billing-phone';

		/**
		 * Billing email field identifier
		 *
		 * @var string
		 */
		const BILLING_EMAIL = 'billing-email';

		/**
		 * Billing address field identifier
		 *
		 * @var string
		 */
		const BILLING_ADDRESS = 'billing-address';

		/**
		 * Billing city field identifier
		 *
		 * @var string
		 */
		const BILLING_CITY = 'billing-city';

		/**
		 * Billing state field identifier
		 *
		 * @var string
		 */
		const BILLING_STATE = 'billing-state';

		/**
		 * Billing postcode field identifier
		 *
		 * @var string
		 */
		const BILLING_POSTCODE = 'billing-postcode';

		/**
		 * Billing country field identifier
		 *
		 * @var string
		 */
		const BILLING_COUNTRY = 'billing-country';

		/**
		 * Shipping first name field identifier
		 *
		 * @var string
		 */
		const SHIPPING_FIRST_NAME = 'shipping-firstName';

		/**
		 * Shipping phone field identifier
		 *
		 * @var string
		 */
		const SHIPPING_PHONE = 'shipping-phone';

		/**
		 * Shipping address field identifier
		 *
		 * @var string
		 */
		const SHIPPING_ADDRESS = 'shipping-address';

		/**
		 * Shipping city field identifier
		 *
		 * @var string
		 */
		const SHIPPING_CITY = 'shipping-city';

		/**
		 * Shipping state field identifier
		 *
		 * @var string
		 */
		const SHIPPING_STATE = 'shipping-state';

		/**
		 * Shipping postcode field identifier
		 *
		 * @var string
		 */
		const SHIPPING_POSTCODE = 'shipping-postcode';

		/**
		 * Shipping country field identifier
		 *
		 * @var string
		 */
		const SHIPPING_COUNTRY = 'shipping-country';
	}
}
