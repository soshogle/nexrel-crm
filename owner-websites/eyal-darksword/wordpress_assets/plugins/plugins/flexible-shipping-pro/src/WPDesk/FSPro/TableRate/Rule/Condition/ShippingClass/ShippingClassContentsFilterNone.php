<?php
/**
 * Class ShippingClassContentsFilterNone
 *
 * @package WPDesk\FSPro\TableRate\Rule
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass;

/**
 * Can filter shipping contents against shipping classes.
 */
class ShippingClassContentsFilterNone extends AbstractShippingClassContentsFilter {

	/**
	 * Returns filtered contents.
	 *
	 * @param array $contents .
	 *
	 * @return array
	 */
	public function get_filtered_contents( array $contents ) {
		foreach ( $contents as $item ) {
			if ( ! $this->should_be_item_removed( $this->get_product_from_item( $item ) ) ) {
				return array();
			}
		}

		return $contents;
	}

}
