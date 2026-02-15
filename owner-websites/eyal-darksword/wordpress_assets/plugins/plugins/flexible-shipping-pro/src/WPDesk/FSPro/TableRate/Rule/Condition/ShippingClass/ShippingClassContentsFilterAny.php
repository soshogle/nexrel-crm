<?php
/**
 * Class ShippingClassContentsFilterAny
 *
 * @package WPDesk\FSPro\TableRate\Rule
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass;

/**
 * Can filter shipping contents against shipping classes.
 */
class ShippingClassContentsFilterAny extends AbstractShippingClassContentsFilter {

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

		return $contents;
	}

}
