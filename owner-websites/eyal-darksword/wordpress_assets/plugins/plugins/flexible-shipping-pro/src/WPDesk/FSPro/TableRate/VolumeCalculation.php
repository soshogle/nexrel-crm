<?php
/**
 * Trait VolumeCalculation
 *
 * @package WPDesk\FSPro\TableRate
 */

namespace WPDesk\FSPro\TableRate;

/**
 * Provides volume calculation methods.
 */
trait VolumeCalculation {

	/**
	 * @param ShippingContents $contents .
	 *
	 * @return float
	 */
	private function get_contents_volume( $contents ) {
		$volume = 0.0;

		foreach ( $contents->get_contents() as $item ) {
			$volume += $this->get_product_volume( $item ) * $item['quantity'];
		}

		return (float) $volume;
	}

	/**
	 * @param array $item .
	 *
	 * @return float
	 */
	private function get_product_volume( $item ) {
		/** @var WC_Product $product */
		$product = $item['data'];

		if ( $product->has_dimensions() ) {
			$dimensions = $product->get_dimensions( false );

			return (float) ( $dimensions['width'] * $dimensions['height'] * $dimensions['length'] );
		}

		return 0.0;
	}

}
