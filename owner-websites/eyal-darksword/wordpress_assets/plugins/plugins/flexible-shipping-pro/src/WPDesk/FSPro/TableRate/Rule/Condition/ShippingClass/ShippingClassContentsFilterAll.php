<?php
/**
 * Class ShippingClassContentsFilterAll
 *
 * @package WPDesk\FSPro\TableRate\Rule
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass;

/**
 * Can filter shipping contents against shipping classes.
 */
class ShippingClassContentsFilterAll extends AbstractShippingClassContentsFilter {

	/**
	 * Returns filtered contents.
	 *
	 * @param array $contents .
	 *
	 * @return array
	 */
	public function get_filtered_contents( array $contents ) {
		foreach ( $contents as $key => $item ) {
			if ( $this->should_be_item_removed( $this->get_product_from_item( $item ) ) ) {
				unset( $contents[ $key ] );
			}
		}
		foreach ( $this->shipping_classes as $shipping_class ) {
			if ( ! isset( $this->present_shipping_classes[ (string) $shipping_class ] ) ) {
				$contents = array();
			}
		}

		return $contents;
	}

}
