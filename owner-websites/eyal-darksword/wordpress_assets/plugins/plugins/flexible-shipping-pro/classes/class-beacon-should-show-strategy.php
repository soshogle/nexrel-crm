<?php
/**
 * Beacon display strategy.
 *
 * @package Flexible Shipping Pro
 */

use FSProVendor\WPDesk\Beacon\BeaconGetShouldShowStrategy;

/**
 * When and if show Beacon.
 */
class WPDesk_Flexible_Shipping_Pro_Plugin_Beacon_Should_Show_Strategy extends BeaconGetShouldShowStrategy {

	/**
	 * WPDesk_Flexible_Shipping_Pro_Plugin_Beacon_Should_Show_Stategy constructor.
	 */
	public function __construct() {
		$conditions = array(
			array(
				'page' => 'wc-settings',
				'tab'  => 'shipping',
			),
		);
		parent::__construct( $conditions );
	}

	/**
	 * Should Beacon be visible?
	 *
	 * @return bool
	 */
	public function shouldDisplay() {
		if ( parent::shouldDisplay() && isset( $_GET['instance_id'] ) ) { // phpcs:ignore
			$instance_id     = sanitize_text_field( $_GET['instance_id'] );  // phpcs:ignore
			try {
				$shipping_method = WC_Shipping_Zones::get_shipping_method( $instance_id );
				if ( $shipping_method
					&& ( ( $shipping_method instanceof WPDesk_Flexible_Shipping ) || ( class_exists( '\WPDesk\FS\TableRate\ShippingMethodSingle' ) && $shipping_method instanceof \WPDesk\FS\TableRate\ShippingMethodSingle ) ) ) {
					return true;
				}
			} catch ( Exception $e ) {
				return false;
			}
		}
		return false;
	}


}
