<?php
/**
 * Order Statuses for Woocommerce Notifications
 *
 * @package miniorange-otp-verification/Notifications/wcsmsnotification/helper
 */

namespace OTP\Notifications\WcSMSNotification\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoMessages;
use ReflectionClass;

/**
 * Class declares all woocommerce order related status
 * which is being used plugin wide.
 */
if ( ! class_exists( 'WcOrderStatus' ) ) {
	/**
	 * WcOrderStatus class
	 */
	final class WcOrderStatus {

		const PROCESSING   = 'processing';
		const ON_HOLD      = 'on-hold';
		const CANCELLED    = 'cancelled';
		const PENDING      = 'pending';
		const FAILED       = 'failed';
		const COMPLETED    = 'completed';
		const REFUNDED     = 'refunded';
		const OUT_OF_STOCK = 'out-of-stock';
		const LOW_STOCK    = 'low-stock';

		/**
		 * Return list of all status as an array
		 *
		 * @return array List of all order status constants
		 */
		public static function mo_get_all_status() {
			try {
				// Validate class exists before reflection.
				if ( ! class_exists( self::class ) ) {
					return array();
				}

				$refl = new ReflectionClass( self::class );

				// Validate reflection object.
				if ( ! $refl instanceof ReflectionClass ) {
					return array();
				}

				$constants = $refl->getConstants();

				// Validate constants is an array.
				if ( ! is_array( $constants ) ) {
					return array();
				}

				// Sanitize constant values.
				$sanitized_constants = array();
				foreach ( $constants as $constant_value ) {
					if ( is_string( $constant_value ) ) {
						$sanitized_constants[] = sanitize_text_field( wp_unslash( $constant_value ) );
					}
				}

				return $sanitized_constants;

			} catch ( \ReflectionException $e ) {
				// Log error and return empty array for security.
				return array();
			} catch ( \Exception $e ) {
				// Catch any other exceptions.
				return array();
			}
		}
	}
}
